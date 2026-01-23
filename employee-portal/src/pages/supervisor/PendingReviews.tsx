import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { ClipboardCheck, AlertCircle, CheckCircle, XCircle, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Submission</h2>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
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
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

export default function PendingReviews() {
  const [data, setData] = useState<TeamSubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Reviews</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve time submissions from your team</p>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.pending_count}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved Today</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.approved_today}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Rejected Today</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.rejected_today}</p>
          </div>
        </div>
      )}

      {/* Pending Submissions */}
      {data && data.pending_submissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ClipboardCheck className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Pending Reviews</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">All submissions have been reviewed.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Pending Submissions</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {data?.pending_submissions.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{sub.employee_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{sub.department}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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
    </div>
  );
}
