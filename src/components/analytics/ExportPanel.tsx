import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Code,
  Printer,
  Copy,
  Image,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  exportToCSV,
  exportToExcelCSV,
  exportToJSON,
  exportToPrintableHTML,
  copyToClipboard,
  type ExportOptions,
} from '@/utils/exportUtils';

interface ExportPanelProps {
  data: any[];
  columns: { key: string; label: string; format?: (value: any) => string }[];
  title?: string;
  filename?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export default function ExportPanel({
  data,
  columns,
  title = 'Report',
  filename = 'export',
  onExportStart,
  onExportComplete,
}: ExportPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const { showToast } = useToast();

  const handleExport = async (
    type: 'csv' | 'excel' | 'json' | 'html' | 'clipboard',
    exportFn: (options: ExportOptions) => void | Promise<void>
  ) => {
    try {
      onExportStart?.();

      const options: ExportOptions = {
        filename,
        columns,
        data,
        title,
        includeTimestamp,
        includeStats,
      };

      await exportFn(options);

      onExportComplete?.();

      const messages = {
        csv: 'CSV file downloaded successfully',
        excel: 'Excel file downloaded successfully',
        json: 'JSON file downloaded successfully',
        html: 'HTML report generated successfully',
        clipboard: 'Data copied to clipboard',
      };

      showToast(messages[type], 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  const exportOptions = [
    {
      id: 'csv',
      label: 'CSV',
      description: 'Comma-separated values, universal format',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      color: 'green',
      action: () => handleExport('csv', exportToCSV),
    },
    {
      id: 'excel',
      label: 'Excel',
      description: 'Microsoft Excel compatible format',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      color: 'emerald',
      action: () => handleExport('excel', exportToExcelCSV),
    },
    {
      id: 'json',
      label: 'JSON',
      description: 'JavaScript Object Notation for developers',
      icon: <Code className="w-5 h-5" />,
      color: 'blue',
      action: () => handleExport('json', exportToJSON),
    },
    {
      id: 'html',
      label: 'Print',
      description: 'Printable HTML report',
      icon: <Printer className="w-5 h-5" />,
      color: 'purple',
      action: () => handleExport('html', exportToPrintableHTML),
    },
    {
      id: 'clipboard',
      label: 'Copy',
      description: 'Copy to clipboard',
      icon: <Copy className="w-5 h-5" />,
      color: 'gray',
      action: () => handleExport('clipboard', copyToClipboard),
    },
  ];

  const colorClasses = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      hover: 'hover:bg-green-200 dark:hover:bg-green-900/50',
      border: 'border-green-300 dark:border-green-700',
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/50',
      border: 'border-emerald-300 dark:border-emerald-700',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
      border: 'border-blue-300 dark:border-blue-700',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
      hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50',
      border: 'border-purple-300 dark:border-purple-700',
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      hover: 'hover:bg-gray-200 dark:hover:bg-gray-600',
      border: 'border-gray-300 dark:border-gray-600',
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export Data
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {data.length.toLocaleString()} records available
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {/* Export Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {exportOptions.map((option) => {
                  const colors = colorClasses[option.color as keyof typeof colorClasses];
                  return (
                    <motion.button
                      key={option.id}
                      onClick={option.action}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-start gap-3 p-4 rounded-lg border-2
                        ${colors.bg} ${colors.border} ${colors.hover}
                        transition-all duration-200
                      `}
                    >
                      <div className={colors.text}>{option.icon}</div>
                      <div className="flex-1 text-left">
                        <div className={`font-semibold mb-1 ${colors.text}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {option.description}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Export Settings */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Export Options
                  </h4>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={includeTimestamp}
                        onChange={(e) => setIncludeTimestamp(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all ${
                          includeTimestamp
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {includeTimestamp && (
                          <Check className="w-4 h-4 text-white absolute top-0 left-0" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                      Include timestamp in filename
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={includeStats}
                        onChange={(e) => setIncludeStats(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all ${
                          includeStats
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {includeStats && (
                          <Check className="w-4 h-4 text-white absolute top-0 left-0" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                      Include summary statistics (HTML only)
                    </span>
                  </label>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> For large datasets, CSV or JSON formats are recommended.
                  Use the copy function to quickly paste data into spreadsheets.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
