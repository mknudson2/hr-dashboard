import { useState } from 'react';
import { CheckCircle, Circle, SkipForward, AlertCircle, Clock, ChevronRight, Play, Ban } from 'lucide-react';

export interface LifecycleStage {
  id: number;
  requisition_id: number;
  stage_key: string;
  stage_label: string;
  order_index: number;
  status: string;
  entered_at: string | null;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
  approval_status: string | null;
  approval_notes: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  hr_representative_present: boolean | null;
  hr_representative_id: number | null;
  notes_count: number;
  documents_count: number;
  unread_count: number;
  created_at: string | null;
}

interface LifecycleTrackerProps {
  stages: LifecycleStage[];
  activeStageId?: number;
  onStageClick?: (stage: LifecycleStage) => void;
  readOnly?: boolean;
  onAdvance?: (stageId: number) => void;
  onSkip?: (stageId: number) => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-600',
  },
  active: {
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-600',
  },
  pending: {
    icon: Circle,
    color: 'text-gray-400 dark:text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-gray-400 dark:text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  },
  blocked: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600',
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LifecycleTracker({
  stages,
  activeStageId,
  onStageClick,
  readOnly = false,
  onAdvance,
  onSkip,
}: LifecycleTrackerProps) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="w-full">
      {/* Horizontal tracker */}
      <div className="hidden lg:flex items-start justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700 z-0" />
        {/* Progress line */}
        <div
          className="absolute top-5 left-5 h-0.5 bg-green-400 z-0 transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, ((stages.filter(s => s.status === 'completed').length - 0.5) / (stages.length - 1)) * 100))}%`,
            maxWidth: 'calc(100% - 2.5rem)',
          }}
        />

        {stages.map((stage) => {
          const config = statusConfig[stage.status] || statusConfig.pending;
          const Icon = config.icon;
          const isSelected = activeStageId === stage.id;
          const itemCount = stage.unread_count || 0;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center flex-1">
              <button
                onClick={() => onStageClick?.(stage)}
                className={`group flex flex-col items-center ${onStageClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${config.bgColor} ${
                      isSelected ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none shadow-sm">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </div>
                <span className={`mt-2 text-xs text-center max-w-[100px] leading-tight ${
                  stage.status === 'active' ? 'font-semibold text-blue-600 dark:text-blue-400' :
                  stage.status === 'completed' ? 'font-medium text-gray-700 dark:text-gray-300' :
                  stage.status === 'skipped' ? 'text-gray-400 line-through' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {stage.stage_label}
                </span>
                {stage.completed_at && (
                  <span className="text-[10px] text-gray-400 mt-0.5">{formatDate(stage.completed_at)}</span>
                )}
                {stage.outcome && (
                  <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    stage.outcome === 'passed' || stage.outcome === 'accepted'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : stage.outcome === 'failed' || stage.outcome === 'rejected'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                  }`}>
                    {stage.outcome}
                  </span>
                )}
              </button>

              {/* Action buttons for non-readOnly */}
              {!readOnly && stage.status === 'active' && (
                <div className="flex gap-1 mt-2">
                  {onAdvance && (
                    <button
                      onClick={() => onAdvance(stage.id)}
                      className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                      title="Complete Stage"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  {onSkip && (
                    <button
                      onClick={() => onSkip(stage.id)}
                      className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                      title="Skip Stage"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vertical tracker for tablet/mobile */}
      <div className="lg:hidden space-y-1">
        {stages.map((stage, idx) => {
          const config = statusConfig[stage.status] || statusConfig.pending;
          const Icon = config.icon;
          const isLast = idx === stages.length - 1;
          const isSelected = activeStageId === stage.id;
          const itemCount = stage.unread_count || 0;

          return (
            <div key={stage.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <button
                    onClick={() => onStageClick?.(stage)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${config.bgColor} ${
                      isSelected ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </button>
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold leading-none shadow-sm">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-8 mt-1 ${stage.status === 'completed' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
              <div className="pt-1 flex-1 min-w-0 flex items-center justify-between">
                <div>
                  <button
                    onClick={() => onStageClick?.(stage)}
                    className={`text-sm ${
                      stage.status === 'active' ? 'font-semibold text-blue-600 dark:text-blue-400' :
                      stage.status === 'completed' ? 'font-medium text-gray-700 dark:text-gray-300' :
                      stage.status === 'skipped' ? 'text-gray-400 line-through' :
                      'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {stage.stage_label}
                  </button>
                  {stage.completed_at && (
                    <span className="text-xs text-gray-400 ml-2">{formatDate(stage.completed_at)}</span>
                  )}
                </div>
                {!readOnly && stage.status === 'active' && (
                  <div className="flex gap-1">
                    {onAdvance && (
                      <button
                        onClick={() => onAdvance(stage.id)}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Complete
                      </button>
                    )}
                    {onSkip && (
                      <button
                        onClick={() => onSkip(stage.id)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
