import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { FileEdit, DollarSign, Briefcase, ArrowUpRight, AlertCircle, Plus, Clock, CheckCircle, XCircle, Users, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';
import MassSupervisorChangeModal from '@/components/hr/MassSupervisorChangeModal';

interface HRChangeRequest {
  id: number;
  employee_id: string;
  employee_name: string;
  action_type: string;
  current_value: string;
  proposed_value: string;
  effective_date: string;
  justification: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

interface HRChangeRequestsData {
  pending_pars: HRChangeRequest[];
  submitted_pars: HRChangeRequest[];
  summary: {
    pending: number;
    approved: number;
    denied: number;
    processing: number;
  };
}

export default function HRChangeRequests() {
  const [data, setData] = useState<HRChangeRequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
  const [showMassChangeModal, setShowMassChangeModal] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    action_type: 'salary_change',
    current_value: '',
    proposed_value: '',
    effective_date: '',
    justification: '',
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const result = await apiGet<HRChangeRequestsData>('/portal/team/pars');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiPost('/portal/team/pars', formData);
      setShowForm(false);
      setFormData({
        employee_id: '',
        action_type: 'salary_change',
        current_value: '',
        proposed_value: '',
        effective_date: '',
        justification: '',
      });
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMassSubmit = async (data: {
    employee_ids: string[];
    from_supervisor: string;
    to_supervisor: string;
    effective_date: string;
    justification: string;
  }) => {
    // Submit a PAR for each employee in the mass change
    for (const employeeId of data.employee_ids) {
      await apiPost('/portal/team/pars', {
        employee_id: employeeId,
        action_type: 'supervisor_change',
        current_value: data.from_supervisor,
        proposed_value: data.to_supervisor,
        effective_date: data.effective_date,
        justification: `[Mass Change] ${data.justification}`,
      });
    }
    await fetchRequests();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const displayRequests = activeTab === 'pending' ? data?.pending_pars : data?.submitted_pars;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR Change Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Submit and track personnel changes for your team
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Request
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.summary.pending || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.summary.approved || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileEdit className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.summary.processing || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Processing</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.summary.denied || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Denied</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* New Request Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submit HR Change Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="E.g., EMP001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action Type
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="salary_change">Salary Change</option>
                    <option value="position_change">Position Change</option>
                    <option value="title_change">Title Change</option>
                    <option value="supervisor_change">Supervisor Change</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  {formData.action_type === 'supervisor_change' && (
                    <button
                      type="button"
                      onClick={() => setShowMassChangeModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
                    >
                      <UsersRound size={18} />
                      Mass Change
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Value
                </label>
                <input
                  type="text"
                  required
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  placeholder="E.g., $75,000 or Software Engineer"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proposed Value
                </label>
                <input
                  type="text"
                  required
                  value={formData.proposed_value}
                  onChange={(e) => setFormData({ ...formData, proposed_value: e.target.value })}
                  placeholder="E.g., $85,000 or Senior Software Engineer"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Justification
              </label>
              <textarea
                required
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Provide detailed justification for this change request..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Pending Review ({data?.pending_pars.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'submitted'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          My Submissions ({data?.submitted_pars.length || 0})
        </button>
      </div>

      {/* Requests List */}
      {displayRequests && displayRequests.length > 0 ? (
        <div className="space-y-4">
          {displayRequests.map((request, index) => {
            const Icon = getActionTypeIcon(request.action_type);

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getActionTypeColor(request.action_type)}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{request.employee_name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          {request.employee_id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {request.action_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{request.current_value}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{request.proposed_value}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{request.justification}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Effective: {formatDate(request.effective_date)}</span>
                        <span>Submitted: {formatDate(request.submitted_at)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                {request.reviewer_notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Reviewer Notes:</span> {request.reviewer_notes}
                    </p>
                  </div>
                )}
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
            {activeTab === 'pending' ? 'No pending requests.' : 'No submitted requests.'}
          </p>
        </motion.div>
      )}

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

      {/* Mass Supervisor Change Modal */}
      <MassSupervisorChangeModal
        isOpen={showMassChangeModal}
        onClose={() => setShowMassChangeModal(false)}
        onSubmit={handleMassSubmit}
      />
    </div>
  );
}
