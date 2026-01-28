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

interface BenefitLineItem {
  benefit_type: string;
  employee_annual: number;
  employer_annual: number;
}

interface TotalCompBreakdown {
  base_wages: number;
  employer_benefits: number;
  employer_taxes: number;
  total: number;
  benefits_breakdown: BenefitLineItem[];
}

interface CompensationData {
  salary: SalaryInfo;
  salary_history: SalaryChange[];
  bonuses: BonusSummary[];
  equity_grants: EquitySummary[];
  total_compensation_ytd: number;
  total_compensation_breakdown: TotalCompBreakdown | null;
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

  const formatCurrencyDetail = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.bonuses.map((bonus) => (
                  <tr key={bonus.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3 text-gray-900 dark:text-white font-medium">{bonus.bonus_type}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatDate(bonus.payment_date)}</td>
                    <td className="py-3 text-gray-900 dark:text-white text-right font-medium">{formatCurrency(bonus.amount)}</td>
                    <td className="py-3">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No bonus records available.</p>
        )}
      </motion.div>
      </div>

      {/* Total Compensation Statement */}
      {data?.total_compensation_breakdown && data.total_compensation_breakdown.benefits_breakdown?.length > 0 && (() => {
        const b = data.total_compensation_breakdown;
        const breakdown = b.benefits_breakdown;
        const totalEE = breakdown.reduce((s, i) => s + i.employee_annual, 0);
        const totalER = breakdown.reduce((s, i) => s + i.employer_annual, 0);
        const totalComp = b.base_wages + totalER;

        // Chart 1: Compensation Breakdown slices (salary + each employer benefit)
        const compSlices = [
          { label: 'Salary', value: b.base_wages, color: '#3b82f6' },
          ...breakdown
            .filter(i => i.employer_annual > 0)
            .map((i, idx) => ({
              label: i.benefit_type,
              value: i.employer_annual,
              color: ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316'][idx % 8],
            })),
        ];
        const compTotal = compSlices.reduce((s, sl) => s + sl.value, 0);

        // Chart 2: Benefit Contribution split
        const contribSlices = [
          { label: 'Your Contributions', value: totalEE, color: '#3b82f6' },
          { label: 'Company Contributions', value: totalER, color: '#10b981' },
        ];
        const contribTotal = totalEE + totalER;

        const buildConicGradient = (slices: { value: number; color: string }[], total: number) => {
          if (total === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
          let deg = 0;
          const stops: string[] = [];
          slices.forEach((sl) => {
            const sliceDeg = (sl.value / total) * 360;
            stops.push(`${sl.color} ${deg}deg ${deg + sliceDeg}deg`);
            deg += sliceDeg;
          });
          return `conic-gradient(${stops.join(', ')})`;
        };

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Total Compensation Statement</h3>

            {/* Table */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="pb-3 font-semibold text-gray-700 dark:text-gray-300">Component</th>
                    <th className="pb-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Your Annual Cost</th>
                    <th className="pb-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Employer Annual Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Cash Compensation */}
                  <tr className="bg-blue-50 dark:bg-blue-900/20">
                    <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white" colSpan={3}>
                      Cash Compensation
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pl-4 text-gray-700 dark:text-gray-300">Base Salary</td>
                    <td className="py-2 text-right text-gray-900 dark:text-white font-medium">{formatCurrencyDetail(b.base_wages)}</td>
                    <td className="py-2 text-right text-gray-900 dark:text-white font-medium">{formatCurrencyDetail(b.base_wages)}</td>
                  </tr>

                  {/* Benefits */}
                  <tr className="bg-green-50 dark:bg-green-900/20">
                    <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white" colSpan={3}>
                      Benefits &amp; Employer Contributions
                    </td>
                  </tr>
                  {breakdown.map((item) => (
                    <tr key={item.benefit_type} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pl-4 text-gray-700 dark:text-gray-300">{item.benefit_type}</td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">
                        {item.employee_annual > 0 ? formatCurrencyDetail(item.employee_annual) : '-'}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">
                        {item.employer_annual > 0 ? formatCurrencyDetail(item.employer_annual) : '-'}
                      </td>
                    </tr>
                  ))}

                  {/* Benefits subtotal */}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                    <td className="py-2 pl-4 text-gray-900 dark:text-white">Benefits Subtotal</td>
                    <td className="py-2 text-right text-gray-900 dark:text-white">{formatCurrencyDetail(totalEE)}</td>
                    <td className="py-2 text-right text-gray-900 dark:text-white">{formatCurrencyDetail(totalER)}</td>
                  </tr>

                  {/* Grand Total */}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold text-base">
                    <td className="py-3 px-2 text-gray-900 dark:text-white">Total Compensation</td>
                    <td className="py-3"></td>
                    <td className="py-3 text-right text-gray-900 dark:text-white">{formatCurrencyDetail(totalComp)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Two Donut Charts Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Chart 1: Compensation Breakdown */}
              <div className="flex flex-col items-center">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Compensation Breakdown</h4>
                <div className="relative w-40 h-40 mb-4">
                  <div
                    className="w-full h-full rounded-full"
                    style={{ background: buildConicGradient(compSlices, compTotal) }}
                  />
                  <div className="absolute inset-4 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(compTotal)}</span>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {compSlices.map((sl) => (
                    <div key={sl.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: sl.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{sl.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(sl.value)}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({compTotal > 0 ? ((sl.value / compTotal) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 2: Benefit Contribution Split */}
              <div className="flex flex-col items-center">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Benefit Contribution</h4>
                <div className="relative w-40 h-40 mb-4">
                  <div
                    className="w-full h-full rounded-full"
                    style={{ background: buildConicGradient(contribSlices, contribTotal) }}
                  />
                  <div className="absolute inset-4 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(contribTotal)}</span>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {contribSlices.map((sl) => (
                    <div key={sl.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: sl.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{sl.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(sl.value)}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({contribTotal > 0 ? ((sl.value / contribTotal) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Equity Grants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
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
