import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Calendar, CheckCircle, Clock, AlertTriangle, ChevronDown, Settings
} from 'lucide-react';
import PayrollDrawer from '@/components/PayrollDrawer';

const BASE_URL = 'http://localhost:8000';

interface PayrollPeriod {
  id: number;
  year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  payday: string;
  status: string;
  employer_funding: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  tasks: PayrollTask[];
}

interface PayrollTask {
  id: number;
  payroll_period_id: number;
  title: string;
  description: string | null;
  task_type: string;
  order_index: number;
  parent_task_id: number | null;
  instructions: string | null;
  path_reference: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  has_toggle: boolean;
  toggle_value: boolean | null;
  toggle_label: string | null;
  has_email_button: boolean;
  email_template_name: string | null;
  notes: string | null;
  subtasks: PayrollTask[];
}

interface DashboardMetrics {
  total_periods_this_year: number;
  completed_periods: number;
  upcoming_periods: number;
  in_progress_periods: number;
  next_payday: string | null;
  next_period_start: string | null;
  current_period: PayrollPeriod | null;
}

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('upcoming');
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    console.log('🔐 DEBUG: Getting auth token from localStorage:', token ? `${token.substring(0, 50)}...` : 'NULL!');
    if (!token) {
      console.error('❌ ERROR: No auth token found in localStorage!');
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading payroll data for year:', selectedYear, 'status:', statusFilter);

      const [metricsRes, periodsRes] = await Promise.all([
        fetch(`${BASE_URL}/payroll/dashboard`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/payroll/periods?year=${selectedYear}&status=${statusFilter}`, {
          headers: getAuthHeaders()
        })
      ]);

      console.log('📊 Metrics response:', metricsRes.status, metricsRes.ok);
      console.log('📋 Periods response:', periodsRes.status, periodsRes.ok);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        console.log('✅ Metrics loaded:', data);
        setMetrics(data);
      } else {
        console.error('❌ Metrics failed:', await metricsRes.text());
      }

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        console.log('✅ Periods loaded:', data.length, 'periods');
        setPeriods(data);
      } else {
        console.error('❌ Periods failed:', await periodsRes.text());
      }
    } catch (error) {
      console.error('💥 Error loading payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodClick = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    setShowDrawer(true);
  };

  const handleDrawerClose = () => {
    setShowDrawer(false);
    setSelectedPeriod(null);
    loadData(); // Reload data when drawer closes
  };

  const formatDate = (dateString: string) => {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'upcoming':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'upcoming':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const calculateProgress = (period: PayrollPeriod) => {
    if (period.tasks.length === 0) return 0;
    const completed = period.tasks.filter(t => t.completed).length;
    return Math.round((completed / period.tasks.length) * 100);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payroll Processing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage biweekly payroll periods and tasks</p>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Periods ({selectedYear})</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{metrics.total_periods_this_year}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{metrics.completed_periods}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{metrics.in_progress_periods}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Next Payday</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.next_payday ? formatDate(metrics.next_payday) : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payroll Periods List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payroll Periods</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading periods...</div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No payroll periods found</div>
          ) : (
            periods.map((period) => (
              <motion.div
                key={period.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => handlePeriodClick(period)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Period {period.period_number} - {period.year}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(period.status)}`}>
                        {getStatusIcon(period.status)}
                        {period.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {/* Employer Funding Toggle */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${period.employer_funding ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`}>
                        <Settings className="w-3 h-3 inline mr-1" />
                        Employer Funding: {period.employer_funding ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(period.start_date)} - {formatDate(period.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Payday: {formatDate(period.payday)}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{calculateProgress(period)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${calculateProgress(period)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Payroll Drawer */}
      {selectedPeriod && (
        <PayrollDrawer
          open={showDrawer}
          onClose={handleDrawerClose}
          period={selectedPeriod}
        />
      )}
    </div>
  );
}
