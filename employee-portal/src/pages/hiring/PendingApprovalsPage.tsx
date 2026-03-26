import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApprovalRequest {
  id: number;
  resource_type: string;
  resource_id: number;
  chain_id: number;
  current_step_id: number;
  status: string;
  requested_by_name: string;
  notes: string | null;
  created_at: string;
}

type ActionTarget = {
  id: number;
  action: 'approve' | 'reject';
};

const resourceTypeBadgeColors: Record<string, string> = {
  offer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  counter_offer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  requisition: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const resourceTypeLabels: Record<string, string> = {
  offer: 'Offer',
  counter_offer: 'Counter Offer',
  requisition: 'Requisition',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function SuccessToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg"
    >
      <CheckCircle className="w-5 h-5" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

export default function PendingApprovalsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<ApprovalRequest[]>(
        '/portal/hiring-manager/approval-requests/pending'
      );
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleActionClick = (id: number, action: 'approve' | 'reject') => {
    // If clicking the same action on the same item, toggle it off
    if (actionTarget?.id === id && actionTarget.action === action) {
      setActionTarget(null);
      setActionNotes('');
      return;
    }
    setActionTarget({ id, action });
    setActionNotes('');
  };

  const handleConfirm = async () => {
    if (!actionTarget) return;

    try {
      setSubmitting(true);
      const endpoint = `/portal/hiring-manager/approval-requests/${actionTarget.id}/${actionTarget.action}`;
      await apiPost(endpoint, { notes: actionNotes || undefined });

      const actionLabel = actionTarget.action === 'approve' ? 'approved' : 'rejected';
      setToast(`Request ${actionLabel} successfully`);

      // Remove the item from the list
      setRequests((prev) => prev.filter((r) => r.id !== actionTarget.id));
      setActionTarget(null);
      setActionNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAction = () => {
    setActionTarget(null);
    setActionNotes('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && <SuccessToast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

      {/* Back button + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/hiring/my-requisitions')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pending Approvals
          </h1>
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {requests.length}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Empty state */}
      {requests.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center"
        >
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            All caught up!
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You have no pending approval requests at this time.
          </p>
        </motion.div>
      )}

      {/* Approval request cards */}
      <AnimatePresence mode="popLayout">
        {requests.map((request, index) => {
          const isExpanded =
            actionTarget?.id === request.id;
          const badgeColor =
            resourceTypeBadgeColors[request.resource_type] ||
            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
          const badgeLabel =
            resourceTypeLabels[request.resource_type] ||
            request.resource_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

          return (
            <motion.div
              key={request.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -300, transition: { duration: 0.3 } }}
              transition={{ delay: index * 0.03 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                    >
                      {badgeLabel}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(request.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-gray-500 dark:text-gray-400">Requested by:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {request.requested_by_name}
                    </span>
                  </p>

                  {request.notes && (
                    <div className="flex items-start gap-2 mt-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {request.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleActionClick(request.id, 'approve')}
                    disabled={submitting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      actionTarget?.id === request.id && actionTarget.action === 'approve'
                        ? 'bg-green-700 text-white'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleActionClick(request.id, 'reject')}
                    disabled={submitting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      actionTarget?.id === request.id && actionTarget.action === 'reject'
                        ? 'bg-red-700 text-white'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    } disabled:opacity-50`}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Inline notes + confirm */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes (optional)
                      </label>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder={`Add notes for ${actionTarget?.action === 'approve' ? 'approval' : 'rejection'}...`}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={handleCancelAction}
                          disabled={submitting}
                          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirm}
                          disabled={submitting}
                          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                            actionTarget?.action === 'approve'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {submitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              {actionTarget?.action === 'approve' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Confirm{' '}
                              {actionTarget?.action === 'approve' ? 'Approval' : 'Rejection'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
