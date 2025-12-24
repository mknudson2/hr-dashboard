import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import { ChevronRight, Home, Download } from 'lucide-react';
import { useTheme } from 'next-themes';

export interface DrillDownLevel {
  name: string;
  data: { label: string; value: number; id?: string }[];
  nextLevelFetcher?: (id: string) => Promise<DrillDownLevel>;
}

interface DrillDownChartProps {
  initialLevel: DrillDownLevel;
  title: string;
  color?: string;
  onExport?: (breadcrumbs: string[]) => void;
}

export default function DrillDownChart({
  initialLevel,
  title,
  color = '#3b82f6',
  onExport,
}: DrillDownChartProps) {
  const { resolvedTheme } = useTheme();
  const [currentLevel, setCurrentLevel] = useState<DrillDownLevel>(initialLevel);
  const [breadcrumbs, setBreadcrumbs] = useState<DrillDownLevel[]>([initialLevel]);
  const [loading, setLoading] = useState(false);

  const handleBarClick = async (index: number) => {
    const selectedItem = currentLevel.data[index];

    if (!selectedItem.id || !currentLevel.nextLevelFetcher) return;

    setLoading(true);
    try {
      const nextLevel = await currentLevel.nextLevelFetcher(selectedItem.id);
      setCurrentLevel(nextLevel);
      setBreadcrumbs([...breadcrumbs, nextLevel]);
    } catch (error) {
      console.error('Error fetching drill-down data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const newLevel = breadcrumbs[index];
    setCurrentLevel(newLevel);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const resetToTop = () => {
    setCurrentLevel(initialLevel);
    setBreadcrumbs([initialLevel]);
  };

  const isDark = resolvedTheme === 'dark';

  const chartData = {
    labels: currentLevel.data.map((d) => d.label),
    datasets: [
      {
        label: currentLevel.name,
        data: currentLevel.data.map((d) => d.value),
        backgroundColor: color + '99',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: color + 'CC',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        handleBarClick(elements[0].index);
      }
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
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y.toLocaleString()}`,
          afterLabel: (context: any) => {
            const item = currentLevel.data[context.dataIndex];
            return item.id && currentLevel.nextLevelFetcher
              ? 'Click to drill down'
              : '';
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
      y: {
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          font: { size: 11 },
          callback: (value: any) => value.toLocaleString(),
        },
        grid: { color: isDark ? '#374151' : '#e5e7eb' },
        beginAtZero: true,
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Click on bars to drill down
          </p>
        </div>
        <div className="flex items-center gap-2">
          {breadcrumbs.length > 1 && (
            <button
              onClick={resetToTop}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset to top level"
            >
              <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onExport && (
            <button
              onClick={() => onExport(breadcrumbs.map((b) => b.name))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Export current view"
            >
              <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {breadcrumbs.map((level, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  index === breadcrumbs.length - 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {level.name}
              </button>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="relative h-80">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-lg"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading drill-down data...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentLevel.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Bar data={chartData} options={chartOptions} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentLevel.data
              .reduce((sum, d) => sum + d.value, 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Average</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentLevel.data.length > 0
              ? (
                  currentLevel.data.reduce((sum, d) => sum + d.value, 0) /
                  currentLevel.data.length
                ).toFixed(1)
              : 0}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Categories
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentLevel.data.length}
          </div>
        </div>
      </div>

      {/* Drill-down hint */}
      {currentLevel.data.some((d) => d.id && currentLevel.nextLevelFetcher) && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Click on any bar to see detailed breakdown
          </p>
        </div>
      )}
    </motion.div>
  );
}
