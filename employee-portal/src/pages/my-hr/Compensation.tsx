import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { DollarSign, TrendingUp, Calendar, Award, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface SalaryInfo {
  current_salary: number;
  wage_type: string; // "Salary" or "Hourly"
  hourly_rate: number | null;
  annual_equivalent: number;
  effective_date: string | null;
}

interface SalaryChange {
  id: number;
  effective_date: string;
  wage: number;
  change_reason: string | null;
  change_amount: number | null;
  change_percentage: number | null;
}

interface BonusSummary {
  id: number;
  bonus_type: string;
  amount: number;
  target_amount: number | null;
  payment_date: string;
  status: string;
  fiscal_year: number | null;
}

interface EquitySummary {
  id: number;
  grant_type: string;
  grant_date: string;
  shares_granted: number;
  shares_vested: number;
  shares_exercised: number;
  strike_price: number | null;
  vesting_start_date: string;
  vesting_schedule: string | null;
  status: string;
}

interface CompensationData {
  salary: SalaryInfo;
  salary_history: SalaryChange[];
  bonuses: BonusSummary[];
  equity_grants: EquitySummary[];
  total_compensation_ytd: number;
}

export default function Compensation() {
  const [data, setData] = useState<CompensationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  useEffect(() => {
    const fetchCompensation = async () => {
      try {
        setLoading(true);
        const result = await apiGet<CompensationData>('/portal/my-hr/compensation');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load compensation data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompensation();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  const displayedHistory = showFullHistory ? data?.salary_history : data?.salary_history.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compensation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View your salary, bonuses, and equity information
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Current Salary</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(data?.salary.annual_equivalent || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data?.salary.wage_type === 'Hourly'
                  ? `${formatCurrency(data?.salary.hourly_rate || 0)}/hr`
                  : 'Annual'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <DollarSign size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Comp (YTD)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(data?.total_compensation_ytd || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Salary + Bonuses</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <TrendingUp size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Bonuses (YTD)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(
                  data?.bonuses
                    .filter((b) => b.status === 'Paid' && new Date(b.payment_date).getFullYear() === new Date().getFullYear())
                    .reduce((sum, b) => sum + b.amount, 0) || 0
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data?.bonuses.filter((b) => b.status === 'Paid').length || 0} payments
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
              <Award size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Equity Vested</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {data?.equity_grants.reduce((sum, g) => sum + g.shares_vested, 0).toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">shares</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Calendar size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Salary History</h3>
          {data?.salary_history && data.salary_history.length > 0 ? (
            <>
              <div className="space-y-4">
                {displayedHistory?.map((change, index) => (
                  <div
                    key={change.id}
                    className={`flex items-center justify-between py-3 ${
                      index !== (displayedHistory?.length || 0) - 1
                        ? 'border-b border-gray-100 dark:border-gray-700'
                        : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(change.wage)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(change.effective_date)}
                        {change.change_reason && ` - ${change.change_reason}`}
                      </p>
                    </div>
                    {change.change_percentage && (
                      <span
                        className={`text-sm font-medium ${
                          change.change_percentage > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {change.change_percentage > 0 ? '+' : ''}
                        {change.change_percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {data.salary_history.length > 5 && (
                <button
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="mt-4 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {showFullHistory ? (
                    <>
                      Show less <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      Show all {data.salary_history.length} entries <ChevronDown size={16} />
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No salary history available.</p>
          )}
        </motion.div>

        {/* Bonuses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bonuses</h3>
          {data?.bonuses && data.bonuses.length > 0 ? (
            <div className="space-y-4">
              {data.bonuses.slice(0, 5).map((bonus) => (
                <div
                  key={bonus.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{bonus.bonus_type}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(bonus.payment_date)}
                      {bonus.fiscal_year && ` - FY${bonus.fiscal_year}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(bonus.amount)}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        bonus.status === 'Paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : bonus.status === 'Approved'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}
                    >
                      {bonus.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No bonus records available.</p>
          )}
        </motion.div>
      </div>

      {/* Equity Grants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Equity Grants</h3>
        {data?.equity_grants && data.equity_grants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                  <th className="pb-3 font-medium">Grant Type</th>
                  <th className="pb-3 font-medium">Grant Date</th>
                  <th className="pb-3 font-medium text-right">Shares Granted</th>
                  <th className="pb-3 font-medium text-right">Shares Vested</th>
                  <th className="pb-3 font-medium text-right">Strike Price</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.equity_grants.map((grant) => (
                  <tr key={grant.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3 text-gray-900 dark:text-white font-medium">{grant.grant_type}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatDate(grant.grant_date)}</td>
                    <td className="py-3 text-gray-900 dark:text-white text-right">
                      {grant.shares_granted.toLocaleString()}
                    </td>
                    <td className="py-3 text-gray-900 dark:text-white text-right">
                      {grant.shares_vested.toLocaleString()}
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                        ({((grant.shares_vested / grant.shares_granted) * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400 text-right">
                      {grant.strike_price ? formatCurrency(grant.strike_price) : '-'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          grant.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : grant.status === 'Fully Vested'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {grant.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No equity grants on record.</p>
        )}
      </motion.div>
    </div>
  );
}
