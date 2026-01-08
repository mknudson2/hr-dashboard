import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Building2,
  PieChart,
  BarChart3,
  Plus,
  X,
  Settings,
} from "lucide-react";
import { getAnalytics } from "../services/analyticsService";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  endpoint?: string;
}

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "employee_id",
    "first_name",
    "last_name",
    "department",
  ]);
  const [customReportFilters, setCustomReportFilters] = useState({
    status: "",
    department: "",
    location: "",
    wageType: "",
  });

  useEffect(() => {
    getAnalytics().then((data) => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  const availableFields = [
    { id: "employee_id", label: "Employee ID", category: "Basic" },
    { id: "first_name", label: "First Name", category: "Basic" },
    { id: "last_name", label: "Last Name", category: "Basic" },
    { id: "status", label: "Status", category: "Basic" },
    { id: "type", label: "Employee Type (FT/PT)", category: "Basic" },
    { id: "location", label: "Location", category: "Basic" },
    { id: "department", label: "Department", category: "Organization" },
    { id: "cost_center", label: "Cost Center", category: "Organization" },
    { id: "team", label: "Team", category: "Organization" },
    { id: "hire_date", label: "Hire Date", category: "Dates" },
    { id: "termination_date", label: "Termination Date", category: "Dates" },
    { id: "wage", label: "Annual Wage", category: "Compensation" },
    { id: "wage_type", label: "Wage Type (Hourly/Salary)", category: "Compensation" },
    { id: "benefits_cost", label: "Benefits Cost", category: "Compensation" },
    { id: "pto_allotted", label: "PTO Allotted", category: "Benefits" },
    { id: "pto_used", label: "PTO Used", category: "Benefits" },
    { id: "attendance_days", label: "Attendance Days", category: "Benefits" },
  ];

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleGenerateCustomReport = (format: "excel" | "pdf") => {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("view_mode", "compensation");

    // Add filters if set
    if (customReportFilters.status) params.append("status", customReportFilters.status);
    if (customReportFilters.department) params.append("department", customReportFilters.department);
    if (customReportFilters.location) params.append("location", customReportFilters.location);
    if (customReportFilters.wageType) params.append("wage_type", customReportFilters.wageType);

    // For now, export all matching employees (backend will handle filtering)
    const url = `/analytics/employees/export/${format}?${params.toString()}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = `custom_report_${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowCustomReportModal(false);
  };

  const reportCards: ReportCard[] = [
    {
      id: "headcount",
      title: "Headcount Report",
      description: "Current employee count by department, team, and cost center with trend analysis",
      icon: <Users className="w-6 h-6" />,
      category: "workforce",
    },
    {
      id: "turnover",
      title: "Turnover Analysis",
      description: "YTD terminations, turnover rate, voluntary vs involuntary breakdown",
      icon: <TrendingUp className="w-6 h-6" />,
      category: "workforce",
    },
    {
      id: "compensation",
      title: "Compensation Report",
      description: "Salary distribution, wage analysis by department, and compensation trends",
      icon: <DollarSign className="w-6 h-6" />,
      category: "compensation",
    },
    {
      id: "pto",
      title: "PTO Utilization",
      description: "PTO usage rates, remaining balances, and utilization by department",
      icon: <Calendar className="w-6 h-6" />,
      category: "benefits",
    },
    {
      id: "tenure",
      title: "Average Tenure",
      description: "Employee tenure analysis by department, team, and cost center",
      icon: <Building2 className="w-6 h-6" />,
      category: "workforce",
      endpoint: "/analytics/average-tenure",
    },
    {
      id: "demographics",
      title: "Workforce Demographics",
      description: "Employee distribution by location, type (FT/PT), and international breakdown",
      icon: <PieChart className="w-6 h-6" />,
      category: "workforce",
    },
    {
      id: "department",
      title: "Department Breakdown",
      description: "Active employees and YTD terminations by department, team, or cost center",
      icon: <BarChart3 className="w-6 h-6" />,
      category: "workforce",
    },
    {
      id: "custom",
      title: "Custom Report Builder",
      description: "Create a custom report with your choice of fields and filters",
      icon: <Settings className="w-6 h-6" />,
      category: "all",
    },
  ];

  const categories = [
    { id: "all", label: "All Reports" },
    { id: "workforce", label: "Workforce" },
    { id: "compensation", label: "Compensation" },
    { id: "benefits", label: "Benefits" },
  ];

  const filteredReports = selectedCategory === "all"
    ? reportCards
    : reportCards.filter(report => report.category === selectedCategory);

  const handleExportReport = (format: "excel" | "pdf", reportId: string) => {
    // Handle custom report - open modal instead
    if (reportId === "custom") {
      setShowCustomReportModal(true);
      return;
    }

    // Map report IDs to backend endpoints
    const endpointMap: { [key: string]: string | null } = {
      tenure: `/analytics/average-tenure/export/${format}`,
      headcount: `/analytics/employees/export/${format}?view_mode=basic`,
      compensation: `/analytics/employees/export/${format}?view_mode=compensation`,
      department: null, // Coming soon - needs backend implementation
      demographics: format === "pdf" ? `/analytics/location-distribution/pdf` : null, // Only PDF available
      // Note: These need backend endpoints to be implemented
      turnover: null, // Coming soon
      pto: null, // Coming soon
    };

    const endpoint = endpointMap[reportId];

    if (!endpoint) {
      alert(`Export ${reportId} as ${format} - Feature coming soon! This report will be added in the next update.`);
      return;
    }

    const url = `${endpoint}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportId}_report.${format === "excel" ? "xlsx" : "pdf"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Reports & Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate and export comprehensive HR reports
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.total_employees}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.active_employees}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">YTD Hires</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.ytd_hires}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Turnover Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.turnover_rate}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </motion.div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 w-fit">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded transition-colors ${
              selectedCategory === category.id
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {report.description}
                </p>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportReport("excel", report.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => handleExportReport("pdf", report.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Custom Report Builder Modal */}
      <AnimatePresence>
        {showCustomReportModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomReportModal(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      Custom Report Builder
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Select fields and apply filters to create your custom report
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCustomReportModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Field Selection */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Select Fields to Include
                    </h4>

                    {/* Group fields by category */}
                    {["Basic", "Organization", "Dates", "Compensation", "Benefits"].map((category) => (
                      <div key={category} className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {category}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {availableFields
                            .filter((field) => field.category === category)
                            .map((field) => (
                              <label
                                key={field.id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFields.includes(field.id)}
                                  onChange={() => toggleField(field.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {field.label}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Filters */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Apply Filters (Optional)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Status
                        </label>
                        <select
                          value={customReportFilters.status}
                          onChange={(e) =>
                            setCustomReportFilters({ ...customReportFilters, status: e.target.value })
                          }
                          className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Terminated">Terminated</option>
                        </select>
                      </div>

                      {/* Department Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Department
                        </label>
                        <input
                          type="text"
                          value={customReportFilters.department}
                          onChange={(e) =>
                            setCustomReportFilters({ ...customReportFilters, department: e.target.value })
                          }
                          placeholder="Enter department name"
                          className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* Location Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={customReportFilters.location}
                          onChange={(e) =>
                            setCustomReportFilters({ ...customReportFilters, location: e.target.value })
                          }
                          placeholder="Enter location"
                          className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* Wage Type Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Wage Type
                        </label>
                        <select
                          value={customReportFilters.wageType}
                          onChange={(e) =>
                            setCustomReportFilters({ ...customReportFilters, wageType: e.target.value })
                          }
                          className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">All Types</option>
                          <option value="Hourly">Hourly</option>
                          <option value="Salary">Salary</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFields.length} fields selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCustomReportModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleGenerateCustomReport("excel")}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export Excel
                    </button>
                    <button
                      onClick={() => handleGenerateCustomReport("pdf")}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
