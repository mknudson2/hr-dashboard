import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import {
  FileText,
  Clock,
  DollarSign,
  Heart,
  Calendar,
  Users,
  ClipboardCheck,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Target,
  FileEdit,
  CheckSquare,
  Bell,
  Briefcase,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PTOBalance {
  vacation_available: number;
  sick_available: number;
  personal_available: number;
}

interface Case {
  id: number;
  case_number: string;
  status: string;
  leave_type: string;
  hours_used: number;
  hours_remaining: number;
}

interface EmployeeDashboardData {
  employee_id: string;
  employee_name: string;
  active_cases: Case[];
  pending_submissions: Array<{ id: number; status: string }>;
  recent_submissions: Array<{ id: number; leave_date: string; hours_requested: number; status: string }>;
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

interface ActionItem {
  id: string;
  type: 'pto' | 'fmla' | 'performance' | 'approval' | 'document';
  title: string;
  description: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

export default function OGDashboard() {
  const { user, isSupervisor } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeDashboardData | null>(null);
  const [supervisorData, setSupervisorData] = useState<SupervisorDashboardData | null>(null);
  const [ptoBalance, setPtoBalance] = useState<PTOBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setNoEmployeeRecord(false);
        const items: ActionItem[] = [];

        // Try to fetch employee dashboard data
        try {
          const empData = await apiGet<EmployeeDashboardData>('/portal/dashboard');
          setEmployeeData(empData);

          // Add action items for pending submissions
          if (empData.pending_submissions.length > 0) {
            items.push({
              id: 'fmla-pending',
              type: 'fmla',
              title: 'Pending FMLA Submissions',
              description: `You have ${empData.pending_submissions.length} submission(s) awaiting review`,
              link: '/requests/fmla',
              priority: 'medium',
            });
          }
        } catch (empErr) {
          const errMsg = empErr instanceof Error ? empErr.message : '';
          if (errMsg.includes('not linked to an employee record')) {
            setNoEmployeeRecord(true);
          } else if (!isSupervisor) {
            throw empErr;
          }
        }

        // Fetch PTO balance
        try {
          const pto = await apiGet<PTOBalance>('/portal/pto/balance');
          setPtoBalance(pto);
        } catch {
          // PTO data might not be available, that's OK
        }

        // If supervisor, also fetch supervisor dashboard
        if (isSupervisor) {
          try {
            const supData = await apiGet<SupervisorDashboardData>('/portal/supervisor-dashboard');
            setSupervisorData(supData);

            // Add action items for pending approvals
            if (supData.pending_submissions > 0) {
              items.push({
                id: 'sup-approvals',
                type: 'approval',
                title: 'Pending Approvals',
                description: `${supData.pending_submissions} submission(s) need your review`,
                link: '/team/approvals',
                priority: 'high',
              });
            }
          } catch {
            // Supervisor data might not be available
          }
        }

        setActionItems(items);
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
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
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
    link,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
    link?: string;
  }) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    };

    const CardContent = (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 ${
          link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </motion.div>
    );

    if (link) {
      return <Link to={link}>{CardContent}</Link>;
    }
    return CardContent;
  };

  const QuickAction = ({
    title,
    description,
    icon: Icon,
    link,
    color,
  }: {
    title: string;
    description: string;
    icon: React.ElementType;
    link: string;
    color: string;
  }) => (
    <Link
      to={link}
      className={`flex items-center gap-3 p-3 ${color} rounded-lg transition-colors`}
    >
      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <Icon className="text-gray-700 dark:text-gray-300" size={20} />
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user?.full_name}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Your Employee HR Portal - access all your HR needs in one place
        </p>
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell className="text-amber-600 dark:text-amber-400" size={20} />
            <h2 className="font-semibold text-amber-900 dark:text-amber-300">Action Required</h2>
          </div>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                </div>
                <ArrowRight className="text-gray-400" size={20} />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Supervisor notice */}
      {noEmployeeRecord && isSupervisor && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Users className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Supervisor Access</p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Your account is set up for team management. Use the Team section to manage your direct reports.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Stats Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ptoBalance && (
            <StatCard
              title="Vacation Available"
              value={`${ptoBalance.vacation_available}h`}
              subtitle="PTO balance"
              icon={Calendar}
              color="green"
              link="/my-hr/time-off"
            />
          )}
          {employeeData && (
            <>
              <StatCard
                title="FMLA Cases"
                value={employeeData.active_cases.length}
                subtitle="Active cases"
                icon={Briefcase}
                color="blue"
                link="/requests/fmla"
              />
              <StatCard
                title="Hours Available"
                value={employeeData.rolling_12mo_hours_available.toFixed(0)}
                subtitle="Of 480 FMLA hours"
                icon={Clock}
                color="indigo"
              />
            </>
          )}
          {!noEmployeeRecord && (
            <StatCard
              title="Benefits"
              value="Active"
              subtitle="View your coverage"
              icon={Heart}
              color="purple"
              link="/my-hr/benefits"
            />
          )}
        </div>
      </div>

      {/* Supervisor Team Stats */}
      {isSupervisor && supervisorData && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Team Size"
              value={supervisorData.team_size}
              icon={Users}
              color="blue"
              link="/team"
            />
            <StatCard
              title="On FMLA Leave"
              value={supervisorData.team_members_on_fmla}
              icon={FileText}
              color="green"
            />
            <StatCard
              title="Pending Approvals"
              value={supervisorData.pending_submissions}
              icon={ClipboardCheck}
              color="yellow"
              link="/team/approvals"
            />
            <StatCard
              title="Performance Reviews"
              value="Active"
              subtitle="View team reviews"
              icon={TrendingUp}
              color="purple"
              link="/team/performance"
            />
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My HR Quick Actions */}
        {!noEmployeeRecord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My HR</h3>
              <Link
                to="/my-hr/profile"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="space-y-2">
              <QuickAction
                title="View Profile"
                description="Personal information"
                icon={FileText}
                link="/my-hr/profile"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
              <QuickAction
                title="Compensation"
                description="Salary & bonuses"
                icon={DollarSign}
                link="/my-hr/compensation"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
              <QuickAction
                title="Time Off"
                description="PTO balances & requests"
                icon={Calendar}
                link="/my-hr/time-off"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
            </div>
          </motion.div>
        )}

        {/* Requests Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Requests & Cases</h3>
            <Link
              to="/requests/fmla"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            {!noEmployeeRecord && (
              <>
                <QuickAction
                  title="Submit FMLA Time"
                  description="Log your FMLA hours"
                  icon={Clock}
                  link="/requests/fmla/submit-time"
                  color="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                />
                <QuickAction
                  title="Request PTO"
                  description="Submit time off request"
                  icon={Calendar}
                  link="/requests/pto"
                  color="bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50"
                />
              </>
            )}
            {isSupervisor && (
              <QuickAction
                title="Review Submissions"
                description={`${supervisorData?.pending_submissions || 0} pending`}
                icon={CheckSquare}
                link="/team/approvals"
                color="bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
              />
            )}
          </div>
        </motion.div>

        {/* Supervisor Quick Actions */}
        {isSupervisor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Management</h3>
              <Link
                to="/team"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="space-y-2">
              <QuickAction
                title="Direct Reports"
                description="View your team"
                icon={Users}
                link="/team/reports"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
              <QuickAction
                title="Performance Reviews"
                description="Team performance"
                icon={TrendingUp}
                link="/team/performance"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
              <QuickAction
                title="Goals"
                description="Team objectives"
                icon={Target}
                link="/team/goals"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
              <QuickAction
                title="HR Changes"
                description="Submit change requests"
                icon={FileEdit}
                link="/team/hr-changes"
                color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              />
            </div>
          </motion.div>
        )}

        {/* Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resources</h3>
            <Link
              to="/resources/handbook"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            <QuickAction
              title="Employee Handbook"
              description="Policies & procedures"
              icon={FileText}
              link="/resources/handbook"
              color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
            />
            <QuickAction
              title="Benefits Guide"
              description="Coverage & enrollment"
              icon={Heart}
              link="/resources/benefits"
              color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
            />
            <QuickAction
              title="FAQs"
              description="Common questions"
              icon={AlertCircle}
              link="/resources/faqs"
              color="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
            />
          </div>
        </motion.div>
      </div>

      {/* Active FMLA Cases */}
      {employeeData && employeeData.active_cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active FMLA Cases</h3>
            <Link
              to="/requests/fmla"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {employeeData.active_cases.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.case_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.leave_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {c.hours_remaining.toFixed(1)} hrs left
                  </p>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
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
    </div>
  );
}
