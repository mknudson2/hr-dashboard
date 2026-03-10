import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { Calendar, Clock, Sun, Heart, AlertCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface PTOBalance {
  vacation_available: number;
  vacation_used: number;
  vacation_accrued_ytd: number;
  sick_available: number;
  sick_used: number;
  personal_available: number;
  personal_used: number;
  floating_holiday_available: number;
  floating_holiday_used: number;
}

interface PTOHistory {
  id: number;
  date: string;
  type: string;
  hours: number;
  description: string | null;
  status: string;
}

interface TimeOffData {
  balance: PTOBalance;
  accrual_rate: number | null; // hours per pay period
  next_accrual_date: string | null;
  history: PTOHistory[];
}

export default function TimeOff() {
  const [data, setData] = useState<TimeOffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeOff = async () => {
      try {
        setLoading(true);
        const result = await apiGet<TimeOffData>('/portal/my-hr/time-off');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load time off data');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeOff();
  }, []);

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

  const BalanceCard = ({
    title,
    available,
    used,
    icon: Icon,
    color,
  }: {
    title: string;
    available: number;
    used: number;
    icon: React.ElementType;
    color: string;
  }) => {
    const total = available + used;
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon size={20} className="text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{available.toFixed(1)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">hours available</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">{used.toFixed(1)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">hours used</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color.replace('bg-', 'bg-')}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Off Balances</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View your PTO balances and usage history</p>
      </div>

      {/* Accrual Info */}
      {data?.accrual_rate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                You accrue {data.accrual_rate} hours per pay period
              </p>
              {data.next_accrual_date && (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Next accrual: {formatDate(data.next_accrual_date)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          title="Vacation"
          available={data?.balance.vacation_available || 0}
          used={data?.balance.vacation_used || 0}
          icon={Sun}
          color="bg-yellow-500"
        />
        <BalanceCard
          title="Sick Leave"
          available={data?.balance.sick_available || 0}
          used={data?.balance.sick_used || 0}
          icon={Heart}
          color="bg-red-500"
        />
        <BalanceCard
          title="Personal"
          available={data?.balance.personal_available || 0}
          used={data?.balance.personal_used || 0}
          icon={Calendar}
          color="bg-purple-500"
        />
        <BalanceCard
          title="Floating Holiday"
          available={data?.balance.floating_holiday_available || 0}
          used={data?.balance.floating_holiday_used || 0}
          icon={Clock}
          color="bg-green-500"
        />
      </div>

      {/* Usage History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage History</h3>
        {data?.history && data.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Hours</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3 text-gray-900 dark:text-white">{formatDate(entry.date)}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.type === 'Vacation'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : entry.type === 'Sick'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : entry.type === 'Personal'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3 text-gray-900 dark:text-white">{entry.hours}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{entry.description || '-'}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : entry.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No usage history available.</p>
        )}
      </motion.div>
    </div>
  );
}
