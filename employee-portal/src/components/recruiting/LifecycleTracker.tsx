import { CheckCircle, Circle, SkipForward, AlertCircle, Clock } from 'lucide-react';

export interface LifecycleStage {
  id: number;
  requisition_id: number;
  stage_key: string;
  stage_label: string;
  order_index: number;
  status: string; // "pending" | "active" | "completed" | "skipped" | "blocked"
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
  created_at: string | null;
}

interface LifecycleTrackerProps {
  stages: LifecycleStage[];
  activeStageId?: number;
  onStageClick?: (stage: LifecycleStage) => void;
  readOnly?: boolean;
  compact?: boolean;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string; lineColor: string }> = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600',
    lineColor: 'bg-green-400',
  },
  active: {
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 ring-2 ring-blue-400/50',
    lineColor: 'bg-blue-400',
  },
  pending: {
    icon: Circle,
    color: 'text-gray-400 dark:text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
    lineColor: 'bg-gray-300 dark:bg-gray-600',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-gray-400 dark:text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    lineColor: 'bg-gray-300 dark:bg-gray-600',
  },
  blocked: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600',
    lineColor: 'bg-red-400',
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
  readOnly = true,
  compact = false,
}: LifecycleTrackerProps) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="w-full">
      {/* Horizontal tracker for larger screens */}
      <div className="hidden md:flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700 z-0" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-green-400 z-0 transition-all duration-500"
          style={{
            width: `${Math.max(0, ((stages.filter(s => s.status === 'completed').length - 0.5) / (stages.length - 1)) * 100)}%`,
          }}
        />

        {stages.map((stage) => {
          const config = statusConfig[stage.status] || statusConfig.pending;
          const Icon = config.icon;
          const isSelected = activeStageId === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => onStageClick?.(stage)}
              disabled={!onStageClick}
              className={`relative z-10 flex flex-col items-center flex-1 group ${
                onStageClick ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${config.bgColor} ${
                  isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                } ${stage.status === 'active' ? 'animate-pulse' : ''}`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <span
                className={`mt-2 text-xs text-center max-w-[90px] leading-tight ${
                  stage.status === 'active'
                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                    : stage.status === 'completed'
                    ? 'font-medium text-gray-700 dark:text-gray-300'
                    : stage.status === 'skipped'
                    ? 'text-gray-400 line-through'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {stage.stage_label}
              </span>
              {stage.completed_at && !compact && (
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {formatDate(stage.completed_at)}
                </span>
              )}
              {stage.outcome && (
                <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  stage.outcome === 'passed' || stage.outcome === 'accepted'
                    ? 'bg-green-100 text-green-700'
                    : stage.outcome === 'failed' || stage.outcome === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {stage.outcome}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Vertical tracker for mobile */}
      <div className="md:hidden space-y-1">
        {stages.map((stage, idx) => {
          const config = statusConfig[stage.status] || statusConfig.pending;
          const Icon = config.icon;
          const isLast = idx === stages.length - 1;
          const isSelected = activeStageId === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => onStageClick?.(stage)}
              disabled={!onStageClick}
              className={`flex items-start gap-3 w-full text-left p-2 rounded-lg transition-colors ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-6 mt-1 ${
                    stage.status === 'completed' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
              <div className="pt-1 flex-1 min-w-0">
                <span className={`text-sm ${
                  stage.status === 'active' ? 'font-semibold text-blue-600 dark:text-blue-400' :
                  stage.status === 'completed' ? 'font-medium text-gray-700 dark:text-gray-300' :
                  stage.status === 'skipped' ? 'text-gray-400 line-through' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {stage.stage_label}
                </span>
                {stage.completed_at && (
                  <span className="text-xs text-gray-400 ml-2">{formatDate(stage.completed_at)}</span>
                )}
                {stage.outcome && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                    stage.outcome === 'passed' || stage.outcome === 'accepted'
                      ? 'bg-green-100 text-green-700'
                      : stage.outcome === 'failed' || stage.outcome === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {stage.outcome}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
