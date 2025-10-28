import { useEffect, useState } from "react";
import { getAnalytics } from "../services/analyticsService";


export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then((data) => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
        Reports & Analytics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Summary Section */}
        <div className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Year-to-Date Summary
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>Total Employees: {analytics.total_employees}</li>
            <li>Active Employees: {analytics.active_employees}</li>
            <li>YTD Hires: {analytics.ytd_hires}</li>
            <li>Terminations: {analytics.ytd_terminations.total}</li>
            <li>Turnover Rate: {analytics.turnover_rate}%</li>
          </ul>
        </div>

        {/* Export Section */}
        <div className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Export Reports
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Download current HR data in multiple formats for sharing or recordkeeping.
          </p>

          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={() => alert("PDF export coming soon")}
            >
              Export PDF
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
              onClick={() => alert("Excel export coming soon")}
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
