import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '@/utils/api';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import {
  Users,
  FileText,
  ClipboardCheck,
  AlertCircle,
  ArrowRight,
  Calendar,
  Cake,
  Award,
  Briefcase,
  Clock,
  UserPlus,
  TrendingUp,
  Settings,
  X,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamMemberEvent {
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  department: string | null;
  date: string;
  years: number | null;
}

interface FMLACaseSummary {
  employee_id: string;
  employee_name: string;
  case_number: string;
  status: string;
  leave_type: string;
  hours_used: number;
  hours_remaining: number;
  pending_submissions: number;
}

interface NewTeamMember {
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  department: string | null;
  hire_date: string;
  days_employed: number;
}

interface PerformanceSnapshot {
  reviews_completed: number;
  reviews_pending: number;
  average_rating: number | null;
  goals_on_track: number;
  goals_at_risk: number;
  goals_completed: number;
}

interface TeamDashboardStats {
  team_size: number;
  on_fmla: number;
  pending_fmla_reviews: number;
  reviews_due_this_month: number;
  birthdays_this_month: number;
  anniversaries_this_month: number;
  new_hires_count: number;
  open_positions_count: number;
}

interface CardPreferences {
  visible_cards: string[];
  card_order: string[];
}

interface EnhancedDashboardData {
  stats: TeamDashboardStats;
  birthdays_this_month: TeamMemberEvent[];
  anniversaries_this_month: TeamMemberEvent[];
  fmla_cases: FMLACaseSummary[];
  who_is_out: TeamMemberEvent[];
  new_team_members: NewTeamMember[];
  performance_snapshot: PerformanceSnapshot;
  card_preferences: CardPreferences | null;
}

// Card definitions for customization
const CARD_DEFINITIONS = {
  birthdays: { id: 'birthdays', label: 'Birthdays This Month', icon: Cake, color: 'pink' },
  anniversaries: { id: 'anniversaries', label: 'Work Anniversaries', icon: Award, color: 'amber' },
  new_members: { id: 'new_members', label: 'New Team Members', icon: UserPlus, color: 'emerald' },
  performance: { id: 'performance', label: 'Performance Snapshot', icon: TrendingUp, color: 'indigo' },
  who_is_out: { id: 'who_is_out', label: 'Currently Out', icon: Briefcase, color: 'blue' },
  fmla_cases: { id: 'fmla_cases', label: 'Team FMLA Cases', icon: Clock, color: 'green' },
};

export default function TeamDashboard() {
  const { viewMode } = useEmployeeFeatures();
  const isBifrost = viewMode === 'bifrost';
  const [data, setData] = useState<EnhancedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiGet<EnhancedDashboardData>('/portal/team/dashboard');
        setData(result);

        // Initialize card preferences
        if (result.card_preferences) {
          setVisibleCards(result.card_preferences.visible_cards);
          setCardOrder(result.card_preferences.card_order);
        } else {
          const defaultCards = Object.keys(CARD_DEFINITIONS);
          setVisibleCards(defaultCards);
          setCardOrder(defaultCards);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const savePreferences = async () => {
    try {
      await apiPut('/portal/team/dashboard/preferences', {
        visible_cards: visibleCards,
        card_order: cardOrder,
      });
      setShowSettings(false);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  const isCardVisible = (cardId: string) => visibleCards.includes(cardId);

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

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your team's status and upcoming events
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings size={18} />
          <span className="text-sm">Customize</span>
        </button>
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr gap-4">
          {/* Team Size - Always visible */}
          <Link to="/team/reports">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.team_size}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Team Size</p>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* On FMLA */}
          {data.stats.on_fmla > 0 && (
            <Link to="/team/fmla-reviews">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <FileText className="text-green-600 dark:text-green-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {data.stats.on_fmla}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">On FMLA</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Pending FMLA Reviews */}
          {data.stats.pending_fmla_reviews > 0 && (
            <Link to="/team/fmla-reviews">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <ClipboardCheck className="text-yellow-600 dark:text-yellow-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {data.stats.pending_fmla_reviews}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending Reviews</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Reviews Due This Month */}
          <Link to="/team/performance">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Calendar className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {data.stats.reviews_due_this_month}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reviews Due</p>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Birthdays This Month */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <Cake className="text-pink-600 dark:text-pink-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {data.stats.birthdays_this_month}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Birthdays</p>
              </div>
            </div>
          </motion.div>

          {/* New Hires */}
          {data.stats.new_hires_count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <UserPlus className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {data.stats.new_hires_count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">New Hires</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Birthdays This Month */}
        {isCardVisible('birthdays') && data && data.birthdays_this_month.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Cake className="text-pink-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentMonth} Birthdays
              </h2>
            </div>
            <div className="space-y-3">
              {data.birthdays_this_month.map((person) => (
                <div
                  key={person.employee_id}
                  className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-200 dark:bg-pink-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-pink-700 dark:text-pink-300">
                        {person.first_name.charAt(0)}
                        {person.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {person.first_name} {person.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {person.position || person.department}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                    {formatDate(person.date)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Work Anniversaries This Month */}
        {isCardVisible('anniversaries') && data && data.anniversaries_this_month.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-amber-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentMonth} Work Anniversaries
              </h2>
            </div>
            <div className="space-y-3">
              {data.anniversaries_this_month.map((person) => (
                <div
                  key={person.employee_id}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        {person.first_name.charAt(0)}
                        {person.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {person.first_name} {person.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {person.position || person.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {formatDate(person.date)}
                    </span>
                    {person.years && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {person.years}
                        {getOrdinalSuffix(person.years)} year
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* New Team Members */}
        {isCardVisible('new_members') && data && data.new_team_members.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="text-emerald-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                New Team Members
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">(Last 90 days)</span>
            </div>
            <div className="space-y-3">
              {data.new_team_members.map((person) => (
                <div
                  key={person.employee_id}
                  className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {person.first_name.charAt(0)}
                        {person.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {person.first_name} {person.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {person.position || person.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatDate(person.hire_date)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {person.days_employed} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Performance Snapshot */}
        {isCardVisible('performance') && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-indigo-500" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Performance Snapshot
                </h2>
              </div>
              <Link
                to="/team/performance"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${
                isBifrost
                  ? 'bg-[rgba(108,63,160,0.15)] shadow-[0_4px_14px_-2px_rgba(108,63,160,0.5)]'
                  : 'bg-indigo-50 dark:bg-indigo-900/20 shadow-[0_4px_14px_-2px_rgba(99,102,241,0.4)]'
              }`}>
                <p className={`text-2xl font-bold ${isBifrost ? 'text-[#6C3FA0]' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {data.performance_snapshot.reviews_completed}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reviews Completed</p>
              </div>
              <div className={`p-4 rounded-lg ${
                isBifrost
                  ? 'bg-[rgba(232,184,75,0.18)] shadow-[0_4px_14px_-2px_rgba(232,184,75,0.55)]'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 shadow-[0_4px_14px_-2px_rgba(234,179,8,0.45)]'
              }`}>
                <p className={`text-2xl font-bold ${isBifrost ? 'text-[#C99A2E]' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {data.performance_snapshot.reviews_pending}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reviews Pending</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Who's Out */}
        {isCardVisible('who_is_out') && data && data.who_is_out.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Currently Out</h2>
            </div>
            <div className="space-y-3">
              {data.who_is_out.map((person) => (
                <div
                  key={person.employee_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isBifrost
                      ? 'bg-[rgba(42,191,191,0.15)] shadow-[0_4px_14px_-2px_rgba(42,191,191,0.5)]'
                      : 'bg-blue-50 dark:bg-blue-900/20 shadow-[0_4px_14px_-2px_rgba(59,130,246,0.4)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isBifrost ? 'bg-[rgba(42,191,191,0.3)]' : 'bg-blue-200 dark:bg-blue-800'
                    }`}>
                      <span className={`text-sm font-bold ${isBifrost ? 'text-[#1A8F8F]' : 'text-blue-700 dark:text-blue-300'}`}>
                        {person.first_name.charAt(0)}
                        {person.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {person.first_name} {person.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {person.position || person.department}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                    FMLA
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Team FMLA Cases - Only show if there are cases and card is visible */}
      {isCardVisible('fmla_cases') && data && data.fmla_cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-green-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Team FMLA Cases
              </h2>
            </div>
            <Link
              to="/team/fmla-reviews"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Case</th>
                  <th className="pb-3 font-medium">Leave Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Hours Used</th>
                  <th className="pb-3 font-medium">Pending</th>
                </tr>
              </thead>
              <tbody>
                {data.fmla_cases.map((fmlaCase) => (
                  <tr
                    key={fmlaCase.case_number}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <td className="py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {fmlaCase.employee_name}
                      </p>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{fmlaCase.case_number}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{fmlaCase.leave_type}</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          fmlaCase.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {fmlaCase.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white">
                          {fmlaCase.hours_used.toFixed(1)}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">/</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {(fmlaCase.hours_used + fmlaCase.hours_remaining).toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      {fmlaCase.pending_submissions > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                          {fmlaCase.pending_submissions}
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
      {data && data.stats.team_size === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center">
          <Users className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Direct Reports</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            You don't have any direct reports assigned to you.
          </p>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Customize Dashboard
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose which cards to display on your dashboard.
              </p>

              <div className="space-y-2">
                {Object.values(CARD_DEFINITIONS).map((card) => {
                  const Icon = card.icon;
                  const isVisible = visibleCards.includes(card.id);

                  return (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isVisible
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                      }`}
                      onClick={() => toggleCardVisibility(card.id)}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical
                          className="text-gray-400 dark:text-gray-500 cursor-grab"
                          size={16}
                        />
                        <Icon
                          className={
                            isVisible
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }
                          size={20}
                        />
                        <span
                          className={
                            isVisible
                              ? 'font-medium text-gray-900 dark:text-white'
                              : 'text-gray-600 dark:text-gray-400'
                          }
                        >
                          {card.label}
                        </span>
                      </div>
                      {isVisible ? (
                        <Eye className="text-blue-600 dark:text-blue-400" size={18} />
                      ) : (
                        <EyeOff className="text-gray-400 dark:text-gray-500" size={18} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreferences}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
