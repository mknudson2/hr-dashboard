import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { ClipboardCheck, AlertCircle, CheckCircle, XCircle, Edit3, X, CheckSquare, Square, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface Submission {
  id: number;
  employee_id: string;
  employee_name: string;
  department: string | null;
  case_number: string;
  leave_date: string;
  hours_requested: number;
  entry_type: string | null;
  employee_notes: string | null;
  status: string;
  submitted_at: string;
}

interface TeamSubmissionsData {
  pending_submissions: Submission[];
  recent_submissions: Submission[];
  pending_count: number;
  approved_today: number;
  rejected_today: number;
}

interface ReviewModalProps {
  submission: Submission;
  onClose: () => void;
  onReviewComplete: () => void;
}

function ReviewModal({ submission, onClose, onReviewComplete }: ReviewModalProps) {
  const [action, setAction] = useState<'approved' | 'rejected' | 'revised'>('approved');
  const [reason, setReason] = useState('');
  const [approvedHours, setApprovedHours] = useState(submission.hours_requested.toString());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiPost(`/portal/review-submission/${submission.id}`, {
        action,
        reason_for_change: reason,
        approved_hours: action === 'revised' ? parseFloat(approvedHours) : undefined,
        reviewer_notes: notes || undefined,
      });

      onReviewComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Submission</h2>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Submission Details */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Employee</p>
                <p className="font-medium text-gray-900 dark:text-white">{submission.employee_name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Case</p>
                <p className="font-medium text-gray-900 dark:text-white">{submission.case_number}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Leave Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(submission.leave_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Hours Requested</p>
                <p className="font-medium text-gray-900 dark:text-white">{submission.hours_requested}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Entry Type</p>
                <p className="font-medium text-gray-900 dark:text-white">{submission.entry_type || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Submitted</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
              </div>
              {submission.employee_notes && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Employee Notes</p>
                  <p className="font-medium text-gray-900 dark:text-white">{submission.employee_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Decision</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('approved')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    action === 'approved'
                      ? 'border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <CheckCircle className={action === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} size={24} />
                  <span className={`text-sm font-medium ${action === 'approved' ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Approve
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('rejected')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    action === 'rejected'
                      ? 'border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <XCircle className={action === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'} size={24} />
                  <span className={`text-sm font-medium ${action === 'rejected' ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Reject
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('revised')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    action === 'revised'
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Edit3 className={action === 'revised' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} size={24} />
                  <span className={`text-sm font-medium ${action === 'revised' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Revise
                  </span>
                </button>
              </div>
            </div>

            {/* Modified Hours (if revising) */}
            {action === 'revised' && (
              <div>
                <label htmlFor="approvedHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Approved Hours <span className="text-red-500">*</span>
                </label>
                <input
                  id="approvedHours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={approvedHours}
                  onChange={(e) => setApprovedHours(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Original request: {submission.hours_requested} hours
                </p>
              </div>
            )}

            {/* Reason (Required) */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Decision <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                minLength={10}
                placeholder="Provide a reason for your decision (minimum 10 characters)..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This reason will be recorded in the audit log
              </p>
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any additional notes for the employee..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-300 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || reason.length < 10}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
                  action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : action === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                }`}
              >
                {submitting ? 'Submitting...' : `Submit ${action.charAt(0).toUpperCase() + action.slice(1)}`}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

interface BatchReviewModalProps {
  submissions: Submission[];
  action: 'approved' | 'rejected';
  onClose: () => void;
  onReviewComplete: () => void;
}

function BatchReviewModal({ submissions, action, onClose, onReviewComplete }: BatchReviewModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: submissions.length });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setProgress({ completed: 0, total: submissions.length });

    let successCount = 0;
    let failedCount = 0;

    for (const submission of submissions) {
      try {
        await apiPost(`/portal/review-submission/${submission.id}`, {
          action,
          reason_for_change: reason,
          reviewer_notes: `Batch ${action} - ${submissions.length} submissions`,
        });
        successCount++;
        setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
      } catch {
        failedCount++;
      }
    }

    if (failedCount > 0) {
      setError(`${failedCount} submission(s) failed to process. ${successCount} succeeded.`);
      setSubmitting(false);
    } else {
      onReviewComplete();
    }
  };

  const totalHours = submissions.reduce((sum, s) => sum + s.hours_requested, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className={`p-6 border-b border-gray-300 dark:border-gray-700 ${
          action === 'approved' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {action === 'approved' ? (
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              ) : (
                <XCircle className="text-red-600 dark:text-red-400" size={24} />
              )}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Batch {action === 'approved' ? 'Approve' : 'Reject'} Submissions
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Submissions Selected</p>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{submissions.length}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Hours</p>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{totalHours}</p>
              </div>
            </div>
            <div className="mt-4 max-h-32 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Employees:</p>
              <div className="flex flex-wrap gap-1">
                {submissions.map(s => (
                  <span key={s.id} className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {s.employee_name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Progress Bar */}
            {submitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Processing...</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {progress.completed} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${action === 'approved' ? 'bg-green-600' : 'bg-red-600'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="batchReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for {action === 'approved' ? 'Approval' : 'Rejection'} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="batchReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                minLength={10}
                placeholder={`Provide a reason for batch ${action === 'approved' ? 'approval' : 'rejection'} (minimum 10 characters)...`}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This reason will be applied to all selected submissions
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-300 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || reason.length < 10}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
                  action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                }`}
              >
                {submitting ? 'Processing...' : `${action === 'approved' ? 'Approve' : 'Reject'} All`}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function PendingReviews() {
  const [data, setData] = useState<TeamSubmissionsData | null>(null);
  const { viewMode } = useEmployeeFeatures();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'approved' | 'rejected' | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiGet<TeamSubmissionsData>('/portal/team-submissions');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewComplete = () => {
    setSelectedSubmission(null);
    fetchData();
  };

  const handleBatchComplete = () => {
    setBatchAction(null);
    setSelectedIds(new Set());
    fetchData();
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.pending_submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.pending_submissions.map(s => s.id)));
    }
  };

  const getSelectedSubmissions = () => {
    if (!data) return [];
    return data.pending_submissions.filter(s => selectedIds.has(s.id));
  };

  const selectionState = data ? (
    selectedIds.size === 0 ? 'none' :
    selectedIds.size === data.pending_submissions.length ? 'all' : 'partial'
  ) : 'none';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-2" size={48} />
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Pending Reviews"
          subtitle="Review and approve time submissions from your team"
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Reviews</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve time submissions from your team</p>
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.pending_count}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved Today</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.approved_today}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Rejected Today</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.rejected_today}</p>
          </div>
        </div>
      )}

      {/* Pending Submissions */}
      {data && data.pending_submissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center">
          <ClipboardCheck className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Pending Reviews</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">All submissions have been reviewed.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
          {/* Header with batch actions */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={selectionState === 'all' ? 'Deselect all' : 'Select all'}
                >
                  {selectionState === 'none' && <Square className="text-gray-400" size={20} />}
                  {selectionState === 'partial' && <Minus className="text-blue-600 dark:text-blue-400" size={20} />}
                  {selectionState === 'all' && <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} />}
                </button>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Pending Submissions
                  {selectedIds.size > 0 && (
                    <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                      ({selectedIds.size} selected)
                    </span>
                  )}
                </h2>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBatchAction('approved')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Approve All
                  </button>
                  <button
                    onClick={() => setBatchAction('rejected')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={16} />
                    Reject All
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {data?.pending_submissions.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedIds.has(sub.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelection(sub.id)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                    aria-label={selectedIds.has(sub.id) ? 'Deselect' : 'Select'}
                  >
                    {selectedIds.has(sub.id) ? (
                      <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} />
                    ) : (
                      <Square className="text-gray-400" size={20} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{sub.employee_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{sub.department}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        <strong>Date:</strong> {new Date(sub.leave_date).toLocaleDateString()}
                      </span>
                      <span>
                        <strong>Hours:</strong> {sub.hours_requested}
                      </span>
                      <span>
                        <strong>Case:</strong> {sub.case_number}
                      </span>
                      {sub.entry_type && (
                        <span>
                          <strong>Type:</strong> {sub.entry_type}
                        </span>
                      )}
                    </div>
                    {sub.employee_notes && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">"{sub.employee_notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Review
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {data && data.recent_submissions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-300 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.recent_submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{sub.employee_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(sub.leave_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sub.hours_requested}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : sub.status === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                        }`}
                      >
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <ReviewModal
            submission={selectedSubmission}
            onClose={() => setSelectedSubmission(null)}
            onReviewComplete={handleReviewComplete}
          />
        )}
      </AnimatePresence>

      {/* Batch Review Modal */}
      <AnimatePresence>
        {batchAction && selectedIds.size > 0 && (
          <BatchReviewModal
            submissions={getSelectedSubmissions()}
            action={batchAction}
            onClose={() => setBatchAction(null)}
            onReviewComplete={handleBatchComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
