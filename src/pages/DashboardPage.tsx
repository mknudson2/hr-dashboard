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
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_employees}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Active</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.active_employees}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">YTD Hires</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.ytd_hires}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Turnover Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.turnover_rate}%</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                <h3 className="mb-4 font-medium text-gray-900 dark:text-white">Headcount Trend</h3>
                <div className="h-80">
                    <HeadcountChart data={data.headcount_trend || [3, 4, 5]} />
                </div>
            </div>
        </div>
    );
}
