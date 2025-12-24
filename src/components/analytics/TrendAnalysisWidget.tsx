import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Activity, Download } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export interface TrendDataPoint {
  label: string;
  value: number;
}

interface TrendAnalysisWidgetProps {
  title: string;
  data: TrendDataPoint[];
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  showPrediction?: boolean;
  onExport?: () => void;
}

export default function TrendAnalysisWidget({
  title,
  data,
  color = 'blue',
  showPrediction = false,
  onExport,
}: TrendAnalysisWidgetProps) {
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  // Calculate trend metrics
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'neutral', slope: 0, average: 0 };

    const values = data.map((d) => d.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Simple linear regression
    const n = values.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    values.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'neutral';

    return { direction, slope, average };
  };

  const trend = calculateTrend();

  // Generate prediction if enabled
  const getPredictedValue = () => {
    if (!showPrediction || data.length < 3) return null;
    const lastValue = data[data.length - 1].value;
    return lastValue + trend.slope;
  };

  const prediction = getPredictedValue();

  // Chart colors
  const colorMap = {
    blue: { line: '#3b82f6', area: 'rgba(59, 130, 246, 0.1)' },
    green: { line: '#10b981', area: 'rgba(16, 185, 129, 0.1)' },
    purple: { line: '#8b5cf6', area: 'rgba(139, 92, 246, 0.1)' },
    orange: { line: '#f97316', area: 'rgba(249, 115, 22, 0.1)' },
    red: { line: '#ef4444', area: 'rgba(239, 68, 68, 0.1)' },
  };

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: title,
        data: data.map((d) => d.value),
        borderColor: colorMap[color].line,
        backgroundColor: colorMap[color].area,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colorMap[color].line,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#f3f4f6' : '#111827',
        bodyColor: isDark ? '#d1d5db' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          font: { size: 11 },
          callback: (value: any) => value.toLocaleString(),
        },
        grid: { color: isDark ? '#374151' : '#e5e7eb' },
        beginAtZero: false,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Trend analysis over time
            </p>
          </div>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Export data"
          >
            <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Average
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {trend.average.toFixed(1)}
          </div>
        </div>

        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Trend</div>
          <div className="flex items-center justify-center gap-1">
            {trend.direction === 'up' ? (
              <>
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  Up
                </span>
              </>
            ) : trend.direction === 'down' ? (
              <>
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  Down
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                Stable
              </span>
            )}
          </div>
        </div>

        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Current
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {data.length > 0
              ? data[data.length - 1].value.toLocaleString()
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-4">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Prediction */}
      {prediction !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Predicted Next Period
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Based on current trend
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {prediction.toFixed(0)}
            </div>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {trend.direction === 'up' && (
            <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
              <span>
                Positive trend detected. Values have been increasing consistently.
              </span>
            </div>
          )}
          {trend.direction === 'down' && (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <TrendingDown className="w-4 h-4 text-red-600 mt-0.5" />
              <span>
                Declining trend detected. Consider investigating the root cause.
              </span>
            </div>
          )}
          {trend.direction === 'neutral' && (
            <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <Activity className="w-4 h-4 text-gray-600 mt-0.5" />
              <span>Values are relatively stable with minor fluctuations.</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
