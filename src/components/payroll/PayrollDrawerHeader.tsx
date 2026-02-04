import { X, Calendar, DollarSign, CheckCircle, FileDown, Loader2 } from 'lucide-react';
import type { PayrollPeriod } from './types';
import { formatDate, calculateProgress } from './utils';

interface PayrollDrawerHeaderProps {
  period: PayrollPeriod;
  onClose: () => void;
  onMarkComplete: () => void;
  onExportPDF: () => void;
  markingComplete: boolean;
  exportingPDF: boolean;
}

export default function PayrollDrawerHeader({
  period,
  onClose,
  onMarkComplete,
  onExportPDF,
  markingComplete,
  exportingPDF
}: PayrollDrawerHeaderProps) {
  const progress = calculateProgress(period);

  return (
    <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Payroll Period {period.period_number} - {period.year}
        </h2>
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

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Overall Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-600 dark:bg-green-500' : 'bg-blue-600 dark:bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {progress === 100 && period.status !== 'completed' && (
          <div className="mt-3">
            <button
              onClick={onMarkComplete}
              disabled={markingComplete}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              {markingComplete ? 'Marking Complete...' : 'Mark Payroll as Complete'}
            </button>
          </div>
        )}

        {period.status === 'completed' && (
          <div className="mt-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Payroll Completed</span>
            {period.processed_at && (
              <span className="text-sm ml-auto">
                {new Date(period.processed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 ml-4">
        <button
          onClick={onExportPDF}
          disabled={exportingPDF}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportingPDF ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          {exportingPDF ? 'Exporting...' : 'Export PDF'}
        </button>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
