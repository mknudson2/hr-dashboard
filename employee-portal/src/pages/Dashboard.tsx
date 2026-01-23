import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import {
  FileText,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Case {
  id: number;
  case_number: string;
  status: string;
  leave_type: string;
  hours_used: number;
  hours_remaining: number;
}

interface Submission {
  id: number;
  case_id: number;
  leave_date: string;
  hours_requested: number;
  status: string;
}

interface EmployeeDashboardData {
  employee_id: string;
  employee_name: string;
  active_cases: Case[];
  pending_submissions: Submission[];
  recent_submissions: Submission[];
  rolling_12mo_hours_used: number;
  rolling_12mo_hours_available: number;
}

interface SupervisorDashboardData {
  team_size: number;
  team_members_on_fmla: number;
  pending_submissions: number;
  submissions_to_review: Array<{
    id: number;
    employee_name: string;
    leave_date: string;
    hours_requested: number;
  }>;
}

export default function Dashboard() {
  const { user, isSupervisor } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeDashboardData | null>(null);
  const [supervisorData, setSupervisorData] = useState<SupervisorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setNoEmployeeRecord(false);

        // Try to fetch employee dashboard data
        try {
          const empData = await apiGet<EmployeeDashboardData>('/portal/dashboard');
          setEmployeeData(empData);
        } catch (empErr) {
          const errMsg = empErr instanceof Error ? empErr.message : '';
          // If user is not linked to employee record, that's OK for supervisors
          if (errMsg.includes('not linked to an employee record')) {
            setNoEmployeeRecord(true);
          } else if (!isSupervisor) {
            // For non-supervisors, this is a real error
            throw empErr;
          }
        }

        // If supervisor, also fetch supervisor dashboard
        if (isSupervisor) {
          const supData = await apiGet<SupervisorDashboardData>('/portal/supervisor-dashboard');
          setSupervisorData(supData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor]);

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

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'blue',
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color?: 'blue' | 'green' | 'yellow' | 'red';
  }) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
        <p className="text-gray-600 mt-1">
          {isSupervisor && noEmployeeRecord
            ? 'Manage your team\'s FMLA submissions'
            : 'Manage your FMLA time and submissions'}
        </p>
      </div>

      {/* Notice for supervisors without employee record */}
      {noEmployeeRecord && isSupervisor && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Users className="text-blue-600 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-blue-900">Supervisor Access</p>
              <p className="text-sm text-blue-700 mt-1">
                Your account is set up for team management. Use the Team Dashboard and Pending Reviews
                to manage your team's FMLA submissions.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Employee Stats */}
      {employeeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Cases"
            value={employeeData.active_cases.length}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Pending Submissions"
            value={employeeData.pending_submissions.length}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Hours Used (12mo)"
            value={employeeData.rolling_12mo_hours_used.toFixed(1)}
            subtitle="Rolling 12 months"
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Hours Available"
            value={employeeData.rolling_12mo_hours_available.toFixed(1)}
            subtitle="Of 480 hours"
            icon={Clock}
            color="blue"
          />
        </div>
      )}

      {/* Supervisor Stats */}
      {isSupervisor && supervisorData && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Team Size"
              value={supervisorData.team_size}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="On FMLA Leave"
              value={supervisorData.team_members_on_fmla}
              icon={FileText}
              color="green"
            />
            <StatCard
              title="Pending Reviews"
              value={supervisorData.pending_submissions}
              icon={ClipboardCheck}
              color="yellow"
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Cases */}
        {employeeData && employeeData.active_cases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Active Cases</h3>
              <Link
                to="/my-cases"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {employeeData.active_cases.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{c.case_number}</p>
                    <p className="text-sm text-gray-500">{c.leave_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {c.hours_remaining.toFixed(1)} hrs left
                    </p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${Math.min(100, (c.hours_used / (c.hours_used + c.hours_remaining)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {!noEmployeeRecord && (
              <>
                <Link
                  to="/submit-time"
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Submit Time Entry</p>
                    <p className="text-sm text-gray-500">Log your FMLA time</p>
                  </div>
                </Link>
                <Link
                  to="/request-leave"
                  className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Send className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Request New Leave</p>
                    <p className="text-sm text-gray-500">Start a new FMLA request</p>
                  </div>
                </Link>
              </>
            )}
            {isSupervisor && (
              <>
                <Link
                  to="/pending-reviews"
                  className="flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                >
                  <div className="p-2 bg-yellow-600 rounded-lg">
                    <ClipboardCheck className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Review Submissions</p>
                    <p className="text-sm text-gray-500">
                      {supervisorData?.pending_submissions || 0} pending
                    </p>
                  </div>
                </Link>
                <Link
                  to="/team-dashboard"
                  className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Users className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Team Dashboard</p>
                    <p className="text-sm text-gray-500">View your team's FMLA status</p>
                  </div>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Submissions */}
      {employeeData && employeeData.recent_submissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Submissions</h3>
            <Link
              to="/my-submissions"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Hours</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {employeeData.recent_submissions.slice(0, 5).map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-900">
                      {new Date(sub.leave_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-900">{sub.hours_requested}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : sub.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : sub.status === 'revised'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
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
        </motion.div>
      )}
    </div>
  );
}
