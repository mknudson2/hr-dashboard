import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckSquare,
  TrendingUp,
  Plus,
  Save,
  Send,
  Calendar,
  Download,
  BarChart,
  BarChart3,
  DollarSign,
  PieChart,
  X,
  Settings,
  Upload,
  Users,
  User,
  Activity,
  Building2,
  Briefcase,
  FileText,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  Calculator,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  History
} from "lucide-react";

const API_URL = "http://localhost:8000/capitalized-labor";
const ADMIN_API_URL = "http://localhost:8000/capitalized-labor/admin";

// ==================== INTERFACES ====================

interface Project {
  id: number;
  project_code: string;
  project_name: string;
  is_capitalizable: boolean;
  capitalization_type: string | null;
  status: string;
}

interface TimeEntry {
  id?: number;
  project_id: number;
  work_date: string;
  hours: number;
  labor_type: string;
  is_overtime: boolean;
  task_description: string;
  project_name?: string;
  is_capitalizable?: boolean;
}

interface Timesheet {
  id: number;
  employee_id: number;
  employee_name: string;
  pay_period_id: number;
  pay_period_start: string;
  pay_period_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  status: string;
  submitted_at: string | null;
  time_entries?: TimeEntry[];
}

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

// ==================== ADMIN INTERFACES ====================

interface CapitalizationPeriod {
  id: number;
  period_id: string;
  period_type: "monthly" | "quarterly" | "annual";
  year: number;
  month?: number;
  quarter?: number;
  start_date: string;
  end_date: string;
  status: "open" | "in_review" | "approved" | "locked" | "closed";
  locked_at?: string;
  locked_by_id?: number;
  submitted_at?: string;
  approved_at?: string;
  total_hours?: number;
  total_capitalizable_hours?: number;
  total_labor_cost?: number;
  total_capitalized_cost?: number;
}

interface LaborRate {
  id: number;
  employee_id: number;
  employee_name?: string;
  effective_date: string;
  end_date?: string;
  hourly_rate: number;
  overtime_multiplier: number;
  benefits_hourly?: number;
  benefits_percentage?: number;
  employer_taxes_hourly?: number;
  employer_taxes_percentage?: number;
  overhead_rate_hourly?: number;
  overhead_rate_percentage?: number;
  fully_burdened_rate: number;
  rate_source: string;
  is_locked: boolean;
}

interface LaborDataImport {
  id: number;
  import_type: string;
  file_name: string;
  original_file_name: string;
  start_date: string;
  end_date: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  warning_records: number;
  validation_status: string;
  status: string;
  created_at: string;
  created_by_id?: number;
}

interface AdminCompanySummary {
  period_id: string;
  period_type: string;
  start_date: string;
  end_date: string;
  total_employees: number;
  total_projects: number;
  total_hours: number;
  capitalizable_hours: number;
  non_capitalizable_hours: number;
  capitalization_rate: number;
  total_labor_cost: number;
  total_capitalized_cost: number;
  labor_type_breakdown: {
    direct_hours: number;
    indirect_hours: number;
    overhead_hours: number;
    direct_cost: number;
    indirect_cost: number;
    overhead_cost: number;
  };
  period_status: string;
}

interface AdminEmployeeAnalytics {
  employee_id: number;
  employee_name: string;
  department?: string;
  total_hours: number;
  capitalizable_hours: number;
  non_capitalizable_hours: number;
  capitalization_rate: number;
  fully_burdened_rate?: number;
  total_cost: number;
  capitalized_cost: number;
  project_count: number;
  labor_type_breakdown: {
    direct_hours: number;
    indirect_hours: number;
    overhead_hours: number;
  };
}

interface AdminProjectAnalytics {
  project_id: number;
  project_code: string;
  project_name: string;
  is_capitalizable: boolean;
  capitalization_type?: string;
  total_hours: number;
  capitalizable_hours: number;
  total_cost: number;
  capitalized_cost: number;
  employee_count: number;
  labor_type_breakdown: {
    direct_hours: number;
    indirect_hours: number;
    overhead_hours: number;
  };
}

interface EmployeeHistory {
  employee_id: number;
  employee_name: string;
  department?: string;
  current_rate?: LaborRate;
  period_summaries: Array<{
    period_id: string;
    period_type: string;
    year: number;
    month?: number;
    quarter?: number;
    total_hours: number;
    capitalizable_hours: number;
    non_capitalizable_hours: number;
    capitalization_rate: number;
    total_cost: number;
    capitalized_cost: number;
  }>;
  project_breakdown: Array<{
    project_id: number;
    project_code: string;
    project_name: string;
    total_hours: number;
    capitalizable_hours: number;
    total_cost: number;
  }>;
  labor_type_totals: {
    direct_hours: number;
    indirect_hours: number;
    overhead_hours: number;
  };
}

interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  reason?: string;
  user_id: number;
  timestamp: string;
}

// ==================== MAIN COMPONENT ====================

type ViewMode = "employee" | "admin";
type EmployeeTab = "tracking" | "approval" | "analytics";
type AdminTab = "dashboard" | "data" | "analytics" | "periods" | "reports";

