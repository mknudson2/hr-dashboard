import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import { apiGet } from '@/utils/api';
import {
  Calendar,
  Heart,
  FileText,
  Clock,
  ArrowRight,
  AlertCircle,
  Users,
  Briefcase,
  ChevronRight,
  Sparkles,
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
  icon: React.ElementType;
}

export default function ModernDashboard() {
  const { user, isSupervisor } = useAuth();
  const { features, setViewMode } = useEmployeeFeatures();
  const [employeeData, setEmployeeData] = useState<EmployeeDashboardData | null>(null);
  const [supervisorData, setSupervisorData] = useState<SupervisorDashboardData | null>(null);
  const [ptoBalance, setPtoBalance] = useState<PTOBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setNoEmployeeRecord] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
              link: '/requests/fmla/submissions',
              icon: Briefcase,
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
                icon: Clock,
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
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
        </div>
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

  // Determine which stat cards to show (max 3)
  const getStatCards = () => {
    const cards: Array<{
      title: string;
      value: string | number;
      subtitle: string;
      icon: React.ElementType;
      gradient: string;
      link?: string;
    }> = [];

    // Always show PTO if available
    if (ptoBalance) {
      cards.push({
        title: 'Time Off',
        value: `${ptoBalance.vacation_available}h`,
        subtitle: 'vacation available',
        icon: Calendar,
        gradient: 'from-emerald-500 to-teal-500',
        link: '/my-hr/time-off',
      });
    }

    // Show FMLA hours if has active cases
    if (features?.has_active_fmla_cases && employeeData) {
      cards.push({
        title: 'FMLA Hours',
        value: employeeData.rolling_12mo_hours_available.toFixed(0),
        subtitle: 'hours remaining',
        icon: Briefcase,
        gradient: 'from-blue-500 to-indigo-500',
        link: '/requests/fmla',
      });
    }

    // Show pending approvals for supervisors
    if (isSupervisor && supervisorData && supervisorData.pending_submissions > 0) {
      cards.push({
        title: 'Approvals',
        value: supervisorData.pending_submissions,
        subtitle: 'pending reviews',
        icon: Users,
        gradient: 'from-amber-500 to-orange-500',
        link: '/team/approvals',
      });
    }

    // Show benefits status if enrolled and we have room
    if (features?.benefits_enrolled && cards.length < 3) {
      cards.push({
        title: 'Benefits',
        value: 'Active',
        subtitle: 'view coverage',
        icon: Heart,
        gradient: 'from-pink-500 to-rose-500',
        link: '/my-hr/benefits',
      });
    }

    // Fill remaining slots with documents
    if (cards.length < 3) {
      cards.push({
        title: 'Documents',
        value: 'View',
        subtitle: 'pay stubs & forms',
        icon: FileText,
        gradient: 'from-violet-500 to-purple-500',
        link: '/my-hr/documents',
      });
    }

    return cards.slice(0, 3);
  };

  const statCards = getStatCards();

  // Quick links with iOS-style colors
  const quickLinks = [
    { label: 'Profile', path: '/my-hr/profile', gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/25' },
    { label: 'Documents', path: '/my-hr/documents', gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/25' },
    { label: 'Handbook', path: '/resources/handbook', gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/25' },
    { label: 'FAQs', path: '/resources/faqs', gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25' },
    { label: 'Benefits', path: '/my-hr/benefits', gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/25' },
    { label: 'Time Off', path: '/my-hr/time-off', gradient: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/25' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-8 md:p-10 text-white"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
            <Sparkles size={16} />
            <span>Welcome back</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {getGreeting()}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-blue-100 text-lg">
            {actionItems.length > 0
              ? `You have ${actionItems.length} item${actionItems.length > 1 ? 's' : ''} that need${actionItems.length === 1 ? 's' : ''} your attention`
              : "You're all caught up! No pending items."}
          </p>
        </div>
      </motion.div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Action Required
          </h2>
          <div className="space-y-3">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <Icon className="text-amber-600 dark:text-amber-400" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all"
                    size={20}
                  />
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Stat Cards - Max 3 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}
              >
                <Icon className="text-white" size={24} />
              </div>
            </div>
          );

          const cardClassName = "bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-300 dark:border-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all cursor-pointer group";

          return card.link ? (
            <Link key={card.title} to={card.link} className={cardClassName}>
              {cardContent}
            </Link>
          ) : (
            <div key={card.title} className={cardClassName}>
              {cardContent}
            </div>
          );
        })}
      </motion.div>

      {/* Quick Links - iOS 26 Style Bubbles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="py-6"
      >
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">Quick Links</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.3 + index * 0.05,
                type: 'spring',
                stiffness: 400,
                damping: 25
              }}
            >
              <Link to={link.path}>
                <motion.div
                  whileHover={{
                    scale: 1.08,
                    y: -4,
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 17
                  }}
                  className={`
                    relative px-5 py-2.5 rounded-full
                    bg-gradient-to-r ${link.gradient}
                    text-white text-sm font-medium
                    shadow-lg ${link.shadow}
                    cursor-pointer
                    overflow-hidden
                  `}
                >
                  {/* Glossy overlay for iOS feel */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-transparent rounded-full" />

                  {/* Shimmer effect on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />

                  <span className="relative z-10">{link.label}</span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Active FMLA Cases (if any) */}
      {employeeData && employeeData.active_cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active FMLA Cases</h3>
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
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.case_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.leave_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {c.hours_remaining.toFixed(1)}h left
                  </p>
                  <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
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

      {/* Supervisor Team Overview */}
      {isSupervisor && supervisorData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Team Overview</h3>
            <Link
              to="/team"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {supervisorData.team_size}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Team size</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {supervisorData.team_members_on_fmla}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">On FMLA</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {supervisorData.pending_submissions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Switch to Classic View */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center pt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <button
          onClick={() => setViewMode('og')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Switch to Classic View
        </button>
      </motion.div>
    </div>
  );
}
