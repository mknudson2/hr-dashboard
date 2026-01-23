import { useState } from 'react';
import { apiGet } from '@/utils/api';
import { FileBarChart, Download, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default date range (last 30 days)
  useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  });

  const handleExport = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        format,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      const response = await fetch(`/portal/export-report?${params}`, {
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
      a.download = `fmla_report_${dateFrom}_${dateTo}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FMLA Reports</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Export team FMLA time reports</p>
      </div>

      {/* Export Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <FileBarChart className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Time Report</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Export all time submissions from your direct reports for the selected date range.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-6">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
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
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date();
              weekAgo.setDate(today.getDate() - 7);
              setDateFrom(weekAgo.toISOString().split('T')[0]);
              setDateTo(today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date();
              monthAgo.setDate(today.getDate() - 30);
              setDateFrom(monthAgo.toISOString().split('T')[0]);
              setDateTo(today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const threeMonthsAgo = new Date();
              threeMonthsAgo.setMonth(today.getMonth() - 3);
              setDateFrom(threeMonthsAgo.toISOString().split('T')[0]);
              setDateTo(today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Last 3 Months
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setDateFrom(`${today.getFullYear()}-01-01`);
              setDateTo(today.toISOString().split('T')[0]);
            }}
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
            disabled={true}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg font-medium cursor-not-allowed"
            title="PDF export coming soon"
          >
            <Download size={20} />
            Export PDF (Coming Soon)
          </button>
        </div>
      </motion.div>

      {/* Report Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Report Contents</h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">The exported report includes:</p>
        <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
          <li>• Employee name and ID</li>
          <li>• Department</li>
          <li>• Case number</li>
          <li>• Leave date and hours requested/approved</li>
          <li>• Entry type</li>
          <li>• Submission status</li>
          <li>• Submission and review dates</li>
          <li>• Reviewer notes</li>
        </ul>
      </div>
    </div>
  );
}
