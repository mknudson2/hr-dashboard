import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react';

interface ApprovalStep {
  id: number;
  order_index: number;
  approver_type: string;
  approver_user_id?: number;
  approver_user_name?: string;
  approver_role?: string;
  is_required: boolean;
  timeout_hours?: number;
}

interface ApprovalStepCardProps {
  step: ApprovalStep;
  status: 'pending' | 'approved' | 'rejected' | 'current' | 'skipped';
  actedByName?: string;
  actedAt?: string;
  notes?: string;
}

const statusConfig = {
  approved: {
    icon: CheckCircle,
    iconColor: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    label: 'Approved',
    labelColor: 'text-green-700 dark:text-green-400',
  },
  rejected: {
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    label: 'Rejected',
    labelColor: 'text-red-700 dark:text-red-400',
  },
  current: {
    icon: Clock,
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    label: 'Awaiting',
    labelColor: 'text-blue-700 dark:text-blue-400',
  },
  pending: {
    icon: Circle,
    iconColor: 'text-gray-300 dark:text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    label: 'Pending',
    labelColor: 'text-gray-400 dark:text-gray-500',
  },
  skipped: {
    icon: Circle,
    iconColor: 'text-gray-300 dark:text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    label: 'Skipped',
    labelColor: 'text-gray-400 dark:text-gray-500',
  },
};

const approverTypeLabels: Record<string, string> = {
  user: 'User',
  role: 'Role',
  hiring_manager: 'Hiring Manager',
  department_head: 'Department Head',
};

export default function ApprovalStepCard({ step, status, actedByName, actedAt, notes }: ApprovalStepCardProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const approverDisplay = step.approver_user_name
    || step.approver_role
    || approverTypeLabels[step.approver_type]
    || step.approver_type;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{approverDisplay}</span>
          <span className={`text-xs font-medium ${config.labelColor}`}>{config.label}</span>
          {step.is_required && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Required</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Step {step.order_index + 1} · {approverTypeLabels[step.approver_type] || step.approver_type}
          </span>
          {step.timeout_hours && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              ({step.timeout_hours}h timeout)
            </span>
          )}
        </div>
        {actedByName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {status === 'approved' ? 'Approved' : 'Rejected'} by {actedByName}
            {actedAt && ` on ${new Date(actedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
        )}
        {notes && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{notes}"</p>
        )}
      </div>
    </div>
  );
}
