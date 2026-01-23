import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { Clock, AlertCircle, CheckCircle, XCircle, Edit3, Plus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface Submission {
  id: number;
  case_id: number;
  employee_id: string;
  leave_date: string;
  hours_requested: number;
  entry_type: string | null;
  employee_notes: string | null;
  status: string;
  submitted_at: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  approved_hours: number | null;
}

interface SubmissionsData {
  submissions: Submission[];
  total: number;
  pending_count: number;
}

export default function MySubmissions() {
  const { isSupervisor } = useAuth();
  const [data, setData] = useState<SubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setNoEmployeeRecord(false);
        const result = await apiGet<SubmissionsData>('/portal/my-submissions');
        setData(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load submissions';
        if (errMsg.includes('not linked to an employee record')) {
          setNoEmployeeRecord(true);
        } else {
          setError(errMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={18} />;
      case 'revised':
        return <Edit3 className="text-blue-500" size={18} />;
      default:
        return <Clock className="text-yellow-500" size={18} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      revised: 'bg-blue-100 text-blue-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredSubmissions = data?.submissions.filter(sub =>
    statusFilter === 'all' || sub.status === statusFilter
  ) || [];

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
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (noEmployeeRecord) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-gray-600 mt-1">Track the status of your time submissions</p>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center max-w-md">
            <Users className="mx-auto text-blue-500 mb-4" size={48} />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Employee Record Linked</h2>
            <p className="text-gray-600 mb-4">
              Your account is not linked to an employee record, so you don't have any submissions to view.
            </p>
            {isSupervisor && (
              <Link
                to="/pending-reviews"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users size={18} />
                View Pending Reviews
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-gray-600 mt-1">Track the status of your time submissions</p>
        </div>
        <Link
          to="/submit-time"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Submission
        </Link>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Submissions</p>
            <p className="text-2xl font-bold text-gray-900">{data.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{data.pending_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {data.submissions.filter(s => s.status === 'approved').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-2xl font-bold text-red-600">
              {data.submissions.filter(s => s.status === 'rejected').length}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected', 'revised'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900">No Submissions</h3>
          <p className="text-gray-500 mt-1">
            {statusFilter === 'all'
              ? "You haven't submitted any time entries yet."
              : `No ${statusFilter} submissions found.`}
          </p>
          <Link
            to="/submit-time"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Submit Time Entry
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubmissions.map((sub, index) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">
                        {new Date(sub.leave_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {sub.hours_requested}
                        {sub.approved_hours !== null && sub.approved_hours !== sub.hours_requested && (
                          <span className="text-sm text-gray-500 ml-1">
                            → {sub.approved_hours}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{sub.entry_type || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(sub.status)}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(sub.status)}`}>
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {sub.reviewer_notes ? (
                        <span className="text-sm text-gray-600 max-w-xs truncate block" title={sub.reviewer_notes}>
                          {sub.reviewer_notes}
                        </span>
                      ) : sub.employee_notes ? (
                        <span className="text-sm text-gray-400 italic max-w-xs truncate block" title={sub.employee_notes}>
                          {sub.employee_notes}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
