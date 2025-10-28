import { useEffect, useState } from "react";
import { getAnalytics } from "@/services/analyticsService";
import HeadcountChart from "@/components/charts/HeadcountChart";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function DashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Total Employees", value: data?.total_employees || 5, color: "blue" },
    { label: "Active", value: data?.active_employees || 4, color: "green" },
    { label: "YTD Hires", value: data?.ytd_hires || 0, color: "purple" },
    { label: "Turnover Rate", value: data?.turnover_rate ? `${data.turnover_rate}%` : "20%", color: "red" },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div>
          <Skeleton width={300} height={36} className="mb-2" />
          <Skeleton width={150} height={20} />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
              <Skeleton width={120} height={16} className="mb-2" />
              <Skeleton width={80} height={32} />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
          <Skeleton width={200} height={24} className="mb-4" />
          <Skeleton height={320} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, Michael 👋</h1>
      <p className="text-gray-500 dark:text-gray-400">HR Dashboard</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`
              rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm
              p-4 transition-all duration-200
              hover:shadow-md hover:border-${stat.color}-500/50
            `}
          >
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {stat.label}
            </h3>
            <p
              className={`mt-2 text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <HeadcountChart data={data?.headcount_trend || [3, 4, 5]} />
    </div>
  );
}
