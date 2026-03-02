import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import { CheckSquare, Clock, Calendar, Briefcase, AlertCircle, X, ChevronRight, Filter, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface ApprovalItem {
  id: number;
  type: 'pto' | 'fmla' | 'expense' | 'timesheet';
  employee_name: string;
  employee_id: string;
  submitted_at: string;
  details: string;
  hours?: number;
  amount?: number;
  start_date?: string;
  end_date?: string;
  priority: 'low' | 'normal' | 'high';
}

interface PendingApprovalsData {
  approvals: ApprovalItem[];
  counts: {
    pto: number;
    fmla: number;
    expense: number;
    timesheet: number;
    total: number;
  };
}

function ReviewModal({
  item,
  onClose,
  onSubmit,
  processing,
}: {
  item: ApprovalItem;
  onClose: () => void;
  onSubmit: (id: number, action: 'approve' | 'deny' | 'revise', notes: string, itemType: string, approvedHours?: string) => void;
  processing: boolean;
}) {
  const [action, setAction] = useState<'approve' | 'deny' | 'revise'>('approve');
  const [reason, setReason] = useState('');
  const [approvedHours, setApprovedHours] = useState(item.hours?.toString() || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isFmla = item.type === 'fmla';

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pto': return 'PTO Request';
      case 'fmla': return 'FMLA Time Entry';
      case 'expense': return 'Expense Report';
      case 'timesheet': return 'Timesheet';
      default: return type;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const combinedNotes = [
      reason,
      notes,
    ].filter(Boolean).join(' | ');
    onSubmit(item.id, action, combinedNotes, item.type, action === 'revise' ? approvedHours : undefined);
  };

  const getApproveLabel = () => isFmla ? 'Acknowledge' : 'Approve';
  const getDenyLabel = () => isFmla ? 'Cancel' : 'Reject';
  const getSubmitLabel = () => {
    if (isFmla) return 'Submit';
    if (action === 'approve') return 'Submit Approved';
    if (action === 'deny') return 'Submit Rejected';
    return 'Submit Revised';
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isFmla ? 'Review FMLA Time Entry' : 'Review Request'}</h2>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Request Details */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Employee</p>
                <p className="font-medium text-gray-900 dark:text-white">{item.employee_name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Type</p>
                <p className="font-medium text-gray-900 dark:text-white">{getTypeLabel(item.type)}</p>
              </div>
              {item.start_date && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(item.start_date).toLocaleDateString()}
                    {item.end_date && item.end_date !== item.start_date && ` - ${new Date(item.end_date).toLocaleDateString()}`}
                  </p>
                </div>
              )}
              {item.hours != null && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Hours Requested</p>
                  <p className="font-medium text-gray-900 dark:text-white">{item.hours}</p>
                </div>
              )}
              {item.amount != null && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="font-medium text-gray-900 dark:text-white">${item.amount.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 dark:text-gray-400">Submitted</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(item.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 dark:text-gray-400">Details</p>
                <p className="font-medium text-gray-900 dark:text-white">{item.details}</p>
              </div>
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

            {/* Decision Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Decision</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    action === 'approve'
                      ? 'border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <CheckCircle className={action === 'approve' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} size={24} />
                  <span className={`text-sm font-medium ${action === 'approve' ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {getApproveLabel()}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('deny')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    action === 'deny'
                      ? 'border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <XCircle className={action === 'deny' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'} size={24} />
                  <span className={`text-sm font-medium ${action === 'deny' ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {getDenyLabel()}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('revise')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    action === 'revise'
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Edit3 className={action === 'revise' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} size={24} />
                  <span className={`text-sm font-medium ${action === 'revise' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Revise
                  </span>
                </button>
              </div>
            </div>

            {/* Approved Hours (if revising) */}
            {action === 'revise' && item.hours != null && (
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
                  Original request: {item.hours} hours
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
                disabled={processing || reason.length < 10}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : action === 'deny'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                }`}
              >
                {processing ? 'Processing...' : getSubmitLabel()}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function PendingApprovals() {
  const { viewMode } = useEmployeeFeatures();
  const [data, setData] = useState<PendingApprovalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [reviewItem, setReviewItem] = useState<ApprovalItem | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const result = await apiGet<PendingApprovalsData>('/portal/team/approvals');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: number, action: 'approve' | 'deny' | 'revise', notes: string, itemType?: string, approvedHours?: string) => {
    try {
      setProcessingId(id);
      if (itemType === 'fmla') {
        const apiAction = action === 'approve' ? 'approved' : action === 'deny' ? 'rejected' : 'revised';
        await apiPost(`/portal/review-submission/${id}`, {
          action: apiAction,
          reason_for_change: notes,
          ...(approvedHours ? { approved_hours: parseFloat(approvedHours) } : {}),
          reviewer_notes: notes,
        });
      } else {
        const finalAction = action === 'revise' ? 'approve' : action;
        await apiPost(`/portal/team/approvals/${id}/${finalAction}`, {});
      }
      setReviewItem(null);
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pto':
        return Calendar;
      case 'fmla':
        return Briefcase;
      default:
        return Clock;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pto':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'fmla':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      case 'expense':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const filteredApprovals = data?.approvals.filter((item) => {
    if (selectedType === 'all') return true;
    return item.type === selectedType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Modal */}
      <AnimatePresence>
        {reviewItem && (
          <ReviewModal
            item={reviewItem}
            onClose={() => setReviewItem(null)}
            onSubmit={handleApproval}
            processing={processingId === reviewItem.id}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Pending Approvals"
          subtitle={`${data?.counts.total || 0} items awaiting your review`}
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Approvals</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {data?.counts.total || 0} items awaiting your review
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setSelectedType('all')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            selectedType === 'all'
              ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.counts.total || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">All Pending</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setSelectedType('pto')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            selectedType === 'pto'
              ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-800'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Calendar className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.counts.pto || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PTO Requests</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setSelectedType('fmla')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            selectedType === 'fmla'
              ? 'border-yellow-500 ring-2 ring-yellow-200 dark:ring-yellow-800'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Briefcase className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.counts.fmla || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">FMLA Time</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setSelectedType('timesheet')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            selectedType === 'timesheet'
              ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Clock className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.counts.timesheet || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Timesheets</p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Approval List */}
      {filteredApprovals && filteredApprovals.length > 0 ? (
        <div className="space-y-4">
          {filteredApprovals.map((item, index) => {
            const Icon = getTypeIcon(item.type);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setReviewItem(item)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getTypeColor(item.type)}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.employee_name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full uppercase">
                          {item.type}
                        </span>
                        {item.priority === 'high' && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{item.details}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {item.start_date && (
                          <span>
                            {formatDate(item.start_date)}
                            {item.end_date && item.end_date !== item.start_date && ` - ${formatDate(item.end_date)}`}
                          </span>
                        )}
                        {item.hours && <span>{item.hours} hours</span>}
                        <span>Submitted {formatDate(item.submitted_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewItem(item);
                    }}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Review
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
        >
          <CheckSquare className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            {selectedType === 'all' ? 'No pending approvals.' : `No pending ${selectedType.toUpperCase()} approvals.`}
          </p>
        </motion.div>
      )}

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/team"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <Filter size={18} className="text-blue-600 dark:text-blue-400" />
            <span className="text-gray-700 dark:text-gray-300">Team Dashboard</span>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
