/**
 * Main screening dashboard page.
 * Shows overview cards (counts by status) and a filterable list of all screening orders.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";
import { fetchOrders, fetchOrderStatus } from "../api/screeningApi";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderStatus, ScreeningOrder } from "../types/screening";
import { STATUS_CONFIG } from "../types/screening";

export function ScreeningDashboard() {
  const [orders, setOrders] = useState<ScreeningOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const loadOrders = () => {
    setLoading(true);
    fetchOrders()
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRefreshStatus = async (orderId: number) => {
    setRefreshingId(orderId);
    try {
      await fetchOrderStatus(orderId);
      loadOrders();
    } catch {
      // silently fail
    } finally {
      setRefreshingId(null);
    }
  };

  // Count by status
  const statusCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Background Screening
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage and track background check orders via TazWorks
            </p>
          </div>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["applicant-pending", "pending", "ready", "error"] as OrderStatus[]).map(
          (status) => {
            const config = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => setFilter(filter === status ? "all" : status)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  filter === status
                    ? "border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-200 dark:ring-violet-700"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {statusCounts[status] || 0}
                </p>
                <p className={`text-sm ${config.color} ${config.darkColor}`}>{config.label}</p>
              </button>
            );
          }
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {filter === "all" ? "All Orders" : STATUS_CONFIG[filter]?.label}{" "}
            ({filteredOrders.length})
          </p>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            {orders.length === 0
              ? "No background screening orders yet. Use the \"Order Background Check\" button on a candidate's application page."
              : "No orders match the selected filter."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {order.candidate_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {order.product_name || order.product_guid}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge
                      status={order.status}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {order.decision ? (
                      <OrderStatusBadge
                        status={order.status}
                        decision={order.decision}
                      />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRefreshStatus(order.id)}
                        disabled={refreshingId === order.id}
                        title="Refresh status from TazWorks"
                        className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingId === order.id ? "animate-spin" : ""}`} />
                      </button>
                      {order.quickapp_link && (
                        <a
                          href={order.quickapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open QuickApp link"
                          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
