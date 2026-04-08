import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, Download, Upload, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = '';

interface OvertimeSummary {
  cost_center: string;
  total_hours: number;
  total_cost: number;
  employee_count: number;
}

interface EmployeeOvertimeSummary {
  employee_id: string;
  employee_name: string;
  department: string | null;
  team: string | null;
  cost_center: string;
  pay_periods_with_ot: number;
  total_pay_periods: number;
  pct_pay_periods: number;
  ytd_hours: number;
  ytd_cost: number;
  avg_cost_per_period: number;
}

const OvertimePage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OvertimeSummary[]>([]);
  const [overallStats, setOverallStats] = useState({ total_hours: 0, total_cost: 0, cost_center_count: 0 });
  const [employees, setEmployees] = useState<EmployeeOvertimeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ records_created?: number; errors?: string[] } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      // Fetch summary
      const summaryResponse = await fetch(`${API_URL}/pto/summary?${params}`, { credentials: 'include' });
      const summaryData = await summaryResponse.json();
      setSummary(summaryData.summary_by_cost_center || []);
      setOverallStats(summaryData.overall || { total_hours: 0, total_cost: 0, cost_center_count: 0 });

      // Fetch per-employee aggregated summary
      const empResponse = await fetch(`${API_URL}/pto/employee-summary?${params}`, { credentials: 'include' });
      const empData = await empResponse.json();
      setEmployees(empData.employees || []);
    } catch (error) {
      console.error('Error fetching overtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`${API_URL}/pto/export?${params}`, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      a.download = `YTD Overtime Report - ${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCostCenter('');
    setSelectedDepartment('');
    setSelectedTeam('');
    setEmployeeSearch('');
    fetchData();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('imported_by', user?.full_name || 'Unknown User');

      const response = await fetch(`${API_URL}/pto/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const result = await response.json();
      setUploadResult(result);

      // Refresh data
      await fetchData();

      // Show success for a few seconds then close
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadResult(null);
      }, 5000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        message: error instanceof Error ? error.message : 'Upload failed',
        error: true
      });
    } finally {
      setUploading(false);
    }
  };

  // Derive unique filter options from employees
  const departmentOptions = Array.from(
    new Set(employees.map(e => e.department).filter((d): d is string => !!d))
  ).sort();
  const teamOptions = Array.from(
    new Set(employees.map(e => e.team).filter((t): t is string => !!t))
  ).sort();

  const filteredEmployees = employees.filter(e => {
    if (selectedCostCenter && e.cost_center !== selectedCostCenter) return false;
    if (selectedDepartment && e.department !== selectedDepartment) return false;
    if (selectedTeam && e.team !== selectedTeam) return false;
    if (employeeSearch.trim() && !e.employee_name.toLowerCase().includes(employeeSearch.trim().toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading overtime data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Overtime Tracking & Reporting
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Year-to-date overtime costs by employee, cost center, and team
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload Data
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Date Range
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export Report
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Overtime Hours</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {overallStats.total_hours.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Overtime Cost</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${overallStats.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cost Centers</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {overallStats.cost_center_count}
            </p>
          </motion.div>
        </div>

        {/* Cost Center Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Summary by Cost Center</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cost Center</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Hours</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Cost</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Employees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {summary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {item.cost_center}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                      {item.total_hours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                      ${item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                      {item.employee_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Detailed Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detailed Records</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing {filteredEmployees.length} of {employees.length} employee(s)
                </p>
              </div>
              {(selectedCostCenter || selectedDepartment || selectedTeam || employeeSearch.trim()) && (
                <button
                  onClick={() => {
                    setSelectedCostCenter('');
                    setSelectedDepartment('');
                    setSelectedTeam('');
                    setEmployeeSearch('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Cost Center
                </label>
                <select
                  value={selectedCostCenter}
                  onChange={(e) => setSelectedCostCenter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Cost Centers</option>
                  {summary.map(s => (
                    <option key={s.cost_center} value={s.cost_center}>{s.cost_center}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Teams</option>
                  {teamOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Employee
                </label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Team</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cost Center</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">% of Pay Periods</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">YTD Hours</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Avg Cost / Period</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">YTD Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No overtime records found. Import data to get started.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {emp.employee_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {emp.department || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {emp.team || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {emp.cost_center}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        {emp.pct_pay_periods.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        {emp.ytd_hours.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        ${emp.avg_cost_per_period.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        ${emp.ytd_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Upload Overtime Data
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!uploadResult ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Upload an OT Earnings Excel file (.xlsx or .xls). The system will automatically:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                    <li>Extract employee overtime hours and costs</li>
                    <li>Match employees to cost centers from your database</li>
                    <li>Create or update overtime records by pay period</li>
                    <li>Track import history</li>
                  </ul>

                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Choose file
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      or drag and drop
                    </p>
                  </div>

                  {uploading && (
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">Processing file...</span>
                    </div>
                  )}
                </>
              ) : (
                <div className={`p-4 rounded-lg ${uploadResult.error ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                  <h3 className={`font-semibold mb-2 ${uploadResult.error ? 'text-red-900 dark:text-red-200' : 'text-green-900 dark:text-green-200'}`}>
                    {uploadResult.error ? 'Upload Failed' : 'Upload Successful!'}
                  </h3>
                  {!uploadResult.error && (
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p>✓ Records created: {uploadResult.records_created}</p>
                      <p>✓ Records updated: {uploadResult.records_updated}</p>
                      {uploadResult.records_skipped > 0 && (
                        <p className="text-yellow-700 dark:text-yellow-300">
                          ⚠ Records skipped: {uploadResult.records_skipped}
                        </p>
                      )}
                      <p>Date range: {uploadResult.date_range?.start} to {uploadResult.date_range?.end}</p>
                      {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-yellow-700 dark:text-yellow-300">Warnings:</p>
                          <ul className="list-disc list-inside text-xs mt-1">
                            {uploadResult.errors.map((err: string, idx: number) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {uploadResult.error && (
                    <p className="text-red-700 dark:text-red-300">{uploadResult.message}</p>
                  )}
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadResult(null);
                    }}
                    className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OvertimePage;
