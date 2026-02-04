import { useState, useCallback, useMemo } from 'react';
import { Plus, Minus, TrendingUp, CheckCircle, Target, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import FileUpload from '../common/FileUpload';
import type { TrackingType } from './TrackingTypeSelector';

interface Goal {
  id: number;
  goal_title: string;
  tracking_type: TrackingType;
  progress_percentage: number;
  target_value?: string | null;
  current_value?: string | null;
  unit_of_measure?: string | null;
  counter_current?: number | null;
  counter_target?: number | null;
  average_target?: number | null;
  average_values?: Array<{ value: number; date: string; notes?: string }> | null;
}

interface ProgressUpdateFormProps {
  goal: Goal;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export default function ProgressUpdateForm({
  goal,
  onSubmit,
  onCancel,
  saving,
}: ProgressUpdateFormProps) {
  const [progressValue, setProgressValue] = useState(goal.progress_percentage || 0);
  const [counterIncrement, setCounterIncrement] = useState(1);
  const [averageValue, setAverageValue] = useState<number | ''>('');
  const [currentValue, setCurrentValue] = useState(goal.current_value || '');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('notes', notes);

    switch (goal.tracking_type) {
      case 'percentage':
      case 'target_percentage':
        formData.append('progress_percentage', progressValue.toString());
        if (currentValue) {
          formData.append('current_value', currentValue);
        }
        break;
      case 'counter':
        formData.append('value', counterIncrement.toString());
        break;
      case 'average':
        if (averageValue !== '') {
          formData.append('value', averageValue.toString());
        }
        break;
    }

    // Add files
    files.forEach((file) => {
      formData.append('files', file);
    });

    await onSubmit(formData);
  }, [goal.tracking_type, progressValue, currentValue, counterIncrement, averageValue, notes, files, onSubmit]);

  const calculateAveragePreview = useCallback(() => {
    if (averageValue === '' || !goal.average_values) return null;
    const allValues = [...goal.average_values.map(v => v.value), Number(averageValue)];
    return (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2);
  }, [averageValue, goal.average_values]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Goal Info */}
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Goal</p>
        <p className="font-medium text-gray-900 dark:text-white">{goal.goal_title}</p>
      </div>

      {/* Basic Percentage Tracking */}
      {goal.tracking_type === 'percentage' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Progress: {progressValue}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progressValue}
              onChange={(e) => setProgressValue(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Target Percentage Tracking */}
      {goal.tracking_type === 'target_percentage' && (
        <div className="space-y-4">
          {/* Current vs Target Display */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Progress to Target</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {currentValue || goal.current_value || '0'}
                  </span>
                  <span className="text-lg text-gray-500">
                    / {goal.target_value} {goal.unit_of_measure}
                  </span>
                </div>
              </div>
              {/* Status Indicator */}
              {(() => {
                const current = parseFloat(currentValue || goal.current_value || '0') || 0;
                const target = parseFloat(goal.target_value || '0') || 0;
                const percentage = target > 0 ? (current / target) * 100 : 0;
                const isMet = current >= target;
                const isClose = percentage >= 90 && !isMet;

                if (isMet) {
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                        {current > target ? 'Exceeded!' : 'Target Met!'}
                      </span>
                    </div>
                  );
                } else if (isClose) {
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Target className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mt-1">
                        Almost there!
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 relative">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-gray-200 dark:text-gray-600"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${Math.min(100, percentage) * 1.51} 151`}
                            className="text-blue-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">of target</span>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Progress Bar */}
            {(() => {
              const current = parseFloat(currentValue || goal.current_value || '0') || 0;
              const target = parseFloat(goal.target_value || '0') || 0;
              const percentage = target > 0 ? Math.min(120, (current / target) * 100) : 0;
              const isMet = current >= target;

              return (
                <div className="relative">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isMet ? 'bg-green-500' : percentage >= 90 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  {/* Target Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-white"
                    style={{ left: '100%', transform: 'translateX(-1px)' }}
                  />
                </div>
              );
            })()}
          </div>

          {/* Update Current Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Update Current Value
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={currentValue}
                onChange={(e) => {
                  setCurrentValue(e.target.value);
                  // Auto-calculate progress percentage
                  const newValue = parseFloat(e.target.value) || 0;
                  const target = parseFloat(goal.target_value || '0') || 0;
                  if (target > 0) {
                    setProgressValue(Math.min(100, Math.round((newValue / target) * 100)));
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current value"
              />
              <span className="text-gray-500 dark:text-gray-400">{goal.unit_of_measure}</span>
            </div>
          </div>
        </div>
      )}

      {/* Counter Tracking */}
      {goal.tracking_type === 'counter' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Count</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {goal.counter_current || 0}
                  {goal.counter_target && (
                    <span className="text-lg font-normal text-gray-500">
                      {' '}/ {goal.counter_target}
                    </span>
                  )}
                </p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-600"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(goal.progress_percentage || 0) * 1.76} 176`}
                    className="text-blue-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {Math.round(goal.progress_percentage || 0)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add to count
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCounterIncrement(1)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                    ${counterIncrement === 1
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }
                  `}
                >
                  <Plus size={16} />
                  +1
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCounterIncrement(Math.max(1, counterIncrement - 1))}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={counterIncrement}
                    onChange={(e) => setCounterIncrement(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setCounterIncrement(counterIncrement + 1)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
          >
            <TrendingUp size={16} />
            New count will be: {(goal.counter_current || 0) + counterIncrement}
          </motion.div>
        </div>
      )}

      {/* Average Tracking */}
      {goal.tracking_type === 'average' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Average</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {goal.current_value || '0'}
                  {goal.average_target && (
                    <span className="text-lg font-normal text-gray-500">
                      {' '}/ {goal.average_target} target
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Based on {goal.average_values?.length || 0} entries
                </p>
              </div>
              {/* Status Indicator */}
              {goal.average_target && (() => {
                // Use progress_percentage for consistency (avoids rounding issues)
                const progress = goal.progress_percentage || 0;
                const isMet = progress >= 100;
                const isClose = progress >= 90 && !isMet;

                if (isMet) {
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                        {progress > 100 ? 'Exceeded!' : 'Target Met!'}
                      </span>
                    </div>
                  );
                } else if (isClose) {
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Target className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mt-1">
                        Almost there!
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 relative">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-600" />
                          <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray={`${Math.min(100, progress) * 1.51} 151`} className="text-yellow-500" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{Math.round(progress)}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">of target</span>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Progress Bar */}
            {goal.average_target && (() => {
              // Use progress_percentage for consistency
              const progress = goal.progress_percentage || 0;
              const isMet = progress >= 100;

              return (
                <div className="relative mb-4">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isMet ? 'bg-green-500' : progress >= 90 ? 'bg-yellow-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-white" style={{ left: '100%', transform: 'translateX(-1px)' }} />
                </div>
              );
            })()}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Add new value
              </label>
              <input
                type="number"
                step="0.01"
                value={averageValue}
                onChange={(e) => setAverageValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter value to add to average"
              />
            </div>
          </div>

          {averageValue !== '' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
            >
              <TrendingUp size={16} />
              New average will be: {calculateAveragePreview()}
            </motion.div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Add notes about this progress update..."
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Attachments (Optional)
        </label>
        <FileUpload
          files={files}
          onFilesChange={setFiles}
          maxFiles={5}
          maxSizeMB={10}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Updating...' : 'Update Progress'}
        </button>
      </div>
    </form>
  );
}
