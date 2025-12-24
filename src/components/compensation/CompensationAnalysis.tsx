import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, DollarSign, Target, AlertCircle, Award, ArrowUpDown, Building2, Globe } from 'lucide-react';

interface Employee {
  employee_id: string;
  name: string;
  department: string;
  position?: string;
  annual_wage?: number;
  total_compensation?: number;
  normalized_annual_wage?: number;
  normalized_hourly_wage?: number;
  normalized_total_compensation?: number;
  employee_type_category?: string;
  wage_type_category?: string;
  type?: string;
  wage_type?: string;
}

interface MarketBenchmark {
  id: number;
  job_title: string;
  job_family: string;
  location: string;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  data_source: string;
  survey_year: number;
}

interface CompensationAnalysisProps {
  employees: Employee[];
}

export default function CompensationAnalysis({ employees }: CompensationAnalysisProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('All');
  const [wageTypeFilter, setWageTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'salary' | 'total_comp' | 'normalized_salary'>('normalized_salary');
  const [showOutliers, setShowOutliers] = useState(true);
  const [marketBenchmarks, setMarketBenchmarks] = useState<MarketBenchmark[]>([]);
  const [showMarketComparison, setShowMarketComparison] = useState(true);

  // Fetch market benchmarks
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('http://localhost:8000/market-data/benchmarks');
        if (response.ok) {
          const data = await response.json();
          setMarketBenchmarks(data);
        }
      } catch (error) {
        console.error('Failed to fetch market benchmarks:', error);
      }
    };

    fetchMarketData();
  }, []);

  // Calculate department statistics
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  const getDepartmentStats = (dept: string) => {
    let deptEmployees = dept === 'All'
      ? employees
      : employees.filter(e => e.department === dept);

    // Apply employee type filter
    if (employeeTypeFilter !== 'All') {
      deptEmployees = deptEmployees.filter(e =>
        e.employee_type_category === employeeTypeFilter ||
        (e.type && e.type.toLowerCase().includes(employeeTypeFilter.toLowerCase()))
      );
    }

    // Apply wage type filter
    if (wageTypeFilter !== 'All') {
      deptEmployees = deptEmployees.filter(e =>
        e.wage_type_category === wageTypeFilter ||
        (e.wage_type && e.wage_type.toLowerCase() === wageTypeFilter.toLowerCase())
      );
    }

    // Use normalized wages for fair comparison across all employee types
    const salaries = deptEmployees
      .map(e => e.normalized_annual_wage || e.annual_wage || 0)
      .filter(s => s > 0)
      .sort((a, b) => a - b);

    if (salaries.length === 0) return null;

    const avg = salaries.reduce((sum, s) => sum + s, 0) / salaries.length;
    const median = salaries[Math.floor(salaries.length / 2)];
    const min = Math.min(...salaries);
    const max = Math.max(...salaries);
    const range = max - min;

    // Calculate percentiles
    const p25 = salaries[Math.floor(salaries.length * 0.25)];
    const p75 = salaries[Math.floor(salaries.length * 0.75)];
    const iqr = p75 - p25;

    // Identify outliers (below Q1 - 1.5*IQR or above Q3 + 1.5*IQR)
    const lowerBound = p25 - 1.5 * iqr;
    const upperBound = p75 + 1.5 * iqr;
    const outliers = deptEmployees.filter(e => {
      const normalizedWage = e.normalized_annual_wage || e.annual_wage || 0;
      return normalizedWage < lowerBound || normalizedWage > upperBound;
    });

    return {
      count: deptEmployees.length,
      avg,
      median,
      min,
      max,
      range,
      p25,
      p75,
      iqr,
      outliers,
      employees: deptEmployees,
    };
  };

  const stats = getDepartmentStats(selectedDepartment);

  // Pay equity analysis
  const calculatePayEquity = () => {
    if (!stats) return null;

    const compressionRatio = stats.max / stats.min;
    const spreadRatio = (stats.range / stats.median) * 100;

    return {
      compressionRatio,
      spreadRatio,
      equityScore: compressionRatio < 2.5 && spreadRatio < 80 ? 'Good' :
                    compressionRatio < 4 && spreadRatio < 120 ? 'Fair' : 'Needs Attention',
    };
  };

  const equity = calculatePayEquity();

  // Compensation distribution
  const getDistribution = () => {
    if (!stats) return [];

    const bucketSize = Math.ceil(stats.range / 5);
    const buckets = Array.from({ length: 5 }, (_, i) => ({
      min: stats.min + i * bucketSize,
      max: stats.min + (i + 1) * bucketSize,
      count: 0,
      percentage: 0,
    }));

    stats.employees.forEach(emp => {
      const salary = emp.annual_wage || 0;
      const bucketIndex = Math.min(
        Math.floor((salary - stats.min) / bucketSize),
        4
      );
      if (bucketIndex >= 0 && bucketIndex < 5) {
        buckets[bucketIndex].count++;
      }
    });

    buckets.forEach(bucket => {
      bucket.percentage = (bucket.count / stats.employees.length) * 100;
    });

    return buckets;
  };

  const distribution = getDistribution();

  // Internal positioning (within company)
  const getInternalPosition = (salary: number) => {
    if (!stats) return 'Unknown';

    const position = ((salary - stats.min) / stats.range) * 100;

    if (position < 25) return 'Bottom Quartile';
    if (position < 50) return 'Below Average';
    if (position < 75) return 'Above Average';
    return 'Top Quartile';
  };

  // External market positioning
  const getExternalMarketPosition = (employee: Employee) => {
    const salary = employee.normalized_annual_wage || employee.annual_wage || 0;
    if (!employee.position || !salary) return null;

    // Try to find matching benchmark
    const matchingBenchmark = marketBenchmarks.find(b => {
      const titleMatch = employee.position?.toLowerCase().includes(b.job_title.toLowerCase()) ||
                        b.job_title.toLowerCase().includes(employee.position?.toLowerCase() || '');
      return titleMatch;
    });

    if (!matchingBenchmark) return null;

    if (salary < matchingBenchmark.percentile_25) {
      return {
        position: 'Below Market',
        percentile: '<25th',
        color: 'red',
        benchmark: matchingBenchmark
      };
    } else if (salary < matchingBenchmark.percentile_50) {
      return {
        position: 'At Market (Low)',
        percentile: '25-50th',
        color: 'yellow',
        benchmark: matchingBenchmark
      };
    } else if (salary < matchingBenchmark.percentile_75) {
      return {
        position: 'At Market',
        percentile: '50-75th',
        color: 'green',
        benchmark: matchingBenchmark
      };
    } else {
      return {
        position: 'Above Market',
        percentile: '>75th',
        color: 'blue',
        benchmark: matchingBenchmark
      };
    }
  };

  // Sorted employees
  const sortedEmployees = stats ? [...stats.employees].sort((a, b) => {
    let aValue, bValue;
    if (sortBy === 'normalized_salary') {
      aValue = a.normalized_annual_wage || a.annual_wage || 0;
      bValue = b.normalized_annual_wage || b.annual_wage || 0;
    } else if (sortBy === 'salary') {
      aValue = a.annual_wage || 0;
      bValue = b.annual_wage || 0;
    } else {
      aValue = a.normalized_total_compensation || a.total_compensation || 0;
      bValue = b.normalized_total_compensation || b.total_compensation || 0;
    }
    return bValue - aValue;
  }) : [];

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <p className="text-gray-600 dark:text-gray-400">No compensation data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee Type
            </label>
            <select
              value={employeeTypeFilter}
              onChange={(e) => setEmployeeTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="All">All Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wage Type
            </label>
            <select
              value={wageTypeFilter}
              onChange={(e) => setWageTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="All">All</option>
              <option value="Salary">Salary</option>
              <option value="Hourly">Hourly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'salary' | 'total_comp' | 'normalized_salary')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="normalized_salary">Normalized Salary</option>
              <option value="salary">Base Salary (Raw)</option>
              <option value="total_comp">Total Compensation</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="showOutliers"
              checked={showOutliers}
              onChange={(e) => setShowOutliers(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showOutliers" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Highlight Outliers
            </label>
          </div>
        </div>

        {/* Active filters display */}
        {(employeeTypeFilter !== 'All' || wageTypeFilter !== 'All') && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            {employeeTypeFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                {employeeTypeFilter}
                <button
                  onClick={() => setEmployeeTypeFilter('All')}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            )}
            {wageTypeFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                {wageTypeFilter}
                <button
                  onClick={() => setWageTypeFilter('All')}
                  className="hover:text-green-900 dark:hover:text-green-100"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setEmployeeTypeFilter('All');
                setWageTypeFilter('All');
              }}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Comparison Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Dual Compensation Analysis
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Internal Position:</strong> Compares employees within your company. Shows if someone is in the top/bottom quartile relative to peers in the same department.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>External Market:</strong> Compares to external market data from salary surveys. Shows if salaries are competitive vs. the broader market (when benchmark data is available).
                </div>
              </div>
            </div>
            {marketBenchmarks.length > 0 && (
              <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                ✓ {marketBenchmarks.length} market benchmarks loaded from {marketBenchmarks[0]?.data_source || 'salary surveys'}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Employees</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.count}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {selectedDepartment === 'All' ? 'Total' : selectedDepartment}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Median Salary</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${Math.round(stats.median).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Avg: ${Math.round(stats.avg).toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Salary Range</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${Math.round(stats.range).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            ${Math.round(stats.min).toLocaleString()} - ${Math.round(stats.max).toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Outliers</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.outliers.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {((stats.outliers.length / stats.count) * 100).toFixed(1)}% of total
          </div>
        </motion.div>
      </div>

      {/* Pay Equity Score */}
      {equity && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Pay Equity Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Compression Ratio</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {equity.compressionRatio.toFixed(2)}:1
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Max / Min salary ratio
              </div>
              <div className={`mt-2 text-xs ${
                equity.compressionRatio < 2.5 ? 'text-green-600 dark:text-green-400' :
                equity.compressionRatio < 4 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {equity.compressionRatio < 2.5 ? '✓ Good compression' :
                 equity.compressionRatio < 4 ? '⚠ Moderate compression' :
                 '⚠ High compression'}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Salary Spread</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {equity.spreadRatio.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Range / Median ratio
              </div>
              <div className={`mt-2 text-xs ${
                equity.spreadRatio < 80 ? 'text-green-600 dark:text-green-400' :
                equity.spreadRatio < 120 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {equity.spreadRatio < 80 ? '✓ Narrow spread' :
                 equity.spreadRatio < 120 ? '⚠ Moderate spread' :
                 '⚠ Wide spread'}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Score</div>
              <div className={`text-2xl font-bold ${
                equity.equityScore === 'Good' ? 'text-green-600 dark:text-green-400' :
                equity.equityScore === 'Fair' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {equity.equityScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Pay equity rating
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {equity.equityScore === 'Good' ? 'Compensation is well-balanced' :
                 equity.equityScore === 'Fair' ? 'Some adjustment may be needed' :
                 'Consider reviewing pay structure'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Salary Distribution
        </h3>
        <div className="space-y-3">
          {distribution.map((bucket, index) => (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  ${Math.round(bucket.min).toLocaleString()} - ${Math.round(bucket.max).toLocaleString()}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {bucket.count} ({bucket.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${bucket.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Detailed Employee List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Detailed Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Normalized Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Internal Position
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    External Market
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  vs Median
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedEmployees.slice(0, 20).map((emp, index) => {
                const normalizedSalary = emp.normalized_annual_wage || emp.annual_wage || 0;
                const isOutlier = showOutliers && stats.outliers.some(o => o.employee_id === emp.employee_id);
                const vsMedian = ((normalizedSalary - stats.median) / stats.median) * 100;
                const externalPosition = getExternalMarketPosition(emp);

                // Determine employee and wage type display
                const empType = emp.employee_type_category || emp.type || '-';
                const wageType = emp.wage_type_category || emp.wage_type || '-';

                return (
                  <tr
                    key={emp.employee_id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      isOutlier ? 'bg-orange-50 dark:bg-orange-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {emp.name}
                      {isOutlier && (
                        <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                          ⚠ Outlier
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {emp.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {emp.position || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          empType.includes('Full') || empType === 'FT'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        }`}>
                          {empType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          wageType === 'Salary'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                        }`}>
                          {wageType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${normalizedSalary.toLocaleString()}
                      </div>
                      {emp.normalized_hourly_wage && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ${emp.normalized_hourly_wage.toFixed(2)}/hr
                        </div>
                      )}
                    </td>
                    {/* Internal Position */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        getInternalPosition(normalizedSalary) === 'Bottom Quartile'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : getInternalPosition(normalizedSalary) === 'Top Quartile'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {getInternalPosition(normalizedSalary)}
                      </span>
                    </td>
                    {/* External Market Position */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {externalPosition ? (
                        <div className="space-y-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            externalPosition.color === 'red'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : externalPosition.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : externalPosition.color === 'green'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {externalPosition.position}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {externalPosition.percentile} percentile
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          No market data
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`flex items-center gap-1 ${
                        vsMedian >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {vsMedian >= 0 ? '+' : ''}{vsMedian.toFixed(1)}%
                        {vsMedian >= 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedEmployees.length > 20 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
            Showing top 20 of {sortedEmployees.length} employees
          </div>
        )}
      </motion.div>
    </div>
  );
}
