import { CheckCircle, Clock, Send } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface OfferApprovalBadgeProps {
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  offerId: number;
  onStatusChange: () => void;
}

export default function OfferApprovalBadge({
  status,
  approvedBy,
  approvedAt,
  offerId,
  onStatusChange,
}: OfferApprovalBadgeProps) {
  async function submitForApproval() {
    try {
      await apiFetch(`/recruiting/offers/${offerId}/submit-for-approval`, { method: 'PATCH' });
      onStatusChange();
    } catch {
      // Error handled by parent
    }
  }

  if (status === 'Draft') {
    return (
      <button
        onClick={submitForApproval}
        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-sm font-medium rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
      >
        <Send className="w-4 h-4" />
        Submit for Approval
      </button>
    );
  }

  if (status === 'Pending Approval') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 text-sm rounded-lg">
        <Clock className="w-4 h-4" />
        Awaiting HM Approval
      </div>
    );
  }

  if (status === 'Approved' || status === 'Sent' || status === 'Accepted') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-lg">
        <CheckCircle className="w-4 h-4" />
        <span>
          Approved{approvedBy ? ` by ${approvedBy}` : ''}
          {approvedAt ? ` on ${new Date(approvedAt).toLocaleDateString()}` : ''}
        </span>
      </div>
    );
  }

  return null;
}
