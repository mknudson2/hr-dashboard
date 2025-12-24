import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Info } from 'lucide-react';
import { ReactNode, useState } from 'react';

export interface MetricData {
  current: number;
  previous?: number;
  target?: number;
  format?: 'number' | 'percentage' | 'currency' | 'days';
  trend?: 'up' | 'down' | 'neutral';
}

interface InteractiveMetricCardProps {
  title: string;
  icon: ReactNode;
  data: MetricData;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow';
  onClick?: () => void;
  details?: { label: string; value: string | number }[];
  tooltip?: string;
}

export default function InteractiveMetricCard({
  title,
  icon,
  data,
  subtitle,
  color = 'blue',
  onClick,
  details,
  tooltip,
}: InteractiveMetricCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const formatValue = (value: number): string => {
    switch (data.format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'days':
        return `${value.toFixed(0)} days`;
      default:
        return value.toLocaleString('en-US');
    }
  };

  const calculateChange = (): { value: number; percentage: number } | null => {
    if (data.previous === undefined) return null;
    const change = data.current - data.previous;
    const percentage = data.previous !== 0 ? (change / data.previous) * 100 : 0;
    return { value: change, percentage };
  };

  const change = calculateChange();
  const targetProgress = data.target ? (data.current / data.target) * 100 : null;

  const colorClasses = {
    blue: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      hover: 'hover:border-blue-400 hover:shadow-blue-200/50 dark:hover:shadow-blue-800/50',
      gradient: 'from-blue-500/10 to-transparent',
    },
    green: {
      border: 'border-green-200 dark:border-green-800',
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      hover: 'hover:border-green-400 hover:shadow-green-200/50 dark:hover:shadow-green-800/50',
      gradient: 'from-green-500/10 to-transparent',
    },
    red: {
      border: 'border-red-200 dark:border-red-800',
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      hover: 'hover:border-red-400 hover:shadow-red-200/50 dark:hover:shadow-red-800/50',
      gradient: 'from-red-500/10 to-transparent',
    },
    orange: {
      border: 'border-orange-200 dark:border-orange-800',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      icon: 'text-orange-600 dark:text-orange-400',
      hover: 'hover:border-orange-400 hover:shadow-orange-200/50 dark:hover:shadow-orange-800/50',
      gradient: 'from-orange-500/10 to-transparent',
    },
    purple: {
      border: 'border-purple-200 dark:border-purple-800',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      hover: 'hover:border-purple-400 hover:shadow-purple-200/50 dark:hover:shadow-purple-800/50',
      gradient: 'from-purple-500/10 to-transparent',
    },
    yellow: {
      border: 'border-yellow-200 dark:border-yellow-800',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: 'text-yellow-600 dark:text-yellow-400',
      hover: 'hover:border-yellow-400 hover:shadow-yellow-200/50 dark:hover:shadow-yellow-800/50',
      gradient: 'from-yellow-500/10 to-transparent',
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      layout
      className={`
        relative overflow-hidden
        bg-white dark:bg-gray-800 rounded-2xl
        border-2 ${classes.border}
        shadow-md ${classes.hover}
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
      `}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={() => {
        if (onClick) onClick();
        if (details) setExpanded(!expanded);
      }}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${classes.gradient} pointer-events-none`} />

      {/* Main Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${classes.bg}`}>
              <div className={classes.icon}>{icon}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {title}
                </h3>
                {tooltip && (
                  <div className="relative">
                    <Info
                      className="w-4 h-4 text-gray-400 cursor-help"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    />
                    <AnimatePresence>
                      {showTooltip && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-50 left-0 top-6 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg"
                        >
                          {tooltip}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {(onClick || details) && (
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </div>

        {/* Value */}
        <div className="mb-3">
          <motion.div
            key={data.current}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-gray-900 dark:text-white"
          >
            {formatValue(data.current)}
          </motion.div>
        </div>

        {/* Change Indicator */}
        {change && (
          <div className="flex items-center gap-2 mb-2">
            {change.percentage > 0 ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{change.percentage.toFixed(1)}%
                </span>
              </div>
            ) : change.percentage < 0 ? (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {change.percentage.toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Minus className="w-4 h-4" />
                <span className="text-sm font-medium">No change</span>
              </div>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-500">
              vs. previous period
            </span>
          </div>
        )}

        {/* Target Progress */}
        {targetProgress !== null && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress to target</span>
              <span className="font-medium">{targetProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(targetProgress, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full ${
                  targetProgress >= 100
                    ? 'bg-green-500'
                    : targetProgress >= 75
                    ? 'bg-blue-500'
                    : targetProgress >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {details.map((detail, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {detail.label}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
