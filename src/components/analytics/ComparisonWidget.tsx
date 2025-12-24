import { motion } from 'framer-motion';
import { Calendar, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';

export interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  format?: 'number' | 'percentage' | 'currency';
}

interface ComparisonWidgetProps {
  title: string;
  icon?: ReactNode;
  currentPeriod: string;
  previousPeriod: string;
  comparisons: ComparisonData[];
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export default function ComparisonWidget({
  title,
  icon,
  currentPeriod,
  previousPeriod,
  comparisons,
  color = 'blue',
}: ComparisonWidgetProps) {
  const formatValue = (value: number, format?: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      default:
        return value.toLocaleString('en-US');
    }
  };

  const calculateChange = (current: number, previous: number) => {
    const diff = current - previous;
    const percentage = previous !== 0 ? (diff / previous) * 100 : 0;
    return { diff, percentage };
  };

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${colorClasses[color]} p-6`}>
        <div className="flex items-center gap-3 mb-3">
          {icon || <Calendar className="w-6 h-6 text-white" />}
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2 text-white/90">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{previousPeriod}</span>
          </div>
          <ArrowRight className="w-4 h-4" />
          <div className="flex items-center gap-2 px-3 py-1 bg-white/30 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{currentPeriod}</span>
          </div>
        </div>
      </div>

      {/* Comparisons */}
      <div className="p-6 space-y-4">
        {comparisons.map((item, index) => {
          const { diff, percentage } = calculateChange(item.current, item.previous);
          const isPositive = diff > 0;
          const isNeutral = diff === 0;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
            >
              {/* Label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
                {!isNeutral && (
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isPositive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(percentage).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Values */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">
                      Previous
                    </div>
                    <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                      {formatValue(item.previous, item.format)}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">
                      Current
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatValue(item.current, item.format)}
                    </div>
                  </div>
                </div>

                {!isNeutral && (
                  <div
                    className={`text-right ${
                      isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {isPositive ? '+' : ''}
                      {formatValue(diff, item.format)}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(
                        (item.current / Math.max(item.current, item.previous)) * 100,
                        100
                      )}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                    className={`h-full ${
                      isPositive
                        ? 'bg-green-500'
                        : isNeutral
                        ? 'bg-gray-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
