import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { FileText, Calendar, AlertCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface Case {
  id: number;
  case_number: string;
  employee_id: string;
  employee_name: string;
  status: string;
  leave_type: string;
  reason: string | null;
  request_date: string | null;
  start_date: string | null;
  end_date: string | null;
  hours_approved: number;
  hours_used: number;
  hours_remaining: number;
  intermittent: boolean;
  reduced_schedule: boolean;
}

interface MyCasesData {
  cases: Case[];
  total_cases: number;
  active_cases: number;
  rolling_12mo_hours_used: number;
  rolling_12mo_hours_available: number;
}

export default function MyCases() {
  const { isSupervisor } = useAuth();
  const [data, setData] = useState<MyCasesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        setNoEmployeeRecord(false);
        const result = await apiGet<MyCasesData>('/portal/my-cases');
        setData(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load cases';
        if (errMsg.includes('not linked to an employee record')) {
          setNoEmployeeRecord(true);
        } else {
          setError(errMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'pending activation':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'closed':
      case 'expired':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case 'denied':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  // Check if there's an active case that this pending case is waiting for
  const getActivationInfo = (pendingCase: Case) => {
    if (pendingCase.status.toLowerCase() !== 'pending activation') return null;

    // Find active cases that might be blocking this one
    const activeCase = data?.cases.find(c =>
      c.status.toLowerCase() === 'active' &&
      c.id !== pendingCase.id
    );

    if (activeCase) {
      const endDateStr = activeCase.end_date
        ? new Date(activeCase.end_date).toLocaleDateString()
        : 'the current case ends';
      return {
        message: `This case is approved and will become active after ${endDateStr} or when case ${activeCase.case_number} is closed.`,
        blockedBy: activeCase.case_number
      };
    }

    // If no active case found, it will activate on start date
    const startDateStr = pendingCase.start_date
      ? new Date(pendingCase.start_date).toLocaleDateString()
      : 'the scheduled start date';
    return {
      message: `This case is approved and will become active on ${startDateStr}.`,
      blockedBy: null
    };
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
            Your account is not linked to an employee record, so you don't have personal FMLA cases to view.
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My FMLA Cases</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and track your FMLA leave cases</p>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Cases</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_cases}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Cases</p>
            <p className="text-2xl font-bold text-green-600">{data.active_cases}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Hours Used (12mo)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.rolling_12mo_hours_used.toFixed(1)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Hours Available</p>
            <p className="text-2xl font-bold text-blue-600">{data.rolling_12mo_hours_available.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Cases List */}
      {data && data.cases.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No FMLA Cases</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">You don't have any FMLA cases on file.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.cases.map((c, index) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              onClick={() => setSelectedCase(selectedCase?.id === c.id ? null : c)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{c.case_number}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{c.leave_type}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'}
                        {c.end_date && ` - ${new Date(c.end_date).toLocaleDateString()}`}
                      </span>
                      {c.intermittent && (
                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs">
                          Intermittent
                        </span>
                      )}
                    </div>
                    {/* Pending Activation Notice */}
                    {c.status.toLowerCase() === 'pending activation' && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {getActivationInfo(c)?.message}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Hours Exhausted Notice */}
                    {c.status.toLowerCase() === 'active' && c.hours_remaining <= 0 && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            You have used all approved hours for this case. Contact HR if you need additional leave.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Hours Remaining</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{c.hours_remaining.toFixed(1)}</p>
                  </div>
                  <div className="w-32">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Used</span>
                      <span>{((c.hours_used / c.hours_approved) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (c.hours_used / c.hours_approved) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedCase?.id === c.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Hours Approved</p>
                      <p className="font-medium text-gray-900 dark:text-white">{c.hours_approved}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Hours Used</p>
                      <p className="font-medium text-gray-900 dark:text-white">{c.hours_used.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Request Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {c.request_date ? new Date(c.request_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {c.reason && (
                      <div className="md:col-span-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Reason</p>
                        <p className="font-medium text-gray-900 dark:text-white">{c.reason}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
