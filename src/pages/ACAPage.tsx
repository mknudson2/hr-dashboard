import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Clock, FileText, AlertCircle, CheckCircle, TrendingUp, Calendar, Upload, Download, Plus, X, Edit } from 'lucide-react';

const API_URL = 'http://localhost:8000';

type TabType = 'dashboard' | 'monthly-hours' | 'coverage' | 'forms' | 'alerts';

interface DashboardData {
  year: number;
  total_employees: number;
  full_time_counts_by_month: { [key: string]: number };
  current_measurement_period: any;
  coverage_summary: {
    employees_offered: number;
    employees_accepted: number;
    coverage_rate: number;
  };
  forms_1095c: {
    total: number;
    draft: number;
    ready: number;
    filed: number;
  };
  active_alerts: any[];
}

interface MonthlyHoursRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  year: number;
  month: number;
  hours_worked: number;
  hours_of_service: number;
  is_full_time: boolean;
  employment_status: string;
}

interface CoverageOffer {
  id: number;
  offer_id: string;
  employee_id: string;
  employee_name: string;
  year: number;
  coverage_start_date: string;
  coverage_end_date: string | null;
  offer_of_coverage_code: string;
  employee_monthly_cost: number | null;
  coverage_accepted: boolean;
  is_affordable: boolean;
}

interface Alert {
  id: number;
  alert_id: string;
  alert_type: string;
  severity: string;
  employee_id: string | null;
  employee_name: string | null;
  title: string;
  message: string;
  recommended_action: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Form1095C {
  id: number;
  form_id: string;
  employee_id: string;
  employee_name: string;
  tax_year: number;
  status: string;
  filed_date: string | null;
}

export default function ACAPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Monthly Hours state
  const [monthlyHours, setMonthlyHours] = useState<MonthlyHoursRecord[]>([]);
  const [uploadingHours, setUploadingHours] = useState(false);
  const hoursFileInputRef = useRef<HTMLInputElement>(null);

  // Coverage Offers state
  const [coverageOffers, setCoverageOffers] = useState<CoverageOffer[]>([]);

