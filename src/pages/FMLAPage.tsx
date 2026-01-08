import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import FMLACaseDrawer from "../components/FMLACaseDrawer";
import NewFMLACaseModal from "../components/NewFMLACaseModal";

interface FMLACase {
  id: number;
  case_number: string;
  employee_id: string;
  employee_name: string;
  department: string | null;
  status: string;
  leave_type: string;
  reason: string | null;
  request_date: string | null;
  start_date: string | null;
  end_date: string | null;
  hours_approved: number;
  hours_used: number;
  hours_remaining: number;
  intermittent: boolean;
  reduced_schedule: boolean;
  certification_date: string | null;
  return_to_work_date: string | null;
}

interface DashboardStats {
  active_cases: number;
  pending_requests: number;
  ytd_cases: number;
  expiring_soon: number;
  recertification_needed: number;
  leave_type_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  as_of: string;
}

export default function FMLAPage() {
  const [cases, setCases] = useState<FMLACase[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchCases();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/fmla/dashboard", { credentials: 'include' });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching FMLA dashboard stats:", error);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await fetch("/fmla/", { credentials: 'include' });
      const data = await response.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching FMLA cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCaseSuccess = () => {
    // Refresh dashboard stats and cases list
    fetchDashboardStats();
    fetchCases();
  };

  const filteredCases = statusFilter === "all"
    ? cases
    : cases.filter(c => c.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Denied": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "Expired": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active": return <CheckCircle className="w-4 h-4" />;
      case "Pending": return <Clock className="w-4 h-4" />;
      case "Denied": return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading FMLA data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-600 dark:text-red-400" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              FMLA Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Family and Medical Leave Act tracking and compliance
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewCaseModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New FMLA Case
        </button>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Cases</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.active_cases}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Requests</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.pending_requests}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">YTD Cases</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.ytd_cases}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.expiring_soon}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recert Needed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.recertification_needed}
                </p>
              </div>
              <FileText className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
        <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Filter by status:</span>
        {["all", "Active", "Pending", "Closed", "Denied"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {status === "all" ? "All Cases" : status}
          </button>
        ))}
      </div>

      {/* Cases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Case Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Hours Used / Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Hours Remaining
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No FMLA cases found
                  </td>
                </tr>
              ) : (
                filteredCases.map((fmlaCase) => (
                  <tr
                    key={fmlaCase.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => setSelectedCaseId(fmlaCase.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      {fmlaCase.case_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {fmlaCase.employee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {fmlaCase.leave_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(fmlaCase.status)}`}>
                        {getStatusIcon(fmlaCase.status)}
                        {fmlaCase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {fmlaCase.start_date ? new Date(fmlaCase.start_date).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {fmlaCase.hours_used.toFixed(1)} / {fmlaCase.hours_approved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          fmlaCase.hours_remaining < 40
                            ? "text-red-600 dark:text-red-400"
                            : fmlaCase.hours_remaining < 120
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {fmlaCase.hours_remaining.toFixed(1)}
                        </span>
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              fmlaCase.hours_remaining < 40
                                ? "bg-red-500"
                                : fmlaCase.hours_remaining < 120
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${(fmlaCase.hours_remaining / fmlaCase.hours_approved) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FMLA Case Drawer */}
      <FMLACaseDrawer
        caseId={selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onUpdate={() => {
          fetchDashboardStats();
          fetchCases();
        }}
      />

      {/* New FMLA Case Modal */}
      <NewFMLACaseModal
        isOpen={showNewCaseModal}
        onClose={() => setShowNewCaseModal(false)}
        onSuccess={handleNewCaseSuccess}
      />

      {/* Summary Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leave Type Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Leave Type Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.leave_type_breakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Status Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.status_breakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{status}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
