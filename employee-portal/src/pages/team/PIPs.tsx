import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { AlertTriangle, Calendar, User, AlertCircle, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface PIPMilestone {
  id: number;
  title: string;
  due_date: string;
  status: string;
  notes: string | null;
}

interface PIP {
  id: number;
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  progress_percentage: number;
  milestones: PIPMilestone[];
  next_review_date: string | null;
}

interface PIPsData {
  active_pips: PIP[];
  completed_pips: PIP[];
  summary: {
    active: number;
    completed_successfully: number;
    completed_unsuccessfully: number;
    total: number;
  };
}

export default function PIPs() {
  const { viewMode } = useEmployeeFeatures();
  const [data, setData] = useState<PIPsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    const fetchPIPs = async () => {
      try {
        setLoading(true);
        const result = await apiGet<PIPsData>('/portal/team/pips');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PIPs');
      } finally {
        setLoading(false);
      }
    };

    fetchPIPs();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'at_risk':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'behind':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'completed_success':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'completed_fail':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'missed':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  const displayPIPs = activeTab === 'active' ? data?.active_pips : data?.completed_pips;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Performance Improvement Plans"
          subtitle="Manage and track PIPs for your team members"
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Improvement Plans</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track PIPs for your team members
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.summary.active || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active PIPs</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.summary.completed_successfully || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.summary.completed_unsuccessfully || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unsuccessful</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.summary.total || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total PIPs</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Active ({data?.active_pips.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'completed'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Completed ({data?.completed_pips.length || 0})
        </button>
      </div>

      {/* PIPs List */}
      {displayPIPs && displayPIPs.length > 0 ? (
        <div className="space-y-4">
          {displayPIPs.map((pip, index) => (
            <motion.div
              key={pip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <User className="text-yellow-600 dark:text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{pip.employee_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{pip.employee_id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pip.status)}`}>
                  {pip.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for PIP</h4>
                <p className="text-gray-600 dark:text-gray-400">{pip.reason}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Date</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{formatDate(pip.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">End Date</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{formatDate(pip.end_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pip.progress_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                      {pip.progress_percentage}%
                    </span>
                  </div>
                </div>
                {pip.next_review_date && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Review</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {formatDate(pip.next_review_date)}
                    </p>
                  </div>
                )}
              </div>

              {pip.milestones.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Milestones</h4>
                  <div className="space-y-2">
                    {pip.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getMilestoneIcon(milestone.status)}
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">{milestone.title}</p>
                            {milestone.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{milestone.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="text-gray-400" size={14} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(milestone.due_date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
        >
          <AlertTriangle className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            {activeTab === 'active' ? 'No active PIPs.' : 'No completed PIPs.'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
