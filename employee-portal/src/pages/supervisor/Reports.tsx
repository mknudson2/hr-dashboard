import { useState } from 'react';
import { FileBarChart, Download, AlertCircle, Calendar, Users, Clock, Briefcase, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

type ReportType = 'fmla_time' | 'pto_usage' | 'team_attendance' | 'performance_summary';

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  endpoint: string;
}

const reportOptions: ReportOption[] = [
  {
    id: 'fmla_time',
    title: 'FMLA Time Report',
    description: 'All FMLA time submissions from your direct reports',
    icon: Briefcase,
    color: 'bg-blue-500',
    endpoint: '/portal/reports/fmla-time',
  },
  {
    id: 'pto_usage',
    title: 'PTO Usage Report',
    description: 'Vacation, sick, and personal time usage summary',
    icon: Clock,
    color: 'bg-green-500',
    endpoint: '/portal/reports/pto-usage',
  },
  {
    id: 'team_attendance',
    title: 'Team Attendance Report',
    description: 'Attendance patterns and absence trends',
    icon: Users,
    color: 'bg-purple-500',
    endpoint: '/portal/reports/attendance',
  },
  {
    id: 'performance_summary',
    title: 'Performance Summary',
    description: 'Goals completion and review status overview',
    icon: TrendingUp,
    color: 'bg-orange-500',
    endpoint: '/portal/reports/performance',
  },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('fmla_time');
  const { viewMode } = useEmployeeFeatures();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set default date range (last 30 days)
  useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  });

  const currentReport = reportOptions.find(r => r.id === selectedReport)!;

  const handleExport = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({
        format,
        report_type: selectedReport,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      const response = await fetch(`${currentReport.endpoint}?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}_${dateFrom}_${dateTo}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccess(`${format.toUpperCase()} report downloaded successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const setQuickDate = (days: number | 'ytd') => {
    const today = new Date();
    setDateTo(today.toISOString().split('T')[0]);

    if (days === 'ytd') {
      setDateFrom(`${today.getFullYear()}-01-01`);
    } else {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - days);
      setDateFrom(pastDate.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Team Reports"
          subtitle="Generate and export reports for your team"
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and export reports for your team</p>
        </div>
      )}

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportOptions.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          return (
            <motion.button
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 ${report.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="text-white" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{report.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Export Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 ${currentReport.color} rounded-lg`}>
            <FileBarChart className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{currentReport.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {currentReport.description} for the selected date range.
            </p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-6"
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm mb-6"
          >
            <Download size={18} />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline-block mr-2" size={16} />
              From Date
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline-block mr-2" size={16} />
              To Date
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Quick Date Selectors */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setQuickDate(7)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(30)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(90)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Last 3 Months
          </button>
          <button
            type="button"
            onClick={() => setQuickDate('ytd')}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Year to Date
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <Download size={20} />
            )}
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <Download size={20} />
            )}
            Export PDF
          </button>
        </div>
      </motion.div>

      {/* Report Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Report Contents</h3>
        {selectedReport === 'fmla_time' && (
          <>
            <p className="text-sm text-blue-800 dark:text-blue-400">The FMLA Time Report includes:</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>• Employee name and ID</li>
              <li>• Case number and leave type</li>
              <li>• Leave dates and hours requested/approved</li>
              <li>• Submission status and reviewer notes</li>
            </ul>
          </>
        )}
        {selectedReport === 'pto_usage' && (
          <>
            <p className="text-sm text-blue-800 dark:text-blue-400">The PTO Usage Report includes:</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>• Employee name and department</li>
              <li>• PTO type (vacation, sick, personal)</li>
              <li>• Hours used and remaining balance</li>
              <li>• Request dates and approval status</li>
            </ul>
          </>
        )}
        {selectedReport === 'team_attendance' && (
          <>
            <p className="text-sm text-blue-800 dark:text-blue-400">The Attendance Report includes:</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>• Employee attendance patterns</li>
              <li>• Absence frequency and trends</li>
              <li>• Leave type breakdown</li>
              <li>• Average hours worked per week</li>
            </ul>
          </>
        )}
        {selectedReport === 'performance_summary' && (
          <>
            <p className="text-sm text-blue-800 dark:text-blue-400">The Performance Summary includes:</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>• Goal completion rates</li>
              <li>• Review cycle status</li>
              <li>• PIP status (if applicable)</li>
              <li>• Performance ratings summary</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