  // Forms state
  const [forms1095c, setForms1095c] = useState<Form1095C[]>([]);

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedYear, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (activeTab === 'dashboard') {
        const response = await fetch(`${API_URL}/aca/dashboard?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setDashboardData(data);
      } else if (activeTab === 'monthly-hours') {
        const response = await fetch(`${API_URL}/aca/monthly-hours?year=${selectedYear}&month=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setMonthlyHours(data);
      } else if (activeTab === 'coverage') {
        const response = await fetch(`${API_URL}/aca/coverage-offers?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setCoverageOffers(data);
      } else if (activeTab === 'forms') {
        const response = await fetch(`${API_URL}/aca/forms/1095c?tax_year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setForms1095c(data);
      } else if (activeTab === 'alerts') {
        const response = await fetch(`${API_URL}/aca/alerts?status=Active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Error loading ACA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHoursCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingHours(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/aca/monthly-hours/import?year=${selectedYear}&month=${selectedMonth}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✓ Successfully imported hours data\n✓ Created: ${result.records_created}\n✓ Updated: ${result.records_updated}\n${result.errors.length > 0 ? `\n⚠ Errors:\n${result.errors.slice(0, 5).join('\n')}` : ''}`);
        await loadData();
      } else {
        throw new Error(result.detail || 'Failed to import CSV');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to import CSV. Please check the file format and try again.');
    } finally {
      setUploadingHours(false);
      if (hoursFileInputRef.current) {
        hoursFileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadHoursTemplate = () => {
    const csv = `employee_id,hours_worked,hours_of_service,employment_status
EMP001,140,140,Active
EMP002,120,120,Active`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aca_hours_template_${selectedYear}_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await fetch(`${API_URL}/aca/alerts/${alertId}?status=Resolved`, {
        method: 'PATCH'
      });
      await loadData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Failed to resolve alert');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'monthly-hours', label: 'Monthly Hours', icon: Clock },
    { id: 'coverage', label: 'Coverage Offers', icon: Users },
    { id: 'forms', label: 'Forms 1095-C/1094-C', icon: FileText },
    { id: 'alerts', label: 'Compliance Alerts', icon: AlertCircle },
  ];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading && !dashboardData && activeTab === 'dashboard') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading ACA compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ACA Compliance Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {[2023, 2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Track ACA compliance, employee eligibility, coverage offers, and IRS reporting
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData.total_employees}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</h3>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData.coverage_summary.coverage_rate}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Coverage Rate</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.coverage_summary.employees_accepted} of {dashboardData.coverage_summary.employees_offered} offered
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-purple-600" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData.forms_1095c.total}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Forms 1095-C</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.forms_1095c.filed} filed, {dashboardData.forms_1095c.draft} draft
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData.active_alerts.length}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Alerts</h3>
              </motion.div>
            </div>

            {/* Full-Time Employee Count by Month */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Full-Time Employee Count by Month
                </h2>
              </div>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {monthNames.map((month, index) => {
                  const count = dashboardData.full_time_counts_by_month[index + 1] || 0;
                  const isFTE = count >= 50; // ALE threshold
                  return (
                    <div key={month} className={`text-center p-3 rounded-lg ${isFTE ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {month}
                      </div>
                      <div className={`text-lg font-bold ${isFTE ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Green indicates months meeting the ALE (Applicable Large Employer) threshold of 50+ FTE employees
              </p>
            </motion.div>

            {/* Current Measurement Period */}
            {dashboardData.current_measurement_period && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Current Measurement Period
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                      {dashboardData.current_measurement_period.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                      {dashboardData.current_measurement_period.type}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Period</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                      {dashboardData.current_measurement_period.start_date} to {dashboardData.current_measurement_period.end_date}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Active Alerts */}
            {dashboardData.active_alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Recent Compliance Alerts
                  </h2>
                </div>
                <div className="space-y-3">
                  {dashboardData.active_alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.severity === 'Critical'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-600'
                          : alert.severity === 'High'
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-600'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              alert.severity === 'Critical'
                                ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                                : alert.severity === 'High'
                                ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200'
                                : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{alert.type}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {alert.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {alert.message}
                          </p>
                          {alert.employee_id && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              Employee: {alert.employee_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {dashboardData.active_alerts.length > 5 && (
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View all {dashboardData.active_alerts.length} alerts →
                  </button>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* MONTHLY HOURS TAB */}
        {activeTab === 'monthly-hours' && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {monthNames.map((name, index) => (
                        <option key={index} value={index + 1}>{name} {selectedYear}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadHoursTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Template
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploadingHours ? 'Uploading...' : 'Import CSV'}
                    <input
                      ref={hoursFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleHoursCSVUpload}
                      disabled={uploadingHours}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Hours Data Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Monthly Hours for {monthNames[selectedMonth - 1]} {selectedYear}
              </h3>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : monthlyHours.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hours Worked</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hours of Service</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">FT Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {monthlyHours.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{record.employee_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{record.employee_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {record.hours_worked}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {record.hours_of_service}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {record.is_full_time ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                Full-Time
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                Part-Time
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {record.employment_status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    Showing {monthlyHours.length} employees • Full-Time threshold: 130 hours/month
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No hours data for {monthNames[selectedMonth - 1]} {selectedYear}. Import data using the CSV upload button above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* COVERAGE OFFERS TAB */}
        {activeTab === 'coverage' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Coverage Offers for {selectedYear}
              </h3>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : coverageOffers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Coverage Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Offer Code</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monthly Cost</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Affordable</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Accepted</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {coverageOffers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{offer.employee_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{offer.employee_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {offer.coverage_start_date} to {offer.coverage_end_date || 'Present'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {offer.offer_of_coverage_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          ${offer.employee_monthly_cost?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {offer.is_affordable ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {offer.coverage_accepted ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No coverage offers recorded for {selectedYear}
              </div>
            )}
          </div>
        )}

        {/* FORMS TAB */}
        {activeTab === 'forms' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Forms 1095-C for {selectedYear}
              </h3>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : forms1095c.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Form ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tax Year</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Filed Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {forms1095c.map((form) => (
                      <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {form.form_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{form.employee_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{form.employee_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                          {form.tax_year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            form.status === 'Filed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : form.status === 'Ready for Filing'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {form.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {form.filed_date || 'Not filed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No 1095-C forms generated for {selectedYear}
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compliance Alerts
              </h3>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'Critical'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-600'
                        : alert.severity === 'High'
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-600'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            alert.severity === 'Critical'
                              ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                              : alert.severity === 'High'
                              ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200'
                              : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{alert.alert_type}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{alert.alert_id}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {alert.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {alert.message}
                        </p>
                        {alert.recommended_action && (
                          <div className="bg-white dark:bg-gray-700 p-3 rounded mt-2">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Recommended Action:</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{alert.recommended_action}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                          {alert.employee_name && <span>Employee: {alert.employee_name}</span>}
                          {alert.due_date && <span>Due: {alert.due_date}</span>}
                          <span>Created: {new Date(alert.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="ml-4 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No active compliance alerts
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
