import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  Plus,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  TrendingUp,
} from "lucide-react";
import GarnishmentDrawer from "../components/GarnishmentDrawer";
import NewGarnishmentModal from "../components/NewGarnishmentModal";

interface Garnishment {
  id: number;
  case_number: string;
  employee_id: string;
  employee_name: string;
  department: string | null;
  status: string;
  garnishment_type: string;
  agency_name: string;
  start_date: string | null;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  priority_order: number;
}

interface DashboardStats {
  active_garnishments: number;
  pending_garnishments: number;
  total_owed: number;
  total_paid_ytd: number;
  recent_payment_total: number;
  type_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  as_of: string;
}

export default function GarnishmentsPage() {
  const [garnishments, setGarnishments] = useState<Garnishment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGarnishmentId, setSelectedGarnishmentId] = useState<number | null>(null);
  const [showNewGarnishmentModal, setShowNewGarnishmentModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchGarnishments();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/garnishments/dashboard", { credentials: 'include' });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching garnishment dashboard stats:", error);
    }
  };

  const fetchGarnishments = async () => {
    try {
      const response = await fetch("/garnishments/", { credentials: 'include' });
      const data = await response.json();
      setGarnishments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching garnishments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewGarnishmentSuccess = () => {
    // Refresh dashboard stats and garnishments list
    fetchDashboardStats();
    fetchGarnishments();
  };

  const filteredGarnishments = statusFilter === "all"
    ? garnishments
    : garnishments.filter(g => g.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "Released": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading garnishment data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Garnishment Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track and manage wage garnishments and court orders
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewGarnishmentModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Garnishment
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.active_garnishments}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.pending_garnishments}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Owed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.total_owed)}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Paid YTD</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.total_paid_ytd)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-600 dark:text-green-400" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Recent (30d)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.recent_payment_total)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
        <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Filter by status:</span>
        {["all", "Active", "Pending", "Closed", "Released"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              statusFilter === status
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {status === "all" ? "All Cases" : status}
          </button>
        ))}
      </div>

      {/* Garnishments Table */}
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
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Agency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Remaining
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredGarnishments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No garnishments found
                  </td>
                </tr>
              ) : (
                filteredGarnishments.map((garnishment) => (
                  <tr
                    key={garnishment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => setSelectedGarnishmentId(garnishment.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {garnishment.case_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      {garnishment.employee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {garnishment.garnishment_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {garnishment.agency_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(garnishment.status)}`}>
                        {garnishment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {formatCurrency(garnishment.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                      {formatCurrency(garnishment.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          garnishment.amount_remaining > garnishment.total_amount * 0.75
                            ? "text-red-600 dark:text-red-400"
                            : garnishment.amount_remaining > garnishment.total_amount * 0.25
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {formatCurrency(garnishment.amount_remaining)}
                        </span>
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              garnishment.amount_remaining > garnishment.total_amount * 0.75
                                ? "bg-red-500"
                                : garnishment.amount_remaining > garnishment.total_amount * 0.25
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${(garnishment.amount_paid / garnishment.total_amount) * 100}%` }}
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

      {/* Summary Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Garnishment Type Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.type_breakdown || {}).map(([type, count]) => (
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
              {Object.entries(stats.status_breakdown || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{status}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Garnishment Drawer */}
      <GarnishmentDrawer
        garnishmentId={selectedGarnishmentId}
        onClose={() => setSelectedGarnishmentId(null)}
        onUpdate={() => {
          fetchDashboardStats();
          fetchGarnishments();
        }}
      />

      {/* New Garnishment Modal */}
      <NewGarnishmentModal
        isOpen={showNewGarnishmentModal}
        onClose={() => setShowNewGarnishmentModal(false)}
        onSuccess={handleNewGarnishmentSuccess}
      />
    </div>
  );
}
