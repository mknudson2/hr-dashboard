import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Calendar, Clock, User, FileText, Package, DollarSign,
  CheckSquare, AlertCircle
} from 'lucide-react';

const BASE_URL = '';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  taskType: 'onboarding' | 'offboarding';
  onUpdate: () => void;
}

export function TaskDetailDrawer({ isOpen, onClose, task, taskType, onUpdate }: TaskDetailDrawerProps) {
  const [notes, setNotes] = useState('');
  const [taskDetails, setTaskDetails] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setTaskDetails(task.task_details || {});
    }
  }, [task]);

  // ESC key support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!task) return null;

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = taskType === 'onboarding'
        ? `${BASE_URL}/onboarding/tasks/${task.id}`
        : `${BASE_URL}/offboarding/tasks/${task.id}`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          task_details: taskDetails
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Interview-specific fields
  const renderInterviewFields = () => {
    if (!task.task_name.toLowerCase().includes('interview')) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Interview Details</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scheduled Date & Time
          </label>
          <input
            type="datetime-local"
            value={taskDetails.scheduled_datetime || ''}
            onChange={(e) => setTaskDetails({...taskDetails, scheduled_datetime: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Actual Date & Time
          </label>
          <input
            type="datetime-local"
            value={taskDetails.actual_datetime || ''}
            onChange={(e) => setTaskDetails({...taskDetails, actual_datetime: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Interviewer
          </label>
          <input
            type="text"
            value={taskDetails.interviewer || ''}
            onChange={(e) => setTaskDetails({...taskDetails, interviewer: e.target.value})}
            placeholder="Interviewer name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    );
  };

  // Equipment-specific fields
  const renderEquipmentFields = () => {
    if (!task.task_name.toLowerCase().includes('equipment')) return null;

    const equipmentList = taskDetails.equipment_list || [];

    const addEquipment = () => {
      setTaskDetails({
        ...taskDetails,
        equipment_list: [...equipmentList, { item: '', returned: false }]
      });
    };

    const updateEquipment = (index: number, field: string, value: any) => {
      const newList = [...equipmentList];
      newList[index][field] = value;
      setTaskDetails({...taskDetails, equipment_list: newList});
    };

    const removeEquipment = (index: number) => {
      const newList = equipmentList.filter((_: any, i: number) => i !== index);
      setTaskDetails({...taskDetails, equipment_list: newList});
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Equipment</h3>
          <button
            onClick={addEquipment}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add Item
          </button>
        </div>

        {equipmentList.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <input
              type="text"
              value={item.item || ''}
              onChange={(e) => updateEquipment(index, 'item', e.target.value)}
              placeholder="Equipment name"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={item.returned || false}
                onChange={(e) => updateEquipment(index, 'returned', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Returned
            </label>
            <button
              onClick={() => removeEquipment(index)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={taskDetails.shipping_label_sent || false}
            onChange={(e) => setTaskDetails({...taskDetails, shipping_label_sent: e.target.checked})}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Shipping label sent
          </label>
        </div>
      </div>
    );
  };

  // Paycheck/Finance-specific fields
  const renderPaycheckFields = () => {
    if (!task.task_name.toLowerCase().includes('paycheck') && !task.task_name.toLowerCase().includes('payment')) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Final Payment Details</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Final Hours to Pay Out
          </label>
          <input
            type="number"
            step="0.01"
            value={taskDetails.final_hours || ''}
            onChange={(e) => setTaskDetails({...taskDetails, final_hours: e.target.value})}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            PTO Payout (hours)
          </label>
          <input
            type="number"
            step="0.01"
            value={taskDetails.pto_payout_hours || ''}
            onChange={(e) => setTaskDetails({...taskDetails, pto_payout_hours: e.target.value})}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            PTO Payout Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={taskDetails.pto_payout_amount || ''}
            onChange={(e) => setTaskDetails({...taskDetails, pto_payout_amount: e.target.value})}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Total Final Payment
          </label>
          <input
            type="number"
            step="0.01"
            value={taskDetails.total_final_payment || ''}
            onChange={(e) => setTaskDetails({...taskDetails, total_final_payment: e.target.value})}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Bifröst shimmer edge */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bifrost-shimmer-v z-20" />
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {task.task_name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {task.category} • {task.assigned_to_role}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Task Info */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Priority</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.priority}</p>
                  </div>
                  {task.due_date && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Task-specific fields */}
                {renderInterviewFields()}
                {renderEquipmentFields()}
                {renderPaycheckFields()}

                {/* General Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Add any additional notes..."
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
