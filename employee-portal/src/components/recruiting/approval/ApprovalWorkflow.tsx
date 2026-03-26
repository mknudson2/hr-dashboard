import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/api';
import ApprovalStepCard from './ApprovalStepCard';
import ApprovalActionPanel from './ApprovalActionPanel';

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

interface ApprovalChain {
  id: number;
  name: string;
  chain_type: string;
  description?: string;
  steps: ApprovalStep[];
}

interface ApprovalRequest {
  id: number;
  resource_type: string;
  resource_id: number;
  chain_id: number;
  current_step_id: number;
  status: string;
  requested_by_name?: string;
  acted_by_name?: string;
  acted_at?: string;
  notes?: string;
  created_at: string;
}

interface ApprovalWorkflowProps {
  chainId: number;
  request?: ApprovalRequest | null;
  currentUserId?: number;
  onActionComplete?: () => void;
}

export default function ApprovalWorkflow({ chainId, request, currentUserId, onActionComplete }: ApprovalWorkflowProps) {
  const [chain, setChain] = useState<ApprovalChain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChain(); }, [chainId]);

  const loadChain = async () => {
    try {
      const data = await apiGet<ApprovalChain>(`/portal/hiring-manager/approval-chains/${chainId}`);
      setChain(data);
    } catch (e) {
      console.error('Failed to load approval chain:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number, notes: string) => {
    await apiPost(`/portal/hiring-manager/approval-requests/${requestId}/approve`, {
      notes: notes || undefined,
    });
    onActionComplete?.();
  };

  const handleReject = async (requestId: number, notes: string) => {
    await apiPost(`/portal/hiring-manager/approval-requests/${requestId}/reject`, {
      notes: notes || undefined,
    });
    onActionComplete?.();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!chain) return null;

  const getStepStatus = (step: ApprovalStep): 'approved' | 'rejected' | 'current' | 'pending' | 'skipped' => {
    if (!request) return 'pending';
    if (request.status === 'Rejected') {
      if (step.id === request.current_step_id) return 'rejected';
      const stepIdx = chain.steps.findIndex(s => s.id === step.id);
      const currentIdx = chain.steps.findIndex(s => s.id === request.current_step_id);
      return stepIdx < currentIdx ? 'approved' : 'pending';
    }
    if (request.status === 'Approved') return 'approved';
    if (step.id === request.current_step_id) return 'current';
    const stepIdx = chain.steps.findIndex(s => s.id === step.id);
    const currentIdx = chain.steps.findIndex(s => s.id === request.current_step_id);
    return stepIdx < currentIdx ? 'approved' : 'pending';
  };

  const isCurrentApprover = request
    && request.status === 'Pending'
    && currentUserId != null
    && chain.steps.some(s =>
      s.id === request.current_step_id && s.approver_user_id === currentUserId
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{chain.name}</h3>
        {request && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            request.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
            request.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
          }`}>
            {request.status}
          </span>
        )}
      </div>

      {chain.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{chain.description}</p>
      )}

      <div className="space-y-2">
        {chain.steps.map(step => (
          <ApprovalStepCard
            key={step.id}
            step={step}
            status={getStepStatus(step)}
            actedByName={
              request && step.id === request.current_step_id && (request.status === 'Approved' || request.status === 'Rejected')
                ? request.acted_by_name
                : undefined
            }
            actedAt={request && step.id === request.current_step_id ? request.acted_at : undefined}
            notes={request && step.id === request.current_step_id ? request.notes : undefined}
          />
        ))}
      </div>

      {isCurrentApprover && request && (
        <ApprovalActionPanel
          requestId={request.id}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
