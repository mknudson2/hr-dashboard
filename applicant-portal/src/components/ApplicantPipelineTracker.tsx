import { CheckCircle, Circle, CircleDot } from 'lucide-react';
import type { ApplicantFacingStage } from '../types/ats';

interface ApplicantPipelineTrackerProps {
  stages: ApplicantFacingStage[];
  className?: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    labelColor: 'font-medium text-gray-700',
    lineColor: 'bg-green-400',
    bgColor: 'bg-green-50 border-green-300',
  },
  current: {
    icon: CircleDot,
    iconColor: 'text-bifrost-violet',
    labelColor: 'font-semibold text-bifrost-violet',
    lineColor: 'bg-[rgba(108,63,160,0.25)]',
    bgColor: 'bg-[rgba(108,63,160,0.06)] border-bifrost-violet',
  },
  upcoming: {
    icon: Circle,
    iconColor: 'text-gray-300',
    labelColor: 'text-gray-400',
    lineColor: 'bg-gray-200',
    bgColor: 'bg-gray-50 border-gray-200',
  },
};

export default function ApplicantPipelineTracker({ stages, className = '' }: ApplicantPipelineTrackerProps) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <div className="space-y-0">
        {stages.map((stage, idx) => {
          const config = statusConfig[stage.status] || statusConfig.upcoming;
          const Icon = config.icon;
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.label} className="flex items-start gap-4">
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${config.bgColor}`}
                >
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-10 ${config.lineColor}`} />
                )}
              </div>

              {/* Content column */}
              <div className="pt-1.5 pb-4 flex-1 min-w-0">
                <p className={`text-sm ${config.labelColor}`}>
                  {stage.label}
                </p>
                {stage.status === 'current' && (
                  <p className="text-xs text-bifrost-violet mt-1">
                    {stage.description}
                  </p>
                )}
                {stage.status === 'completed' && stage.completedAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(stage.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
