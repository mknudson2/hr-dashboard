import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WageHistoryEntry {
  id: number;
  effective_date: string;
  wage: number;
  annual_salary?: number | null;
  change_reason?: string;
  change_amount?: number;
  change_percentage?: number;
}

interface SalaryHistoryChartProps {
  history: WageHistoryEntry[];
  currentSalary?: number;
  employeeName?: string;
  employeeType?: string;
  annualWage?: number;
}

type ViewMode = 'base_rate' | 'annual';

export default function SalaryHistoryChart({ history, currentSalary, employeeName, employeeType, annualWage }: SalaryHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Default to annual for salaried employees, base rate for hourly
  const isSalaried = employeeType?.toLowerCase().includes('salary') ||
    employeeType?.toLowerCase().includes('salaried');
  const [viewMode, setViewMode] = useState<ViewMode>(isSalaried ? 'annual' : 'base_rate');

  // Sort history by date
  const sortedHistory = [...history].sort((a, b) =>
    new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  // Compute annual salary for each entry if not provided
  const isPartTime = (employeeType || '').toLowerCase().includes('part time') ||
    (employeeType || '').toLowerCase().includes('part-time');
  const annualMultiplier = isPartTime ? 1040 : 2080;

  const getDisplayValue = (entry: WageHistoryEntry) => {
    if (viewMode === 'base_rate') return entry.wage;
    return entry.annual_salary && entry.annual_salary > 0
      ? entry.annual_salary
      : Math.round(entry.wage * annualMultiplier);
  };

  const currentDisplayValue = viewMode === 'base_rate'
    ? currentSalary
    : (annualWage || (currentSalary ? Math.round(currentSalary * annualMultiplier) : undefined));

  // Calculate statistics based on view mode
  const displayValues = sortedHistory.map(h => getDisplayValue(h));
  const minValue = Math.min(...displayValues);
  const maxValue = Math.max(...displayValues);
  const totalIncrease = maxValue - minValue;
  const percentageIncrease = minValue > 0 ? ((maxValue - minValue) / minValue) * 100 : 0;
  const avgAnnualIncrease = sortedHistory.length > 1
    ? sortedHistory.reduce((sum, entry) => sum + (entry.change_percentage || 0), 0) / (sortedHistory.length - 1)
    : 0;

  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: 400,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sortedHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Padding
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Check dark mode
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const lineColor = '#3b82f6';
    const areaColor = isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)';

    // Calculate scales using display values
    const valueRange = maxValue - minValue;
    const valuePadding = valueRange * 0.1 || maxValue * 0.05;
    const minY = minValue - valuePadding;
    const maxY = maxValue + valuePadding;
    const rangeY = maxY - minY;

    const xStep = chartWidth / Math.max(sortedHistory.length - 1, 1);

    // Helper functions
    const getX = (index: number) => padding.left + index * xStep;
    const getY = (value: number) => padding.top + chartHeight - ((value - minY) / rangeY) * chartHeight;

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Horizontal grid lines
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxY - (rangeY / ySteps) * i;
      ctx.fillStyle = textColor;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`$${Math.round(value).toLocaleString()}`, padding.left - 10, y + 4);
    }

    ctx.setLineDash([]);

    // Draw area under the line
    if (sortedHistory.length > 1) {
      ctx.fillStyle = areaColor;
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(displayValues[0]));
      displayValues.forEach((val, index) => {
        ctx.lineTo(getX(index), getY(val));
      });
      ctx.lineTo(getX(sortedHistory.length - 1), padding.top + chartHeight);
      ctx.lineTo(getX(0), padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Draw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    displayValues.forEach((val, index) => {
      const x = getX(index);
      const y = getY(val);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    sortedHistory.forEach((entry, index) => {
      const x = getX(index);
      const y = getY(displayValues[index]);

      // Point
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(x, y, hoveredPoint === index ? 8 : 5, 0, 2 * Math.PI);
      ctx.fill();

      // White border
      ctx.strokeStyle = isDark ? '#1f2937' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Date label (every other point or if hovered)
      if (index % 2 === 0 || hoveredPoint === index || sortedHistory.length <= 6) {
        ctx.fillStyle = textColor;
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        const date = new Date(entry.effective_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        ctx.fillText(dateStr, x, padding.top + chartHeight + 20);
      }
    });

    // Draw title
    ctx.fillStyle = textColor;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    const titleLabel = viewMode === 'annual' ? 'Annual Salary Over Time' : 'Base Rate Over Time';
    ctx.fillText(titleLabel, padding.left, 25);

  }, [sortedHistory, displayValues, dimensions, hoveredPoint, viewMode, minValue, maxValue]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const xStep = chartWidth / Math.max(sortedHistory.length - 1, 1);

    // Find closest point
    let closestIndex = -1;
    let closestDistance = Infinity;

    sortedHistory.forEach((_, index) => {
      const pointX = padding.left + index * xStep;
      const distance = Math.abs(x - pointX);
      if (distance < closestDistance && distance < 20) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setHoveredPoint(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formatValue = (val: number) => {
    if (viewMode === 'annual') {
      return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Salary History
            {employeeName && <span className="text-gray-500 dark:text-gray-400 text-base">- {employeeName}</span>}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Historical salary progression and increases
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('base_rate')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'base_rate'
                  ? 'bg-bifrost-violet text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Base Rate
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'annual'
                  ? 'bg-bifrost-violet text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Annual Salary
            </button>
          </div>
          {currentDisplayValue && (
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {viewMode === 'annual' ? 'Current Annual' : 'Current Rate'}
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatValue(currentDisplayValue)}
                {viewMode === 'base_rate' && <span className="text-sm font-normal">/hr</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Increase</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatValue(totalIncrease)}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {percentageIncrease.toFixed(1)}% growth
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Avg Annual Increase</span>
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {avgAnnualIncrease.toFixed(1)}%
          </div>
          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
            Per salary change
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Salary Changes</span>
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {sortedHistory.length}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Total adjustments
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: '400px' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />

        {/* Tooltip */}
        {hoveredPoint !== null && sortedHistory[hoveredPoint] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-xl pointer-events-none z-10"
            style={{
              left: '50%',
              top: '10px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-sm font-semibold mb-1">
              {new Date(sortedHistory[hoveredPoint].effective_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-2xl font-bold mb-2">
              {formatValue(displayValues[hoveredPoint])}
              {viewMode === 'base_rate' && <span className="text-sm font-normal">/hr</span>}
            </div>
            {viewMode === 'base_rate' && sortedHistory[hoveredPoint].annual_salary ? (
              <div className="text-xs text-gray-300 mb-1">
                Annual: ${sortedHistory[hoveredPoint].annual_salary!.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            ) : viewMode === 'annual' && (
              <div className="text-xs text-gray-300 mb-1">
                Base Rate: ${sortedHistory[hoveredPoint].wage.toLocaleString()}/hr
              </div>
            )}
            {sortedHistory[hoveredPoint].change_reason && (
              <div className="text-xs text-gray-300 mb-1">
                {sortedHistory[hoveredPoint].change_reason}
              </div>
            )}
            {sortedHistory[hoveredPoint].change_percentage !== null && (
              <div className={`text-sm font-semibold flex items-center gap-1 ${
                (sortedHistory[hoveredPoint].change_percentage || 0) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {(sortedHistory[hoveredPoint].change_percentage || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {sortedHistory[hoveredPoint].change_percentage?.toFixed(2)}% change
                {sortedHistory[hoveredPoint].change_amount && (
                  <span className="text-xs">
                    (${sortedHistory[hoveredPoint].change_amount?.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* History Table */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Detailed History
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {viewMode === 'annual' ? 'Annual Salary' : 'Base Rate'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedHistory.map((entry, index) => (
                <tr
                  key={entry.id ?? `entry-${index}`}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    hoveredPoint === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(entry.effective_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatValue(displayValues[index])}
                    {viewMode === 'base_rate' && <span className="text-xs font-normal text-gray-500">/hr</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {entry.change_percentage !== null && entry.change_percentage !== undefined ? (
                      <span className={`flex items-center gap-1 ${
                        entry.change_percentage >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {entry.change_percentage >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {entry.change_percentage.toFixed(2)}%
                        {entry.change_amount && (
                          <span className="text-xs">
                            (${entry.change_amount.toLocaleString()})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Initial</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {entry.change_reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
