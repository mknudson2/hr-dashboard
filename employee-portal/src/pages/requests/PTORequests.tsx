import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { Calendar, Clock, Plus, AlertCircle, Check, X, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface PTOBalance {
  vacation_available: number;
  sick_available: number;
  personal_available: number;
}

interface PTORequest {
  id: number;
  start_date: string;
  end_date: string;
  pto_type: string;
  hours: number;
  status: string;
  notes: string | null;
  submitted_at: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
}

interface PTOData {
  balance: PTOBalance;
  requests: PTORequest[];
}

export default function PTORequests() {
  const [data, setData] = useState<PTOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    pto_type: 'vacation',
    hours: 8,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiGet<PTOData>('/portal/pto/requests');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PTO data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiPost('/portal/pto/request', formData);
      setShowForm(false);
      setFormData({ start_date: '', end_date: '', pto_type: 'vacation', hours: 8, notes: '' });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'denied':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PTO Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Submit and track your time off requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Request
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Calendar className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vacation Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.balance.vacation_available.toFixed(1)} hrs
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Clock className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sick Leave Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.balance.sick_available.toFixed(1)} hrs
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Calendar className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Personal Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.balance.personal_available.toFixed(1)} hrs
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* New Request Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submit PTO Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.pto_type}
                  onChange={(e) => setFormData({ ...formData, pto_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="480"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add any notes for your supervisor..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send size={18} />
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

      {/* Request History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request History</h3>
        {data?.requests && data.requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                  <th className="pb-3 font-medium">Dates</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Hours</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Submitted</th>
                  <th className="pb-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3 text-gray-900 dark:text-white">
                      {formatDate(request.start_date)}
                      {request.start_date !== request.end_date && ` - ${formatDate(request.end_date)}`}
                    </td>
                    <td className="py-3 text-gray-900 dark:text-white capitalize">{request.pto_type}</td>
                    <td className="py-3 text-gray-900 dark:text-white">{request.hours}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {request.status === 'approved' && <Check size={12} className="inline mr-1" />}
                        {request.status === 'denied' && <X size={12} className="inline mr-1" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatDate(request.submitted_at)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {request.reviewer_notes || request.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No PTO requests found.</p>
        )}
      </motion.div>
    </div>
  );
}
