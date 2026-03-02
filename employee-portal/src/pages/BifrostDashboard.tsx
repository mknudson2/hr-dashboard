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
  DollarSign,
  User,
  BookOpen,
  HelpCircle,
  Palmtree,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AuroraHero from '@/components/bifrost/AuroraHero';
import MimirLogo from '@/components/bifrost/MimirLogo';
import { useMimir } from '@/components/mimir/MimirContext';

// ---- Data interfaces (canonical from ModernDashboard) ----

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

interface PayrollNextDate {
  next_pay_date: string;
  days_until: number;
}

// ---- Accent types ----

type AccentColor = 'violet' | 'teal' | 'gold';

const accentGradients: Record<AccentColor, string> = {
  violet: 'from-bifrost-violet to-bifrost-violet-light',
  teal: 'from-aurora-teal-dark to-aurora-teal',
  gold: 'from-bridge-gold-dark to-bridge-gold',
};

const accentShadows: Record<AccentColor, string> = {
  violet: 'shadow-bifrost-violet/25',
  teal: 'shadow-aurora-teal/25',
  gold: 'shadow-bridge-gold/25',
};

const auroraStripGradient = 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)';

// ---- Component ----

export default function BifrostDashboard() {
  const { isSupervisor } = useAuth();
  const { features } = useEmployeeFeatures();
  const { openMimir } = useMimir();
  const [employeeData, setEmployeeData] = useState<EmployeeDashboardData | null>(null);
  const [supervisorData, setSupervisorData] = useState<SupervisorDashboardData | null>(null);
  const [ptoBalance, setPtoBalance] = useState<PTOBalance | null>(null);
  const [payrollDate, setPayrollDate] = useState<PayrollNextDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [totalAttentionCount, setTotalAttentionCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const items: ActionItem[] = [];
        let attentionCount = 0;

        // Fetch employee dashboard data
        try {
          const empData = await apiGet<EmployeeDashboardData>('/portal/dashboard');
          setEmployeeData(empData);

          if (empData.pending_submissions.length > 0) {
            attentionCount += empData.pending_submissions.length;
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
          if (!errMsg.includes('not linked to an employee record') && !isSupervisor) {
            throw empErr;
          }
        }

        // Fetch PTO balance
        try {
          const pto = await apiGet<PTOBalance>('/portal/pto/balance');
          setPtoBalance(pto);
        } catch {
          // PTO data might not be available
        }

        // Fetch next payroll date
        try {
          const payroll = await apiGet<PayrollNextDate>('/portal/payroll/next-date');
          setPayrollDate(payroll);
        } catch {
          // Payroll endpoint might not exist yet
        }

        // If supervisor, fetch supervisor dashboard
        if (isSupervisor) {
          try {
            const supData = await apiGet<SupervisorDashboardData>('/portal/supervisor-dashboard');
            setSupervisorData(supData);

            if (supData.pending_submissions > 0) {
              attentionCount += supData.pending_submissions;
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
        setTotalAttentionCount(attentionCount);
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
          <div className="bifrost-shimmer w-10 h-10 rounded-full" />
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // ---- Stat cards (max 3) ----

  const getStatCards = (): Array<{
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    accent: AccentColor;
    link?: string;
  }> => {
    const cards: Array<{
      title: string;
      value: string | number;
      subtitle: string;
      icon: React.ElementType;
      accent: AccentColor;
      link?: string;
    }> = [];

    // Always show PTO if available
    if (ptoBalance) {
      cards.push({
        title: 'Time Off',
        value: `${ptoBalance.vacation_available}h`,
        subtitle: 'vacation available',
        icon: Calendar,
        accent: 'violet',
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
        accent: 'teal',
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
        accent: 'gold',
        link: '/team/approvals',
      });
    }

    // Show next paycheck if available and room
    if (payrollDate && cards.length < 3) {
      const payDate = new Date(payrollDate.next_pay_date + 'T00:00:00');
      cards.push({
        title: 'Next Paycheck',
        value: payDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        subtitle: payrollDate.days_until === 0 ? 'today' : `in ${payrollDate.days_until} day${payrollDate.days_until !== 1 ? 's' : ''}`,
        icon: DollarSign,
        accent: 'teal',
        link: '/my-hr/compensation',
      });
    }

    // Show benefits status if enrolled and we have room
    if (features?.benefits_enrolled && cards.length < 3) {
      cards.push({
        title: 'Benefits',
        value: 'Active',
        subtitle: 'view coverage',
        icon: Heart,
        accent: 'teal',
        link: '/my-hr/benefits',
      });
    }

    // Fill remaining with documents
    if (cards.length < 3) {
      cards.push({
        title: 'Documents',
        value: 'View',
        subtitle: 'pay stubs & forms',
        icon: FileText,
        accent: 'violet',
        link: '/my-hr/documents',
      });
    }

    // Assign accents by position: violet, teal, gold
    const positionalAccents: AccentColor[] = ['violet', 'teal', 'gold'];
    return cards.slice(0, 3).map((card, i) => ({ ...card, accent: positionalAccents[i] }));
  };

  const statCards = getStatCards();

  // ---- Quick links with Bifröst gradients ----

  const quickLinks = [
    { label: 'Profile', path: '/my-hr/profile', gradient: 'from-bifrost-violet to-bifrost-violet-light', shadow: 'shadow-bifrost-violet/30', icon: User },
    { label: 'Documents', path: '/my-hr/documents', gradient: 'from-mimir-blue to-mimir-blue-light', shadow: 'shadow-mimir-blue/30', icon: FileText },
    { label: 'Handbook', path: '/resources/handbook', gradient: 'from-aurora-teal-dark to-aurora-teal', shadow: 'shadow-aurora-teal/30', icon: BookOpen },
    { label: 'FAQs', path: '/resources/faqs', gradient: 'from-bridge-gold-dark to-bridge-gold', shadow: 'shadow-bridge-gold/30', icon: HelpCircle },
    { label: 'Benefits', path: '/my-hr/benefits', gradient: 'from-[#E05C8A] to-[#F47BA0]', shadow: 'shadow-[#E05C8A]/30', icon: Heart },
    { label: 'Time Off', path: '/my-hr/time-off', gradient: 'from-bifrost-violet-dark to-bifrost-violet', shadow: 'shadow-bifrost-violet-dark/30', icon: Palmtree },
  ];

  // ---- Render ----

  return (
    <div className="space-y-7">
      {/* Aurora Hero */}
      <AuroraHero actionItemCount={totalAttentionCount} />

      {/* Action Items */}
      {actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-[15px] font-semibold text-deep-night mb-3 flex items-center gap-2">
            <span className="w-[7px] h-[7px] bg-bridge-gold rounded-full animate-pulse" />
            Action Required
          </h2>
          <div className="space-y-3">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className="flex items-center justify-between p-[14px] px-[18px] bg-white rounded-[14px] border border-[rgba(108,63,160,0.06)] shadow-[0_1px_3px_rgba(26,26,46,0.04),0_4px_14px_rgba(26,26,46,0.03)] hover:shadow-[0_4px_20px_rgba(108,63,160,0.1),0_8px_30px_rgba(26,26,46,0.06)] hover:border-[rgba(232,184,75,0.15)] transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-bridge-gold/10 to-bridge-gold/5 flex items-center justify-center">
                      <Icon className="text-bridge-gold-dark" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-deep-night">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className="text-gray-400 group-hover:text-bifrost-violet group-hover:translate-x-[3px] transition-all"
                    size={18}
                  />
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-[14px]"
      >
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const stripPosition = index === 0 ? '0%' : index === 1 ? '50%' : '100%';
          const content = (
            <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-[rgba(108,63,160,0.06)] shadow-[0_1px_3px_rgba(26,26,46,0.04),0_4px_14px_rgba(26,26,46,0.03)] hover:shadow-[0_4px_20px_rgba(108,63,160,0.1),0_8px_30px_rgba(26,26,46,0.06)] hover:-translate-y-[2px] transition-all cursor-pointer">
              {/* Aurora tri-color gradient strip — positioned to form one continuous bar across all cards */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                  background: auroraStripGradient,
                  backgroundSize: '300% 100%',
                  backgroundPosition: `${stripPosition} 0%`,
                }}
              />

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-gray-500">{card.title}</p>
                  <p className="font-display text-[28px] font-semibold text-deep-night mt-3 leading-none">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                </div>
                <div className={`w-[42px] h-[42px] rounded-xl bg-gradient-to-br ${accentGradients[card.accent]} flex items-center justify-center shadow-lg ${accentShadows[card.accent]}`}>
                  <Icon className="text-white" size={18} />
                </div>
              </div>
            </div>
          );

          return card.link ? (
            <Link key={card.title} to={card.link}>{content}</Link>
          ) : (
            <div key={card.title}>{content}</div>
          );
        })}
      </motion.div>

      {/* Quick Links — Nordic pill bubbles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center py-2"
      >
        <p className="text-xs text-gray-400 mb-3.5">Quick Links</p>
        <div className="flex flex-wrap items-center justify-center gap-[10px]">
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.3 + index * 0.05,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
            >
              <Link to={link.path}>
                <motion.div
                  whileHover={{ scale: 1.04, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={`relative px-[22px] py-[9px] rounded-full bg-gradient-to-br ${link.gradient} text-white text-[13px] font-medium shadow-lg ${link.shadow} cursor-pointer overflow-hidden`}
                >
                  {/* Glossy overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.22] via-transparent to-transparent rounded-full" />
                  <span className="relative z-10">{link.label}</span>
                </motion.div>
              </Link>
            </motion.div>
          ))}

          {/* Ask Mímir pill with teal glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.3 + quickLinks.length * 0.05,
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
          >
            <motion.button
              onClick={openMimir}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="relative px-[22px] py-[9px] rounded-full bg-gradient-to-br from-deep-night to-mimir-blue text-white text-[13px] font-medium shadow-lg shadow-deep-night/30 cursor-pointer overflow-hidden"
            >
              {/* Teal glow border */}
              <span className="absolute inset-[-1px] rounded-full border-[1.5px] border-aurora-teal opacity-40 animate-pulse" />
              {/* Glossy overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.22] via-transparent to-transparent rounded-full" />
              <span className="relative z-10 flex items-center gap-1.5">
                <MimirLogo size={14} />
                Ask Mímir
              </span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Active FMLA Cases */}
      {employeeData && employeeData.active_cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-[rgba(108,63,160,0.06)] shadow-[0_1px_3px_rgba(26,26,46,0.04),0_4px_14px_rgba(26,26,46,0.03)] p-[22px]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-medium text-deep-night">Active FMLA Cases</h3>
            <Link
              to="/requests/fmla"
              className="text-[13px] text-bifrost-violet font-medium hover:text-bifrost-violet-dark flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {employeeData.active_cases.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-[14px] px-4 bg-frost rounded-xl"
              >
                <div>
                  <p className="text-sm font-semibold text-deep-night">{c.case_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.leave_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-deep-night">
                    {c.hours_remaining.toFixed(1)}h left
                  </p>
                  <div className="w-[100px] h-[5px] bg-black/[0.06] rounded-full mt-1.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-aurora-teal to-bifrost-violet"
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
          className="bg-white rounded-2xl border border-[rgba(108,63,160,0.06)] shadow-[0_1px_3px_rgba(26,26,46,0.04),0_4px_14px_rgba(26,26,46,0.03)] p-[22px]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-medium text-deep-night">Team Overview</h3>
            <Link
              to="/team"
              className="text-[13px] text-bifrost-violet font-medium hover:text-bifrost-violet-dark flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-frost rounded-xl">
              <p className="font-display text-2xl font-semibold text-deep-night">
                {supervisorData.team_size}
              </p>
              <p className="text-xs text-gray-500 mt-1">Team size</p>
            </div>
            <div className="text-center p-4 bg-frost rounded-xl">
              <p className="font-display text-2xl font-semibold text-deep-night">
                {supervisorData.team_members_on_fmla}
              </p>
              <p className="text-xs text-gray-500 mt-1">On FMLA</p>
            </div>
            <div className="text-center p-4 bg-frost rounded-xl">
              <p className="font-display text-2xl font-semibold text-deep-night">
                {supervisorData.pending_submissions}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
