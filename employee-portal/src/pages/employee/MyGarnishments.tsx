import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { Banknote, AlertCircle, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface GarnishmentSummary {
  id: number;
  case_number: string;
  status: string;
  garnishment_type: string;
  agency_name: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  percent_complete: number;
  start_date: string | null;
  end_date: string | null;
}

interface MyGarnishmentsData {
  garnishments: GarnishmentSummary[];
  total_garnishments: number;
  active_garnishments: number;
  total_owed: number;
  total_paid: number;
  total_remaining: number;
}

export default function MyGarnishments() {
  const { isSupervisor } = useAuth();
  const [data, setData] = useState<MyGarnishmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  useEffect(() => {
    const fetchGarnishments = async () => {
      try {
        setLoading(true);
        setNoEmployeeRecord(false);
        const result = await apiGet<MyGarnishmentsData>('/portal/garnishment/my-garnishments');
        setData(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load garnishments';
        if (errMsg.includes('not linked to an employee record')) {
          setNoEmployeeRecord(true);
        } else {
          setError(errMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGarnishments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'satisfied':
      case 'released':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getTypeIcon = (_type: string) => {
    return <Banknote className="text-blue-600 dark:text-blue-400" size={24} />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredGarnishments = data?.garnishments.filter((g) => {
    if (filter === 'all') return true;
    if (filter === 'active') return g.status.toLowerCase() === 'active';
    if (filter === 'closed') return ['satisfied', 'released', 'closed'].includes(g.status.toLowerCase());
    return true;
  });

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

  if (noEmployeeRecord) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <Users className="mx-auto text-blue-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Employee Record Linked</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account is not linked to an employee record, so you don't have garnishments to view.
          </p>
          {isSupervisor && (
            <Link
              to="/team"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users size={18} />
              View Team Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Garnishments</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and track your garnishment deductions</p>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Garnishments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_garnishments}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-blue-600">{data.active_garnishments}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.total_paid)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining Balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.total_remaining)}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All ({data?.total_garnishments || 0})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Active ({data?.active_garnishments || 0})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'closed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Completed ({(data?.total_garnishments || 0) - (data?.active_garnishments || 0)})
        </button>
      </div>

      {/* Garnishments List */}
      {filteredGarnishments && filteredGarnishments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center">
          <Banknote className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Garnishments</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filter === 'all'
              ? "You don't have any garnishments on file."
              : filter === 'active'
              ? "You don't have any active garnishments."
              : "You don't have any completed garnishments."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGarnishments?.map((g, index) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/my-garnishments/${g.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      {getTypeIcon(g.garnishment_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{g.case_number}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(g.status)}`}>
                          {g.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{g.garnishment_type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{g.agency_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(g.amount_remaining)}
                      </p>
                    </div>
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{g.percent_complete.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            g.percent_complete >= 100 ? 'bg-green-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, g.percent_complete)}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="text-gray-400" size={20} />
                  </div>
                </div>

                {/* Progress info for active garnishments */}
                {g.status.toLowerCase() === 'active' && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <TrendingUp size={16} className="text-blue-500" />
                    <span>
                      {formatCurrency(g.amount_paid)} paid of {formatCurrency(g.total_amount)} total
                    </span>
                  </div>
                )}

                {/* Satisfied notification */}
                {['satisfied', 'released'].includes(g.status.toLowerCase()) && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>This garnishment has been fully satisfied</span>
                    </div>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
