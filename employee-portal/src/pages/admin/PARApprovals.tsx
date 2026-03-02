import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import {
  FileEdit,
  DollarSign,
  Briefcase,
  ArrowUpRight,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Filter,
  ChevronDown,
  Check,
  X,
  Loader2,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface PAR {
  id: number;
  employee_id: string;
  employee_name: string;
  employee_department: string | null;
  employee_position: string | null;
  submitter_name: string;
  action_type: string;
  current_value: string;
  proposed_value: string;
  effective_date: string;
  justification: string;
  status: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

interface PARListResponse {
  pars: PAR[];
  total: number;
  pending_count: number;
  approved_count: number;
  denied_count: number;
  processing_count: number;
}

export default function PARApprovals() {
  const [data, setData] = useState<PARListResponse | null>(null);
  const { viewMode } = useEmployeeFeatures();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    par: PAR | null;
    action: 'approve' | 'deny';
  }>({ isOpen: false, par: null, action: 'approve' });
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPARs();
  }, [statusFilter, actionTypeFilter]);

  const fetchPARs = async () => {
    try {
      setLoading(true);
      let url = '/admin/hr/pars';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (actionTypeFilter) params.append('action_type', actionTypeFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const result = await apiGet<PARListResponse>(url);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PARs');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal.par) return;

    try {
      setSubmitting(true);
      const endpoint =
        actionModal.action === 'approve'
          ? `/admin/hr/pars/${actionModal.par.id}/approve`
          : `/admin/hr/pars/${actionModal.par.id}/deny`;

      await apiPost(endpoint, { notes: actionNotes || null });

      setActionModal({ isOpen: false, par: null, action: 'approve' });
      setActionNotes('');
      await fetchPARs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'salary_change':
        return DollarSign;
      case 'title_change':
      case 'position_change':
        return ArrowUpRight;
      case 'transfer':
        return Briefcase;
      case 'supervisor_change':
        return Users;
      default:
        return FileEdit;
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'salary_change':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'position_change':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'title_change':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'transfer':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      case 'supervisor_change':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'denied':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  const formatActionType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Personnel Action Requests"
          subtitle="Review and approve supervisor-submitted HR changes"
        />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Personnel Action Requests
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review and approve supervisor-submitted HR changes
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setStatusFilter('pending')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            statusFilter === 'pending'
              ? 'border-yellow-500 ring-2 ring-yellow-500/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.pending_count || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setStatusFilter('approved')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            statusFilter === 'approved'
              ? 'border-green-500 ring-2 ring-green-500/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-green-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.approved_count || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setStatusFilter('denied')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            statusFilter === 'denied'
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.denied_count || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Denied</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setStatusFilter('')}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 text-left transition-all ${
            statusFilter === ''
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileEdit className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.total || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">All Requests</p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter size={18} className="text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">
              {actionTypeFilter ? formatActionType(actionTypeFilter) : 'All Types'}
            </span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showFilterMenu && (
            <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
              {[
                { value: '', label: 'All Types' },
                { value: 'salary_change', label: 'Salary Change' },
                { value: 'position_change', label: 'Position Change' },
                { value: 'title_change', label: 'Title Change' },
                { value: 'supervisor_change', label: 'Supervisor Change' },
                { value: 'transfer', label: 'Transfer' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setActionTypeFilter(option.value);
                    setShowFilterMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <Loader2 className="animate-spin text-gray-400" size={20} />
        )}
      </div>

      {/* PARs List */}
      {data?.pars && data.pars.length > 0 ? (
        <div className="space-y-4">
          {data.pars.map((par, index) => {
            const Icon = getActionTypeIcon(par.action_type);
            const isMassChange = par.justification.startsWith('[Mass Change]');

            return (
              <motion.div
                key={par.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getActionTypeColor(par.action_type)}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {par.employee_name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          {par.employee_id}
                        </span>
                        {isMassChange && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                            Mass Change
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {par.employee_position && <span>{par.employee_position}</span>}
                        {par.employee_position && par.employee_department && <span>•</span>}
                        {par.employee_department && (
                          <span className="flex items-center gap-1">
                            <Building2 size={14} />
                            {par.employee_department}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                        {formatActionType(par.action_type)}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          {par.current_value}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {par.proposed_value}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {isMassChange
                          ? par.justification.replace('[Mass Change] ', '')
                          : par.justification}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>Effective: {formatDate(par.effective_date)}</span>
                        <span>Submitted: {formatDateTime(par.submitted_at)}</span>
                        <span>By: {par.submitter_name}</span>
                      </div>

                      {par.reviewer_notes && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Reviewer Notes ({par.reviewed_by}):
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {par.reviewer_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(par.status)}`}
                    >
                      {par.status.charAt(0).toUpperCase() + par.status.slice(1)}
                    </span>

                    {par.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            setActionModal({ isOpen: true, par, action: 'approve' })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            setActionModal({ isOpen: true, par, action: 'deny' })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
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
          <FileEdit className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            No personnel action requests found.
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal.isOpen && actionModal.par && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setActionModal({ isOpen: false, par: null, action: 'approve' })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`px-6 py-4 ${
                  actionModal.action === 'approve'
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <h3
                  className={`text-lg font-semibold ${
                    actionModal.action === 'approve'
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {actionModal.action === 'approve' ? 'Approve' : 'Deny'} Request
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    actionModal.action === 'approve'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatActionType(actionModal.par.action_type)} for{' '}
                  {actionModal.par.employee_name}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="line-through">{actionModal.par.current_value}</span>
                    <span>→</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {actionModal.par.proposed_value}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Effective: {formatDate(actionModal.par.effective_date)}
                  </p>
                </div>

                {actionModal.action === 'approve' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Approving this request will automatically update the employee's record.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes {actionModal.action === 'deny' && '(Required for denial)'}
                  </label>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                    placeholder={
                      actionModal.action === 'approve'
                        ? 'Add any notes (optional)...'
                        : 'Please provide a reason for denial...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setActionModal({ isOpen: false, par: null, action: 'approve' });
                    setActionNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={submitting || (actionModal.action === 'deny' && !actionNotes.trim())}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    actionModal.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : actionModal.action === 'approve' ? (
                    <>
                      <Check size={18} />
                      Approve & Apply
                    </>
                  ) : (
                    <>
                      <X size={18} />
                      Deny Request
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
