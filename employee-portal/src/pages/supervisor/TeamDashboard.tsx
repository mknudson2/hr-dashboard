import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import { Users, FileText, ClipboardCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface TeamSubmission {
  id: number;
  employee_id: string;
  employee_name: string;
  department: string | null;
  case_number: string;
  leave_date: string;
  hours_requested: number;
  entry_type: string | null;
  status: string;
  submitted_at: string;
}

interface TeamCase {
  employee_id: string;
  employee_name: string;
  department: string | null;
  case_id: number;
  case_number: string;
  status: string;
  leave_type: string;
  start_date: string | null;
  hours_used: number;
  hours_remaining: number;
  pending_submissions: number;
}

interface DashboardData {
  team_size: number;
  team_members_on_fmla: number;
  pending_submissions: number;
  submissions_to_review: TeamSubmission[];
  recent_activity: Array<{
    id: number;
    action_type: string;
    employee_name: string;
    created_at: string;
  }>;
}

interface TeamCasesData {
  cases: TeamCase[];
  total_team_members_on_fmla: number;
  total_pending_submissions: number;
}

export default function TeamDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [casesData, setCasesData] = useState<TeamCasesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboard, cases] = await Promise.all([
          apiGet<DashboardData>('/portal/supervisor-dashboard'),
          apiGet<TeamCasesData>('/portal/team-cases'),
        ]);
        setDashboardData(dashboard);
        setCasesData(cases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage FMLA time for your direct reports</p>
      </div>

      {/* Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Size</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData.team_size}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">On FMLA Leave</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboardData.team_members_on_fmla}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <FileText className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Reviews</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData.pending_submissions}</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <ClipboardCheck className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
            {dashboardData.pending_submissions > 0 && (
              <Link
                to="/pending-reviews"
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                Review now <ArrowRight size={14} />
              </Link>
            )}
          </motion.div>
        </div>
      )}

      {/* Pending Reviews Quick View */}
      {dashboardData && dashboardData.submissions_to_review.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submissions to Review</h2>
            <Link
              to="/pending-reviews"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {dashboardData.submissions_to_review.slice(0, 5).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{sub.employee_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(sub.leave_date).toLocaleDateString()} • {sub.hours_requested} hours
                  </p>
                </div>
                <Link
                  to="/pending-reviews"
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Team FMLA Cases */}
      {casesData && casesData.cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team FMLA Cases</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Case</th>
                  <th className="pb-3 font-medium">Leave Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Hours Used</th>
                  <th className="pb-3 font-medium">Pending</th>
                </tr>
              </thead>
              <tbody>
                {casesData.cases.map((c) => (
                  <tr key={c.case_id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{c.employee_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.department}</p>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{c.case_number}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{c.leave_type}</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white">{c.hours_used.toFixed(1)}</span>
                        <span className="text-gray-400 dark:text-gray-500">/</span>
                        <span className="text-gray-500 dark:text-gray-400">{(c.hours_used + c.hours_remaining).toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      {c.pending_submissions > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                          {c.pending_submissions}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {dashboardData && dashboardData.team_size === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Direct Reports</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            You don't have any direct reports with FMLA cases assigned to you.
          </p>
        </div>
      )}
    </div>
  );
}