export default function CapitalizedLaborPage() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("capitalizedLaborViewMode");
    return (saved as ViewMode) || "employee";
  });
  const [activeEmployeeTab, setActiveEmployeeTab] = useState<EmployeeTab>("tracking");
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("dashboard");

  // Persist view mode preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("capitalizedLaborViewMode", mode);
  };

  const employeeTabs = [
    { id: "tracking" as const, label: "Time Tracking", icon: Clock },
    { id: "approval" as const, label: "Timesheet Approval", icon: CheckSquare },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUp },
  ];

  const adminTabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart },
    { id: "data" as const, label: "Data Management", icon: Upload },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUp },
    { id: "periods" as const, label: "Period Management", icon: Calendar },
    { id: "reports" as const, label: "Reports & Export", icon: FileText },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Capitalized Labor Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {viewMode === "employee"
                ? "Track time, approve timesheets, and analyze labor capitalization"
                : "Admin view: Manage data, rates, periods, and generate reports"}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => handleViewModeChange("employee")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === "employee"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Employee/Manager
          </button>
          <button
            onClick={() => handleViewModeChange("admin")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === "admin"
                ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            Admin/HR
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          {viewMode === "employee" ? (
            employeeTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveEmployeeTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
                    activeEmployeeTab === tab.id
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })
          ) : (
            adminTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
                    activeAdminTab === tab.id
                      ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          {viewMode === "employee" ? (
            <motion.div
              key="employee-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeEmployeeTab === "tracking" && <TimeTrackingTab />}
              {activeEmployeeTab === "approval" && <TimesheetApprovalTab />}
              {activeEmployeeTab === "analytics" && <AnalyticsTab />}
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeAdminTab === "dashboard" && <AdminDashboardTab />}
              {activeAdminTab === "data" && <DataManagementTab />}
              {activeAdminTab === "analytics" && <AdminAnalyticsTab />}
              {activeAdminTab === "periods" && <PeriodManagementTab />}
              {activeAdminTab === "reports" && <ReportsExportTab />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==================== TIME TRACKING TAB ====================

function TimeTrackingTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [newEntry, setNewEntry] = useState<TimeEntry>({
    project_id: 0,
    work_date: new Date().toISOString().split("T")[0],
    hours: 0,
    labor_type: "direct",
    is_overtime: false,
    task_description: "",
  });

  const currentEmployeeId = 1; // In real app, get from auth context

  useEffect(() => {
    fetchProjects();
    fetchCurrentTimesheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects?status=active`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchCurrentTimesheet = async () => {
    try {
      const response = await axios.get(`${API_URL}/timesheets/current?employee_id=${currentEmployeeId}`);
      setCurrentTimesheet(response.data);
      if (response.data?.time_entries) {
        setTimeEntries(response.data.time_entries);
      }
    } catch (error) {
      console.error("Error fetching timesheet:", error);
    }
  };

  const handleAddEntry = async () => {
    try {
      await axios.post(`${API_URL}/time-entries?employee_id=${currentEmployeeId}`, newEntry);
      await fetchCurrentTimesheet();
      setNewEntry({
        project_id: 0,
        work_date: new Date().toISOString().split("T")[0],
        hours: 0,
        labor_type: "direct",
        is_overtime: false,
        task_description: "",
      });
    } catch (error) {
      console.error("Error adding time entry:", error);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!currentTimesheet) return;
    try {
      await axios.post(`${API_URL}/timesheets/${currentTimesheet.id}/submit`);
      await fetchCurrentTimesheet();
    } catch (error) {
      console.error("Error submitting timesheet:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Timesheet Summary */}
      {currentTimesheet && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Pay Period</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentTimesheet.pay_period_start} to {currentTimesheet.pay_period_end}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentTimesheet.status === "submitted"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  : currentTimesheet.status === "approved"
                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              {currentTimesheet.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentTimesheet.total_hours.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Regular Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentTimesheet.regular_hours.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overtime Hours</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {currentTimesheet.overtime_hours.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Time Entry Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Time Entry
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Project</label>
            <select
              value={newEntry.project_id}
              onChange={(e) => setNewEntry({ ...newEntry, project_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={0}>Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.project_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
            <input
              type="date"
              value={newEntry.work_date}
              onChange={(e) => setNewEntry({ ...newEntry, work_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Hours</label>
            <input
              type="number"
              step="0.25"
              value={newEntry.hours}
              onChange={(e) => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Labor Type</label>
            <select
              value={newEntry.labor_type}
              onChange={(e) => setNewEntry({ ...newEntry, labor_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="direct">Direct</option>
              <option value="indirect">Indirect</option>
              <option value="overhead">Overhead</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Overtime</label>
            <select
              value={newEntry.is_overtime ? "true" : "false"}
              onChange={(e) => setNewEntry({ ...newEntry, is_overtime: e.target.value === "true" })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Task Description</label>
            <input
              type="text"
              value={newEntry.task_description}
              onChange={(e) => setNewEntry({ ...newEntry, task_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Brief description"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddEntry}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Save className="w-4 h-4" />
            Add Entry
          </motion.button>
          {currentTimesheet && currentTimesheet.status === "draft" && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmitTimesheet}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <Send className="w-4 h-4" />
              Submit Timesheet
            </motion.button>
          )}
        </div>
      </div>

      {/* Time Entries List */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Project</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Task</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300">Hours</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-center p-2 text-gray-700 dark:text-gray-300">Capitalizable</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-2 text-gray-900 dark:text-white">{entry.work_date}</td>
                  <td className="p-2 text-gray-900 dark:text-white">{entry.project_name}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-400">{entry.task_description}</td>
                  <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                    {entry.hours.toFixed(2)}
                  </td>
                  <td className="p-2">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {entry.labor_type}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {entry.is_capitalizable ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== TIMESHEET APPROVAL TAB ====================

function TimesheetApprovalTab() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("submitted");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const currentManagerId = 1; // In real app, get from auth context

  useEffect(() => {
    fetchTimesheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchTimesheets = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/timesheets/pending-approval?manager_id=${currentManagerId}&status=${filterStatus}`
      );
      setTimesheets(response.data);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
    }
  };

  const handleApprove = async (timesheetId: number) => {
    try {
      await axios.post(`${API_URL}/timesheets/${timesheetId}/approve?manager_id=${currentManagerId}`);
      await fetchTimesheets();
      setSelectedTimesheet(null);
    } catch (error) {
      console.error("Error approving timesheet:", error);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedTimesheet) return;
    try {
      await axios.post(
        `${API_URL}/timesheets/${selectedTimesheet.id}/reject?manager_id=${currentManagerId}`,
        { rejection_reason: rejectionReason }
      );
      await fetchTimesheets();
      setShowRejectModal(false);
      setSelectedTimesheet(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
    }
  };

  const stats = {
    pending: timesheets.filter((t) => t.status === "submitted").length,
    approved: timesheets.filter((t) => t.status === "approved").length,
    needsRevision: timesheets.filter((t) => t.status === "needs_revision").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Needs Revision</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.needsRevision}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["submitted", "approved", "needs_revision", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === status
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {status.replace("_", " ").charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Timesheets List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Timesheets</h3>
          {timesheets.map((timesheet) => (
            <div
              key={timesheet.id}
              onClick={() => setSelectedTimesheet(timesheet)}
              className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border cursor-pointer transition ${
                selectedTimesheet?.id === timesheet.id
                  ? "border-blue-500"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{timesheet.employee_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {timesheet.pay_period_start} - {timesheet.pay_period_end}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    timesheet.status === "submitted"
                      ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                      : timesheet.status === "approved"
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                  }`}
                >
                  {timesheet.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Total: <span className="font-semibold">{timesheet.total_hours.toFixed(2)}h</span>
              </p>
            </div>
          ))}
        </div>

        {/* Details Panel */}
        {selectedTimesheet && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timesheet Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedTimesheet.employee_name}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedTimesheet.total_hours.toFixed(2)}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Regular</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedTimesheet.regular_hours.toFixed(2)}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">OT</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {selectedTimesheet.overtime_hours.toFixed(2)}h
                  </p>
                </div>
              </div>

              {/* Time Entries */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Entries</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedTimesheet.time_entries?.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.project_name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.hours.toFixed(2)}h
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{entry.task_description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedTimesheet.status === "submitted" && (
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleApprove(selectedTimesheet.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Approve
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    Reject
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Timesheet</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-32"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ANALYTICS TAB ====================

function AnalyticsTab() {
  const [summary, setSummary] = useState<CapitalizationSummary | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics[]>([]);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<EmployeeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleExport = () => {
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

    const projectRows = (Array.isArray(projectAnalytics) ? projectAnalytics : []).map(p =>
      `${p.project_code},${p.project_name},${p.total_hours.toFixed(2)},${p.capitalizable_hours.toFixed(2)},${p.non_capitalizable_hours.toFixed(2)},${p.employee_count}`
    );

    const employeeSection = [
      "",
      "EMPLOYEE BREAKDOWN",
      "Employee Name,Total Hours,Capitalizable Hours,Non-Capitalizable Hours,Capitalization Rate,Project Count"
    ];

    const employeeRows = (Array.isArray(employeeAnalytics) ? employeeAnalytics : []).map(e =>
      `${e.employee_name},${(e.total_hours ?? 0).toFixed(2)},${(e.capitalizable_hours ?? 0).toFixed(2)},${(e.non_capitalizable_hours ?? 0).toFixed(2)},${(e.capitalization_rate ?? 0).toFixed(2)}%,${e.project_count ?? 0}`
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
    <div className="space-y-6">
      {/* Date Filters & Export */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchAnalytics}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Apply Filters
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setStartDate("");
              setEndDate("");
              fetchAnalytics();
            }}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
          >
            Clear
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total Hours</span>
            </div>
            <div className="text-3xl font-semibold text-gray-900 dark:text-white">{summary.total_hours.toFixed(2)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Regular: {summary.regular_hours.toFixed(2)} | OT: {summary.overtime_hours.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Capitalizable</span>
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
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Non-Capitalizable</span>
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
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <PieChart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Overtime Rate</span>
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
      {summary && summary.labor_type_breakdown && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Labor Type Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Direct Labor</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {(summary.labor_type_breakdown?.direct ?? summary.labor_type_breakdown?.direct_hours ?? 0).toFixed(2)} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${((summary.labor_type_breakdown?.direct ?? summary.labor_type_breakdown?.direct_hours ?? 0) / (summary.total_hours || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Indirect Labor</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {(summary.labor_type_breakdown?.indirect ?? summary.labor_type_breakdown?.indirect_hours ?? 0).toFixed(2)} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${((summary.labor_type_breakdown?.indirect ?? summary.labor_type_breakdown?.indirect_hours ?? 0) / (summary.total_hours || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overhead Labor</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {(summary.labor_type_breakdown?.overhead ?? summary.labor_type_breakdown?.overhead_hours ?? 0).toFixed(2)} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all"
                  style={{ width: `${((summary.labor_type_breakdown?.overhead ?? summary.labor_type_breakdown?.overhead_hours ?? 0) / (summary.total_hours || 1)) * 100}%` }}
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
                <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Project</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Hrs</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Hrs</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Direct</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Indirect</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Overhead</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Employees</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(projectAnalytics) && projectAnalytics.map((project) => (
                <tr key={project.project_id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-2 text-gray-900 dark:text-white">
                    <div>
                      <div className="font-medium">{project.project_name}</div>
                      <div className="text-sm text-gray-500">{project.project_code}</div>
                    </div>
                  </td>
                  <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                    {project.total_hours.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-green-600 dark:text-green-400">
                    {project.capitalizable_hours.toFixed(2)}
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
                <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Employee</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Hours</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Hours</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Rate</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Projects</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(employeeAnalytics) ? employeeAnalytics : []).map((employee) => (
                <tr key={employee.employee_id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-2 font-medium text-gray-900 dark:text-white">{employee.employee_name}</td>
                  <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                    {(employee.total_hours ?? 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-green-600 dark:text-green-400">
                    {(employee.capitalizable_hours ?? 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        (employee.capitalization_rate ?? 0) >= 50
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : (employee.capitalization_rate ?? 0) >= 25
                          ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {(employee.capitalization_rate ?? 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-2 text-right text-gray-900 dark:text-white">{employee.project_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== ADMIN DASHBOARD TAB ====================

function AdminDashboardTab() {
  const [summary, setSummary] = useState<AdminCompanySummary | null>(null);
  const [periods, setPeriods] = useState<CapitalizationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string }>>([]);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const response = await axios.get(`${ADMIN_API_URL}/periods`);
      // API returns {periods: [...]} so extract the array
      const periodsData = Array.isArray(response.data?.periods) ? response.data.periods : (Array.isArray(response.data) ? response.data : []);
      setPeriods(periodsData);
      // Default to most recent period with data, or current month if no data exists
      const monthlyPeriods = periodsData.filter((p: CapitalizationPeriod) => p.period_type === "monthly");
      const periodWithData = monthlyPeriods.find((p: CapitalizationPeriod) => p.total_hours > 0);
      if (periodWithData) {
        setSelectedPeriod(periodWithData.period_id);
      } else {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const currentPeriod = monthlyPeriods.find(
          (p: CapitalizationPeriod) => p.year === currentYear && p.month === currentMonth
        );
        if (currentPeriod) {
          setSelectedPeriod(currentPeriod.period_id);
        } else if (periodsData.length > 0) {
          setSelectedPeriod(periodsData[0].period_id);
        }
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
      setPeriods([]);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ADMIN_API_URL}/analytics/company-summary?period_id=${selectedPeriod}`);
      setSummary(response.data);

      // Check for alerts
      const newAlerts: Array<{ type: string; message: string }> = [];
      if (response.data.total_hours === 0) {
        newAlerts.push({ type: "warning", message: "No time entries found for this period" });
      }
      if (response.data.period_status === "open" && response.data.total_labor_cost === 0) {
        newAlerts.push({ type: "info", message: "Labor rates may need to be configured" });
      }
      setAlerts(newAlerts);
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePeriod = async () => {
    if (!selectedPeriod) return;
    try {
      const period = periods.find(p => p.period_id === selectedPeriod);
      if (period) {
        await axios.post(`${ADMIN_API_URL}/periods/${period.id}/calculate?user_id=1`);
        await fetchSummary();
      }
    } catch (error) {
      console.error("Error calculating period:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector & Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Reporting Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <optgroup label="Monthly">
                {periods
                  .filter((p) => p.period_type === "monthly")
                  .map((p) => (
                    <option key={p.period_id} value={p.period_id}>
                      {p.period_id} ({p.status})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Quarterly">
                {periods
                  .filter((p) => p.period_type === "quarterly")
                  .map((p) => (
                    <option key={p.period_id} value={p.period_id}>
                      {p.period_id} ({p.status})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Annual">
                {periods
                  .filter((p) => p.period_type === "annual")
                  .map((p) => (
                    <option key={p.period_id} value={p.period_id}>
                      {p.period_id} ({p.status})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCalculatePeriod}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            <Calculator className="w-4 h-4" />
            Calculate Period
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchSummary}
            className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-4 rounded-lg ${
                alert.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                  : "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-md text-white"
          >
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-6 w-6 opacity-80" />
              <span className="font-medium opacity-90">Total Labor Cost</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(summary.total_labor_cost)}</div>
            <p className="text-sm opacity-80 mt-1">
              {summary.total_employees} employees | {summary.total_projects} projects
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-md text-white"
          >
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-6 w-6 opacity-80" />
              <span className="font-medium opacity-90">Capitalized Cost</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(summary.total_capitalized_cost)}</div>
            <p className="text-sm opacity-80 mt-1">
              {summary.capitalization_rate.toFixed(1)}% capitalization rate
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total Hours</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {summary.total_hours.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Cap: {summary.capitalizable_hours.toLocaleString()} | Non-cap: {summary.non_capitalizable_hours.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              {summary.period_status === "locked" ? (
                <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : summary.period_status === "approved" ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              )}
              <span className="text-gray-700 dark:text-gray-300 font-medium">Period Status</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {summary.period_status}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {summary.start_date} to {summary.end_date}
            </p>
          </motion.div>
        </div>
      )}

      {/* Labor Type Cost Breakdown */}
      {summary && summary.labor_type_breakdown && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Labor Type Breakdown (Hours & Cost)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Direct Labor</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {(summary.labor_type_breakdown?.direct_hours ?? summary.labor_type_breakdown?.direct ?? 0).toLocaleString()} hrs
              </p>
              <p className="text-lg text-blue-600 dark:text-blue-400">
                {formatCurrency(summary.labor_type_breakdown?.direct_cost ?? 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Indirect Labor</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {(summary.labor_type_breakdown?.indirect_hours ?? summary.labor_type_breakdown?.indirect ?? 0).toLocaleString()} hrs
              </p>
              <p className="text-lg text-green-600 dark:text-green-400">
                {formatCurrency(summary.labor_type_breakdown?.indirect_cost ?? 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Overhead Labor</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {(summary.labor_type_breakdown?.overhead_hours ?? summary.labor_type_breakdown?.overhead ?? 0).toLocaleString()} hrs
              </p>
              <p className="text-lg text-orange-600 dark:text-orange-400">
                {formatCurrency(summary.labor_type_breakdown?.overhead_cost ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Period Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["open", "in_review", "approved", "locked", "closed"].map((status) => {
            const count = periods.filter((p) => p.status === status).length;
            const isCurrentStatus = summary?.period_status === status;
            return (
              <div
                key={status}
                className={`text-center p-4 rounded-lg ${
                  isCurrentStatus
                    ? "bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500"
                    : "bg-gray-50 dark:bg-gray-700"
                }`}
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status.replace("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== DATA MANAGEMENT TAB ====================

function DataManagementTab() {
  const [activeSection, setActiveSection] = useState<"imports" | "rates">("imports");
  const [imports, setImports] = useState<LaborDataImport[]>([]);
  const [rates, setRates] = useState<LaborRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"time_data" | "payroll_data">("time_data");
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<LaborRate | null>(null);

  useEffect(() => {
    if (activeSection === "imports") {
      fetchImports();
    } else {
      fetchRates();
    }
  }, [activeSection]);

  const fetchImports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ADMIN_API_URL}/imports`);
      // API may return {imports: [...]} or array directly
      const importsData = Array.isArray(response.data?.imports) ? response.data.imports : (Array.isArray(response.data) ? response.data : []);
      setImports(importsData);
    } catch (error) {
      console.error("Error fetching imports:", error);
      setImports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ADMIN_API_URL}/rates`);
      // API may return {rates: [...]} or array directly
      const ratesData = Array.isArray(response.data?.rates) ? response.data.rates : (Array.isArray(response.data) ? response.data : []);
      setRates(ratesData);
    } catch (error) {
      console.error("Error fetching rates:", error);
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("import_type", uploadType);

      await axios.post(`${ADMIN_API_URL}/imports/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchImports();
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleCalculateRates = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await axios.post(`${ADMIN_API_URL}/rates/calculate-from-compensation?effective_date=${today}&user_id=1`);
      await fetchRates();
    } catch (error) {
      console.error("Error calculating rates:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("imports")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            activeSection === "imports"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <Upload className="w-4 h-4" />
          Data Imports
        </button>
        <button
          onClick={() => setActiveSection("rates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            activeSection === "rates"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Labor Rates
        </button>
      </div>

      {activeSection === "imports" ? (
        <>
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Data</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Import Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as "time_data" | "payroll_data")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="time_data">Time Data (CSV/Excel)</option>
                  <option value="payroll_data">Payroll Data (CSV/Excel)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload File"}
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Supported formats: CSV, Excel (.xlsx, .xls). Files will be validated before processing.
            </p>
          </div>

          {/* Sample Files Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sample Files for Demo</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download these sample files to test the upload functionality or use as templates.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href={`${ADMIN_API_URL}/sample-files/sample_time_data.csv`}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                download
              >
                <FileText className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Sample Time Data</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Employee hours, projects, labor types</div>
                </div>
                <Download className="w-5 h-5 ml-auto text-gray-400" />
              </a>
              <a
                href={`${ADMIN_API_URL}/sample-files/sample_payroll_data.csv`}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                download
              >
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Sample Payroll Data</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Pay periods, hours, compensation</div>
                </div>
                <Download className="w-5 h-5 ml-auto text-gray-400" />
              </a>
              <a
                href={`${ADMIN_API_URL}/sample-files/sample_labor_rates.csv`}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                download
              >
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Sample Labor Rates</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Fully burdened rate components</div>
                </div>
                <Download className="w-5 h-5 ml-auto text-gray-400" />
              </a>
              <a
                href={`${ADMIN_API_URL}/sample-files/sample_projects.csv`}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                download
              >
                <FileText className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Sample Projects</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Project data with capitalization settings</div>
                </div>
                <Download className="w-5 h-5 ml-auto text-gray-400" />
              </a>
            </div>
          </div>

          {/* Import History */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import History</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
            ) : imports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No imports yet. Upload a file to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">File</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Type</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Date Range</th>
                      <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Records</th>
                      <th className="text-center p-2 text-gray-700 dark:text-gray-300 font-semibold">Status</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(imports) && imports.map((imp) => (
                      <tr key={imp.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="p-2 text-gray-900 dark:text-white">{imp.original_file_name}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {imp.import_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          {imp.start_date} - {imp.end_date}
                        </td>
                        <td className="p-2 text-right">
                          <span className="text-green-600 dark:text-green-400">{imp.successful_records}</span>
                          {imp.failed_records > 0 && (
                            <span className="text-red-600 dark:text-red-400"> / {imp.failed_records} failed</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              imp.status === "completed"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                : imp.status === "failed"
                                ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                            }`}
                          >
                            {imp.status}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          {new Date(imp.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Rate Actions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Labor Rate Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage fully burdened labor rates for cost calculations
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCalculateRates}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  <Calculator className="w-4 h-4" />
                  Calculate from Compensation
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={fetchRates}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </motion.button>
              </div>
            </div>
          </div>

          {/* Rates Table */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Labor Rates</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
            ) : rates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No labor rates configured. Click "Calculate from Compensation" to generate rates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Employee</th>
                      <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Hourly Rate</th>
                      <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Benefits</th>
                      <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Taxes</th>
                      <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Overhead</th>
                      <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Fully Burdened</th>
                      <th className="text-center p-2 text-gray-700 dark:text-gray-300 font-semibold">Status</th>
                      <th className="text-center p-2 text-gray-700 dark:text-gray-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(rates) && rates.map((rate) => (
                      <tr key={rate.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="p-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {rate.employee_name || `Employee #${rate.employee_id}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            Effective: {rate.effective_date}
                            {rate.end_date && ` - ${rate.end_date}`}
                          </div>
                        </td>
                        <td className="p-2 text-right text-gray-900 dark:text-white">
                          {formatCurrency(rate.hourly_rate)}
                        </td>
                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                          {rate.benefits_hourly
                            ? formatCurrency(rate.benefits_hourly)
                            : rate.benefits_percentage
                            ? `${rate.benefits_percentage}%`
                            : "-"}
                        </td>
                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                          {rate.employer_taxes_hourly
                            ? formatCurrency(rate.employer_taxes_hourly)
                            : rate.employer_taxes_percentage
                            ? `${rate.employer_taxes_percentage}%`
                            : "-"}
                        </td>
                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                          {rate.overhead_rate_hourly
                            ? formatCurrency(rate.overhead_rate_hourly)
                            : rate.overhead_rate_percentage
                            ? `${rate.overhead_rate_percentage}%`
                            : "-"}
                        </td>
                        <td className="p-2 text-right font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(rate.fully_burdened_rate)}
                        </td>
                        <td className="p-2 text-center">
                          {rate.is_locked ? (
                            <Lock className="w-4 h-4 text-red-500 mx-auto" />
                          ) : (
                            <Unlock className="w-4 h-4 text-green-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedRate(rate);
                              setShowRateModal(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Rate Detail Drawer */}
      <AnimatePresence>
        {showRateModal && selectedRate && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowRateModal(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto p-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Rate Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedRate.employee_name || `Employee #${selectedRate.employee_id}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowRateModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedRate.is_locked
                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                }`}>
                  {selectedRate.is_locked ? "Locked" : "Active"}
                </span>
              </div>

              {/* Date Info */}
              <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Effective Date</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedRate.effective_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedRate.end_date || "Current"}</p>
                  </div>
                </div>
              </div>

              {/* Rate Breakdown Card */}
              <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5 mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Rate Breakdown
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Base Hourly Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedRate.hourly_rate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">+ Benefits</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedRate.benefits_hourly ? formatCurrency(selectedRate.benefits_hourly) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">+ Employer Taxes</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedRate.employer_taxes_hourly ? formatCurrency(selectedRate.employer_taxes_hourly) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">+ Overhead</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedRate.overhead_rate_hourly ? formatCurrency(selectedRate.overhead_rate_hourly) : "-"}
                    </span>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-700" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Fully Burdened Rate</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(selectedRate.fully_burdened_rate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Details</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">OT Multiplier</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedRate.overtime_multiplier}x</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Rate Source</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedRate.rate_source}</span>
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

// ==================== ADMIN ANALYTICS TAB ====================

function AdminAnalyticsTab() {
  const [activeView, setActiveView] = useState<"employees" | "projects">("employees");
  const [periods, setPeriods] = useState<CapitalizationPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [employeeAnalytics, setEmployeeAnalytics] = useState<AdminEmployeeAnalytics[]>([]);
  const [projectAnalytics, setProjectAnalytics] = useState<AdminProjectAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [laborTypeFilter, setLaborTypeFilter] = useState<"all" | "direct" | "indirect" | "overhead">("all");
  const [selectedEmployee, setSelectedEmployee] = useState<AdminEmployeeAnalytics | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<EmployeeHistory | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, activeView]);

  const fetchPeriods = async () => {
    try {
      const response = await axios.get(`${ADMIN_API_URL}/periods`);
      // API returns {periods: [...]} so extract the array
      const periodsData = Array.isArray(response.data?.periods) ? response.data.periods : (Array.isArray(response.data) ? response.data : []);
      setPeriods(periodsData);
      // Default to most recent period with data
      const monthlyPeriods = periodsData.filter((p: CapitalizationPeriod) => p.period_type === "monthly");
      const periodWithData = monthlyPeriods.find((p: CapitalizationPeriod) => p.total_hours > 0);
      if (periodWithData) {
        setSelectedPeriod(periodWithData.period_id);
      } else {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const currentPeriod = monthlyPeriods.find(
          (p: CapitalizationPeriod) => p.year === currentYear && p.month === currentMonth
        );
        if (currentPeriod) {
          setSelectedPeriod(currentPeriod.period_id);
        } else if (periodsData.length > 0) {
          setSelectedPeriod(periodsData[0].period_id);
        }
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
      setPeriods([]);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (activeView === "employees") {
        const response = await axios.get(`${ADMIN_API_URL}/analytics/by-employee?period_id=${selectedPeriod}`);
        // API may return {employees: [...]} or array directly
        const data = Array.isArray(response.data?.employees) ? response.data.employees : (Array.isArray(response.data) ? response.data : []);
        setEmployeeAnalytics(data);
      } else {
        const response = await axios.get(`${ADMIN_API_URL}/analytics/by-project?period_id=${selectedPeriod}`);
        // API may return {projects: [...]} or array directly
        const data = Array.isArray(response.data?.projects) ? response.data.projects : (Array.isArray(response.data) ? response.data : []);
        setProjectAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setEmployeeAnalytics([]);
      setProjectAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeHistory = async (employeeId: number) => {
    try {
      const response = await axios.get(`${ADMIN_API_URL}/analytics/employee/${employeeId}/history`);
      setEmployeeHistory(response.data);
    } catch (error) {
      console.error("Error fetching employee history:", error);
    }
  };

  const handleEmployeeClick = async (employee: AdminEmployeeAnalytics) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    await fetchEmployeeHistory(employee.employee_id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const filteredEmployees = (Array.isArray(employeeAnalytics) ? employeeAnalytics : []).filter((emp) => {
    if (laborTypeFilter === "all") return true;
    const breakdown = emp.labor_type_breakdown ?? {};
    if (laborTypeFilter === "direct") return (breakdown.direct_hours ?? 0) > 0;
    if (laborTypeFilter === "indirect") return (breakdown.indirect_hours ?? 0) > 0;
    if (laborTypeFilter === "overhead") return (breakdown.overhead_hours ?? 0) > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView("employees")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeView === "employees"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Users className="w-4 h-4" />
              By Employee
            </button>
            <button
              onClick={() => setActiveView("projects")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeView === "projects"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Building2 className="w-4 h-4" />
              By Project
            </button>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Array.isArray(periods) && periods.map((p) => (
                <option key={p.period_id} value={p.period_id}>
                  {p.period_id}
                </option>
              ))}
            </select>
          </div>

          {activeView === "employees" && (
            <div className="min-w-40">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Labor Type</label>
              <select
                value={laborTypeFilter}
                onChange={(e) => setLaborTypeFilter(e.target.value as typeof laborTypeFilter)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="direct">Direct Only</option>
                <option value="indirect">Indirect Only</option>
                <option value="overhead">Overhead Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {activeView === "employees" ? "Employee Analytics" : "Project Analytics"}
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : activeView === "employees" ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Employee</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Hours</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Hours</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Rate</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Cost</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Cost</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Direct</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Indirect</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Overhead</th>
                  <th className="text-center p-2 text-gray-700 dark:text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.employee_id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleEmployeeClick(emp)}
                  >
                    <td className="p-2">
                      <div className="font-medium text-gray-900 dark:text-white">{emp.employee_name}</div>
                      {emp.department && <div className="text-xs text-gray-500">{emp.department}</div>}
                    </td>
                    <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                      {(emp.total_hours ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">
                      {(emp.capitalizable_hours ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          (emp.capitalization_rate ?? 0) >= 50
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : (emp.capitalization_rate ?? 0) >= 25
                            ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {(emp.capitalization_rate ?? 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-right text-gray-900 dark:text-white">{formatCurrency(emp.total_cost ?? 0)}</td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(emp.capitalized_cost ?? 0)}
                    </td>
                    <td className="p-2 text-right text-blue-600 dark:text-blue-400">
                      {(emp.labor_type_breakdown?.direct_hours ?? emp.direct_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">
                      {(emp.labor_type_breakdown?.indirect_hours ?? emp.indirect_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="p-2 text-right text-orange-600 dark:text-orange-400">
                      {(emp.labor_type_breakdown?.overhead_hours ?? emp.overhead_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="p-2 text-center">
                      <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1 mx-auto">
                        <History className="w-4 h-4" />
                        History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold">Project</th>
                  <th className="text-center p-2 text-gray-700 dark:text-gray-300 font-semibold">Capitalizable</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Hours</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Hours</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Cost</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cap. Cost</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Direct</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Indirect</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Overhead</th>
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Employees</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(projectAnalytics) && projectAnalytics.map((proj) => (
                  <tr key={proj.project_id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-2">
                      <div className="font-medium text-gray-900 dark:text-white">{proj.project_name}</div>
                      <div className="text-xs text-gray-500">{proj.project_code}</div>
                    </td>
                    <td className="p-2 text-center">
                      {proj.is_capitalizable ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          No
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                      {(proj.total_hours ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">
                      {(proj.capitalizable_hours ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-gray-900 dark:text-white">{formatCurrency(proj.total_cost ?? 0)}</td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(proj.capitalized_cost ?? 0)}
                    </td>
                    <td className="p-2 text-right text-blue-600 dark:text-blue-400">
                      {(proj.labor_type_breakdown?.direct_hours ?? proj.direct_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">
                      {(proj.labor_type_breakdown?.indirect_hours ?? proj.indirect_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="p-2 text-right text-orange-600 dark:text-orange-400">
                      {(proj.labor_type_breakdown?.overhead_hours ?? proj.overhead_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="p-2 text-right text-gray-900 dark:text-white">{proj.employee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee History Drawer */}
      <AnimatePresence>
        {showEmployeeModal && selectedEmployee && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setShowEmployeeModal(false);
                setEmployeeHistory(null);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto p-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    {selectedEmployee.employee_name}
                  </h2>
                  {selectedEmployee.department && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedEmployee.department}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setEmployeeHistory(null);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {!employeeHistory ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading history...</div>
              ) : (
                <div className="space-y-4">
                  {/* Current Rate Card */}
                  {employeeHistory.current_rate && (
                    <div className="rounded-2xl border dark:border-gray-700 bg-purple-50 dark:bg-purple-900/30 p-5">
                      <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Current Labor Rate
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-purple-600 dark:text-purple-400">Base Rate</p>
                          <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                            {formatCurrency(employeeHistory.current_rate.hourly_rate)}/hr
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-purple-600 dark:text-purple-400">Fully Burdened</p>
                          <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                            {formatCurrency(employeeHistory.current_rate.fully_burdened_rate)}/hr
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-purple-600 dark:text-purple-400">Effective Since</p>
                          <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                            {employeeHistory.current_rate.effective_date}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Labor Type Distribution Card */}
                  <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      Labor Type Distribution
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-blue-600 dark:text-blue-400">Direct</p>
                        <p className="text-xl font-bold text-blue-800 dark:text-blue-200">
                          {(employeeHistory?.labor_type_totals?.direct_hours ?? 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">hours</p>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-green-600 dark:text-green-400">Indirect</p>
                        <p className="text-xl font-bold text-green-800 dark:text-green-200">
                          {(employeeHistory?.labor_type_totals?.indirect_hours ?? 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">hours</p>
                      </div>
                      <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-orange-600 dark:text-orange-400">Overhead</p>
                        <p className="text-xl font-bold text-orange-800 dark:text-orange-200">
                          {(employeeHistory?.labor_type_totals?.overhead_hours ?? 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">hours</p>
                      </div>
                    </div>
                  </div>

                  {/* Period History Card */}
                  <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                      Period History
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left p-2 text-gray-600 dark:text-gray-400">Period</th>
                            <th className="text-right p-2 text-gray-600 dark:text-gray-400">Total</th>
                            <th className="text-right p-2 text-gray-600 dark:text-gray-400">Cap.</th>
                            <th className="text-right p-2 text-gray-600 dark:text-gray-400">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(employeeHistory?.period_summaries ?? []).map((ps) => (
                            <tr key={ps.period_id} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="p-2 text-gray-900 dark:text-white font-medium">{ps.period_id}</td>
                              <td className="p-2 text-right text-gray-900 dark:text-white">{(ps.total_hours ?? 0).toFixed(1)}</td>
                              <td className="p-2 text-right text-green-600 dark:text-green-400">
                                {(ps.capitalizable_hours ?? 0).toFixed(1)}
                              </td>
                              <td className="p-2 text-right">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  (ps.capitalization_rate ?? 0) >= 50
                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                    : (ps.capitalization_rate ?? 0) >= 25
                                    ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                }`}>
                                  {(ps.capitalization_rate ?? 0).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Project Breakdown Card */}
                  <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-green-500" />
                      Project Breakdown
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left p-2 text-gray-600 dark:text-gray-400">Project</th>
                            <th className="text-right p-2 text-gray-600 dark:text-gray-400">Total</th>
                            <th className="text-right p-2 text-gray-600 dark:text-gray-400">Cap.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(employeeHistory?.project_breakdown ?? []).map((pb) => (
                            <tr key={pb.project_id} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="p-2">
                                <div className="font-medium text-gray-900 dark:text-white">{pb.project_name}</div>
                                <div className="text-xs text-gray-500">{pb.project_code}</div>
                              </td>
                              <td className="p-2 text-right text-gray-900 dark:text-white">{(pb.total_hours ?? 0).toFixed(1)}</td>
                              <td className="p-2 text-right text-green-600 dark:text-green-400">
                                {(pb.capitalizable_hours ?? 0).toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== PERIOD MANAGEMENT TAB ====================

function PeriodManagementTab() {
  const [periods, setPeriods] = useState<CapitalizationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<CapitalizationPeriod | null>(null);
  const [filterType, setFilterType] = useState<"all" | "monthly" | "quarterly" | "annual">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ADMIN_API_URL}/periods`);
      // API returns {periods: [...]} so extract the array
      const periodsData = Array.isArray(response.data?.periods) ? response.data.periods : (Array.isArray(response.data) ? response.data : []);
      setPeriods(periodsData);
    } catch (error) {
      console.error("Error fetching periods:", error);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLockPeriod = async (periodId: number) => {
    try {
      await axios.post(`${ADMIN_API_URL}/periods/${periodId}/lock?user_id=1`);
      await fetchPeriods();
    } catch (error) {
      console.error("Error locking period:", error);
    }
  };

  const handleUnlockPeriod = async (periodId: number) => {
    const reason = window.prompt("Please provide a reason for unlocking this period:");
    if (!reason) return;
    try {
      await axios.post(`${ADMIN_API_URL}/periods/${periodId}/unlock?user_id=1&reason=${encodeURIComponent(reason)}`);
      await fetchPeriods();
    } catch (error) {
      console.error("Error unlocking period:", error);
    }
  };

  const handleCalculatePeriod = async (periodId: number) => {
    try {
      await axios.post(`${ADMIN_API_URL}/periods/${periodId}/calculate?user_id=1`);
      await fetchPeriods();
    } catch (error) {
      console.error("Error calculating period:", error);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const filteredPeriods = (Array.isArray(periods) ? periods : []).filter((p) => {
    if (filterType !== "all" && p.period_type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "in_review":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "approved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "locked":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      case "closed":
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-40">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Period Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="min-w-40">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="locked">Locked</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchPeriods}
              className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </motion.button>
          </div>
        </div>
      </div>

      {/* Periods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Capitalization Periods</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredPeriods.map((period) => (
                <div
                  key={period.id}
                  onClick={() => setSelectedPeriod(period)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedPeriod?.id === period.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{period.period_id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {period.start_date} - {period.end_date}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(period.status)}`}>
                      {period.status.replace("_", " ")}
                    </span>
                  </div>
                  {period.total_hours !== undefined && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Hours: </span>
                        <span className="text-gray-900 dark:text-white">{period.total_hours?.toFixed(1) || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cost: </span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(period.total_capitalized_cost)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Period Details */}
        {selectedPeriod && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Period Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Period ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPeriod.period_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedPeriod.period_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPeriod.start_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPeriod.end_date}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Totals</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Hours</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedPeriod.total_hours?.toFixed(1) || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cap. Hours</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {selectedPeriod.total_capitalizable_hours?.toFixed(1) || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Labor Cost</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selectedPeriod.total_labor_cost)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400">Capitalized Cost</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(selectedPeriod.total_capitalized_cost)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCalculatePeriod(selectedPeriod.id)}
                    disabled={selectedPeriod.status === "locked"}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculate
                  </motion.button>
                  {selectedPeriod.status !== "locked" ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLockPeriod(selectedPeriod.id)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Lock className="w-4 h-4" />
                      Lock Period
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUnlockPeriod(selectedPeriod.id)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Unlock className="w-4 h-4" />
                      Unlock Period
                    </motion.button>
                  )}
                </div>
              </div>

              {selectedPeriod.locked_at && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Locked at: {new Date(selectedPeriod.locked_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== REPORTS & EXPORT TAB ====================

function ReportsExportTab() {
  const [periods, setPeriods] = useState<CapitalizationPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [exportType, setExportType] = useState<"period" | "employee" | "project" | "audit">("period");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const response = await axios.get(`${ADMIN_API_URL}/periods`);
      // API returns {periods: [...]} so extract the array
      const periodsData = Array.isArray(response.data?.periods) ? response.data.periods : (Array.isArray(response.data) ? response.data : []);
      setPeriods(periodsData);
      // Default to most recent period with data
      const monthlyPeriods = periodsData.filter((p: CapitalizationPeriod) => p.period_type === "monthly");
      const periodWithData = monthlyPeriods.find((p: CapitalizationPeriod) => p.total_hours > 0);
      if (periodWithData) {
        setSelectedPeriod(periodWithData.period_id);
      } else if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].period_id);
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
      setPeriods([]);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ADMIN_API_URL}/audit-log`);
      // API may return {logs: [...]} or array directly
      const logsData = Array.isArray(response.data?.logs) ? response.data.logs : (Array.isArray(response.data) ? response.data : []);
      setAuditLogs(logsData);
      setShowAuditLog(true);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setAuditLogs([]);
      setShowAuditLog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const period = periods.find((p) => p.period_id === selectedPeriod);
      if (!period && exportType !== "audit") return;

      let endpoint = "";
      let filename = "";

      switch (exportType) {
        case "period":
          endpoint = `${ADMIN_API_URL}/export/period-report/${period?.id}?format=${exportFormat}`;
          filename = `period_report_${selectedPeriod}.${exportFormat}`;
          break;
        case "employee":
          endpoint = `${ADMIN_API_URL}/export/employee-breakdown?period_id=${selectedPeriod}&format=${exportFormat}`;
          filename = `employee_breakdown_${selectedPeriod}.${exportFormat}`;
          break;
        case "project":
          endpoint = `${ADMIN_API_URL}/export/project-breakdown?period_id=${selectedPeriod}&format=${exportFormat}`;
          filename = `project_breakdown_${selectedPeriod}.${exportFormat}`;
          break;
        case "audit":
          endpoint = `${ADMIN_API_URL}/export/audit-report?format=${exportFormat}`;
          filename = `audit_report.${exportFormat}`;
          break;
      }

      const response = await axios.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Report Type</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as typeof exportType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="period">Full Period Report</option>
              <option value="employee">Employee Breakdown</option>
              <option value="project">Project Breakdown</option>
              <option value="audit">Audit Report</option>
            </select>
          </div>

          {exportType !== "audit" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.isArray(periods) && periods.map((p) => (
                  <option key={p.period_id} value={p.period_id}>
                    {p.period_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
            </select>
          </div>

          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg w-full justify-center"
            >
              <Download className="w-4 h-4" />
              {loading ? "Generating..." : "Export"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-md text-white cursor-pointer"
          onClick={() => {
            setExportType("period");
            handleExport();
          }}
        >
          <FileText className="w-8 h-8 mb-3 opacity-80" />
          <h4 className="font-semibold">Period Report</h4>
          <p className="text-sm opacity-80 mt-1">Full capitalization summary</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-md text-white cursor-pointer"
          onClick={() => {
            setExportType("employee");
            handleExport();
          }}
        >
          <Users className="w-8 h-8 mb-3 opacity-80" />
          <h4 className="font-semibold">Employee Report</h4>
          <p className="text-sm opacity-80 mt-1">Per-employee breakdown</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-md text-white cursor-pointer"
          onClick={() => {
            setExportType("project");
            handleExport();
          }}
        >
          <Building2 className="w-8 h-8 mb-3 opacity-80" />
          <h4 className="font-semibold">Project Report</h4>
          <p className="text-sm opacity-80 mt-1">Per-project breakdown</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-md text-white cursor-pointer"
          onClick={fetchAuditLogs}
        >
          <History className="w-8 h-8 mb-3 opacity-80" />
          <h4 className="font-semibold">Audit Log</h4>
          <p className="text-sm opacity-80 mt-1">View change history</p>
        </motion.div>
      </div>

      {/* Report Description */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Report Descriptions</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Full Period Report</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive report including all capitalization data for the selected period. Contains summary
                totals, employee breakdown, project breakdown, and labor type distribution.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Employee Breakdown</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Detailed per-employee report showing hours, costs, capitalization rates, and labor type
                distribution for each employee in the period.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Project Breakdown</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Per-project capitalization summary including total hours, capitalized costs, and employee
                allocations for each project code.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Audit Report</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete audit trail of all changes made to capitalization data, including rate changes, period
                locks/unlocks, and data imports. Essential for compliance reviews.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAuditLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Log</h3>
              <button
                onClick={() => setShowAuditLog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No audit logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Timestamp</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Action</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Entity</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">User</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(auditLogs) && auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2 text-gray-900 dark:text-white">
                          {log.entity_type} #{log.entity_id}
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">User #{log.user_id}</td>
                        <td className="p-2 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {log.reason || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setExportType("audit");
                  handleExport();
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                <Download className="w-4 h-4" />
                Export Audit Log
              </motion.button>
              <button
                onClick={() => setShowAuditLog(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
