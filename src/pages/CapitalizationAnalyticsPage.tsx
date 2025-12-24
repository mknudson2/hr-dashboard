import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Clock,
  PieChart,
  Download,
  Calendar,
  BarChart
} from "lucide-react";

const API_URL = "http://localhost:8000/capitalized-labor";

interface CapitalizationSummary {
  total_hours: number;
  capitalizable_hours: number;
  non_capitalizable_hours: number;
  capitalization_rate: number;
  labor_type_breakdown: {
    direct: number;
    indirect: number;
    overhead: number;
  };
  regular_hours: number;
  overtime_hours: number;
  overtime_rate: number;
}

interface ProjectAnalytics {
  project_id: number;
  project_code: string;
  project_name: string;
  is_capitalizable: boolean;
  total_hours: number;
  capitalizable_hours: number;
  non_capitalizable_hours: number;
  employee_count: number;
  direct_hours: number;
  indirect_hours: number;
  overhead_hours: number;
}

interface EmployeeAnalytics {
  employee_id: number;
  employee_name: string;
  total_hours: number;
  capitalizable_hours: number;
  non_capitalizable_hours: number;
  capitalization_rate: number;
  project_count: number;
}

export default function CapitalizationAnalyticsPage() {
  const [summary, setSummary] = useState<CapitalizationSummary | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics[]>([]);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<EmployeeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const queryString = params.toString();

      const [summaryRes, projectRes, employeeRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary${queryString ? `?${queryString}` : ""}`),
        axios.get(`${API_URL}/analytics/by-project${queryString ? `?${queryString}` : ""}`),
        axios.get(`${API_URL}/analytics/by-employee${queryString ? `?${queryString}` : ""}`)
      ]);

      setSummary(summaryRes.data);
      setProjectAnalytics(projectRes.data);
      setEmployeeAnalytics(employeeRes.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = () => {
    // Generate CSV export
    const headers = [
      "Report Type: Capitalized Labor Analysis",
      `Date Range: ${startDate || "All Time"} to ${endDate || "Present"}`,
      "",
      "SUMMARY",
      `Total Hours: ${summary?.total_hours.toFixed(2)}`,
      `Capitalizable Hours: ${summary?.capitalizable_hours.toFixed(2)}`,
      `Non-Capitalizable Hours: ${summary?.non_capitalizable_hours.toFixed(2)}`,
      `Capitalization Rate: ${summary?.capitalization_rate.toFixed(2)}%`,
      "",
      "PROJECT BREAKDOWN",
      "Project Code,Project Name,Total Hours,Capitalizable Hours,Non-Capitalizable Hours,Employee Count"
    ];

    const projectRows = projectAnalytics.map(p =>
      `${p.project_code},${p.project_name},${p.total_hours.toFixed(2)},${p.capitalizable_hours.toFixed(2)},${p.non_capitalizable_hours.toFixed(2)},${p.employee_count}`
    );

    const employeeSection = [
      "",
      "EMPLOYEE BREAKDOWN",
      "Employee Name,Total Hours,Capitalizable Hours,Non-Capitalizable Hours,Capitalization Rate,Project Count"
    ];

    const employeeRows = employeeAnalytics.map(e =>
      `${e.employee_name},${e.total_hours.toFixed(2)},${e.capitalizable_hours.toFixed(2)},${e.non_capitalizable_hours.toFixed(2)},${e.capitalization_rate.toFixed(2)}%,${e.project_count}`
    );

    const csv = [...headers, ...projectRows, ...employeeSection, ...employeeRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capitalization_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500 dark:text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BarChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Capitalization Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive analysis of capitalized vs. non-capitalized labor
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Report
        </motion.button>
      </div>

      {/* Date Range Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range Filter</h3>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchAnalytics}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors"
          >
            Apply Filters
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setStartDate("");
              setEndDate("");
              fetchAnalytics();
            }}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg shadow-md transition-colors"
          >
            Clear
          </motion.button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium text-lg">Total Hours</span>
            </div>
            <div className="text-3xl font-semibold text-gray-900 dark:text-white">{summary.total_hours.toFixed(2)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Regular: {summary.regular_hours.toFixed(2)} | OT: {summary.overtime_hours.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium text-lg">Capitalizable Hours</span>
            </div>
            <div className="text-3xl font-semibold text-green-600 dark:text-green-400">
              {summary.capitalizable_hours.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {summary.capitalization_rate.toFixed(2)}% of total
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium text-lg">Non-Capitalizable Hours</span>
            </div>
            <div className="text-3xl font-semibold text-gray-900 dark:text-white">
              {summary.non_capitalizable_hours.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {(100 - summary.capitalization_rate).toFixed(2)}% of total
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <PieChart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium text-lg">Overtime Rate</span>
            </div>
            <div className="text-3xl font-semibold text-orange-600 dark:text-orange-400">
              {summary.overtime_rate.toFixed(2)}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {summary.overtime_hours.toFixed(2)} OT hours
            </p>
          </motion.div>
        </div>
      )}

      {/* Labor Type Breakdown */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Labor Type Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Direct Labor</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {summary.labor_type_breakdown.direct.toFixed(2)} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(summary.labor_type_breakdown.direct / summary.total_hours) * 100}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Indirect Labor</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {summary.labor_type_breakdown.indirect.toFixed(2)} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(summary.labor_type_breakdown.indirect / summary.total_hours) * 100}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overhead Labor</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {summary.labor_type_breakdown.overhead.toFixed(2)} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(summary.labor_type_breakdown.overhead / summary.total_hours) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Analytics Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project-Level Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Project Code</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Project Name</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Hours</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Capitalizable</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Non-Cap</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Direct</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Indirect</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Overhead</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Employees</th>
              </tr>
            </thead>
            <tbody>
              {projectAnalytics.map((project) => (
                <tr key={project.project_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-2 font-mono text-sm text-gray-900 dark:text-white">{project.project_code}</td>
                  <td className="p-2 text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {project.project_name}
                      {project.is_capitalizable && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                          Capitalizable
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                    {project.total_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-green-600 dark:text-green-400">
                    {project.capitalizable_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                    {project.non_capitalizable_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-blue-600 dark:text-blue-400">
                    {project.direct_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-green-600 dark:text-green-400">
                    {project.indirect_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-orange-600 dark:text-orange-400">
                    {project.overhead_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-gray-900 dark:text-white">{project.employee_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Analytics Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employee-Level Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Employee Name</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Hours</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Capitalizable Hours</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Non-Cap Hours</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Rate</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Projects</th>
              </tr>
            </thead>
            <tbody>
              {employeeAnalytics.map((employee) => (
                <tr key={employee.employee_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-2 font-medium text-gray-900 dark:text-white">{employee.employee_name}</td>
                  <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                    {employee.total_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-green-600 dark:text-green-400">
                    {employee.capitalizable_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                    {employee.non_capitalizable_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        employee.capitalization_rate >= 50
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : employee.capitalization_rate >= 25
                          ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {employee.capitalization_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-2 text-right text-gray-900 dark:text-white">{employee.project_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
