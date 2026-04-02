import { useState } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import { Eye, EyeOff, BarChart3, TrendingUp } from 'lucide-react';
import { useTheme } from 'next-themes';

export interface MetricSeries {
  id: string;
  label: string;
  data: number[];
  color: string;
  type?: 'line' | 'bar';
  yAxisID?: 'left' | 'right';
  visible?: boolean;
}

interface MultiMetricChartProps {
  title: string;
  labels: string[];
  series: MetricSeries[];
  chartType?: 'line' | 'bar' | 'mixed';
}

export default function MultiMetricChart({
  title,
  labels,
  series,
  chartType = 'line',
}: MultiMetricChartProps) {
  const { resolvedTheme } = useTheme();
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.filter((s) => s.visible !== false).map((s) => s.id))
  );
  const [currentChartType, setCurrentChartType] = useState<'line' | 'bar'>(
    chartType === 'mixed' ? 'line' : chartType
  );

  const toggleSeries = (seriesId: string) => {
    setVisibleSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesId)) {
        newSet.delete(seriesId);
      } else {
        newSet.add(seriesId);
      }
      return newSet;
    });
  };

  const isDark = resolvedTheme === 'dark';

  const datasets = series
    .filter((s) => visibleSeries.has(s.id))
    .map((s) => {
      const isLine = chartType === 'mixed' ? s.type === 'line' : currentChartType === 'line';

      return {
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: isLine ? s.color + '33' : s.color + '99',
        borderWidth: isLine ? 3 : 2,
        fill: isLine,
        tension: 0.4,
        pointRadius: isLine ? 4 : 0,
        pointHoverRadius: isLine ? 6 : 0,
        pointBackgroundColor: s.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderRadius: isLine ? 0 : 8,
        yAxisID: s.yAxisID || 'left',
        type: chartType === 'mixed' ? (s.type || 'bar') : undefined,
      };
    });

  const hasMultipleAxes = series.some((s) => s.yAxisID === 'right');

  const chartData = {
    labels,
    datasets,
  };

  const chartOptions: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#f3f4f6' : '#111827',
        bodyColor: isDark ? '#d1d5db' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y.toLocaleString();
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          font: { size: 11 },
        },
        grid: { display: false },
      },
      left: {
        type: 'linear',
        position: 'left',
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          font: { size: 11 },
          callback: (value: string | number) => Number(value).toLocaleString(),
        },
        grid: { color: isDark ? '#374151' : '#e5e7eb' },
        beginAtZero: true,
      },
      ...(hasMultipleAxes && {
        right: {
          type: 'linear',
          position: 'right',
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            font: { size: 11 },
            callback: (value: string | number) => Number(value).toLocaleString(),
          },
          grid: { display: false },
          beginAtZero: true,
        },
      }),
    },
  };

  const ChartComponent = chartType === 'mixed' || currentChartType === 'line' ? Line : Bar;

  const calculateStats = (data: number[]) => {
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    return { sum, avg, min, max };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {visibleSeries.size} of {series.length} metrics visible
          </p>
        </div>
        {chartType !== 'mixed' && (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setCurrentChartType('line')}
              className={`p-2 rounded transition-colors ${
                currentChartType === 'line'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Line chart"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentChartType('bar')}
              className={`p-2 rounded transition-colors ${
                currentChartType === 'bar'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Bar chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Series Legend with Toggle */}
      <div className="mb-4 flex flex-wrap gap-2">
        {series.map((s) => {
          const isVisible = visibleSeries.has(s.id);
          const stats = calculateStats(s.data);

          return (
            <motion.button
              key={s.id}
              onClick={() => toggleSeries(s.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                isVisible
                  ? 'border-transparent shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 opacity-50'
              }`}
              style={{
                backgroundColor: isVisible ? s.color + '20' : 'transparent',
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {s.label}
              </span>
              {isVisible ? (
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              <div className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                Avg: {stats.avg.toFixed(1)}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        {visibleSeries.size === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BarChart3 className="w-16 h-16 mb-3" />
            <p className="text-sm">No metrics selected</p>
            <p className="text-xs">Click on a metric above to show it</p>
          </div>
        ) : (
          <ChartComponent data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Stats Grid */}
      {visibleSeries.size > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          {series
            .filter((s) => visibleSeries.has(s.id))
            .map((s) => {
              const stats = calculateStats(s.data);
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: s.color + '10' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {s.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500 dark:text-gray-500">Max</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {stats.max.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-500">Min</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {stats.min.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
