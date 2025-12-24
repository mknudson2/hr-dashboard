import { useEffect, useState } from "react";
import {
  Activity,
  Users,
  TrendingUp,
  BarChart,
  RefreshCcw,
  Clock,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  getAnalytics,
  fetchAverageTenure,
  type AvgTenureResponse,
  downloadAverageTenureExcel,
  downloadAverageTenurePDF,
} from "../services/analyticsService";
import { motion } from "framer-motion";
import HeadcountChart from "@/components/charts/HeadcountChart";
import DepartmentChart from "@/components/charts/DepartmentChart";
import InternationalDonutChart from "@/components/charts/InternationalDonutChart";
import AvgTenureBarChart from "../components/charts/AvgTenureBarChart";
import PtoUtilizationChart from "@/components/charts/PtoUtilizationChart";
import Toast from "@/components/ui/Toast";
import BirthdayWidget from "@/components/widgets/BirthdayWidget";
import TenureAnniversaryWidget from "@/components/widgets/TenureAnniversaryWidget";
import LocationDistribution from "@/components/LocationDistribution";

interface AnalyticsData {
  total_employees: number;
  active_employees: number;
  ytd_hires: number;
  ytd_terminations: {
    total: number;
    voluntary?: number;
    involuntary?: number;
  };
  turnover_rate: number;
  avg_pto_usage?: number;
  avg_attendance?: number;
  avg_tenure?: number;
  headcount_trend?: {
    labels: string[];
    values: number[];
  };
  international_breakdown: {
    total: number;
    congruent: number;
    ameripol: number;
    bloom: number;
  };
  ytd_avg_headcount?: number;
  regrettable_turnover_pct?: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [avgTenure, setAvgTenure] = useState<AvgTenureResponse | null>(null);
  const [tenureView, setTenureView] = useState<
    "cost_center" | "department" | "team"
  >("department");

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type?: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  // ---------------------- Fetch Dashboard Analytics ---------------------- //
  async function fetchData() {
    try {
      setLoading(true);
      const analytics = await getAnalytics();
      setData(analytics);
      setLastUpdated(
        new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      );
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAverageTenure();
        setAvgTenure(res);
      } catch (err) {
        console.error("Error fetching average tenure:", err);
      }
    })();
  }, []);


  // ---------------------- Toast Handlers for Downloads ---------------------- //
  const handleExcelDownload = async () => {
    try {
      setToast({ show: true, message: "Preparing Excel...", type: "success" });
      await downloadAverageTenureExcel();
      setToast({ show: true, message: "Excel downloaded.", type: "success" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        2500
      );
    } catch {
      setToast({ show: true, message: "Excel download failed.", type: "error" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        2500
      );
    }
  };

  const handlePdfDownload = async () => {
    try {
      setToast({ show: true, message: "Preparing PDF...", type: "success" });
      await downloadAverageTenurePDF();
      setToast({ show: true, message: "PDF downloaded.", type: "success" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        2500
      );
    } catch {
      setToast({ show: true, message: "PDF download failed.", type: "error" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        2500
      );
    }
  };

  // ---------------------- Conditional Rendering ---------------------- //
  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading analytics...
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-red-500">Failed to load analytics.</div>;
  }

  // ---------------------- KPI Data ---------------------- //
  const kpis = [
    {
      title: "Total Employees",
      value: data.active_employees,
      icon: <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
    },
    {
      title: "YTD Terminations",
      value: data.ytd_terminations.total,
      icon: <Activity className="w-6 h-6 text-red-600 dark:text-red-400" />,
      subtitle:
        data.ytd_terminations.voluntary !== undefined &&
          data.ytd_terminations.involuntary !== undefined
          ? `${data.ytd_terminations.voluntary} voluntary, ${data.ytd_terminations.involuntary} involuntary`
          : undefined,
    },
    {
      title: "Turnover Rate",
      value: `${data.turnover_rate}%`,
      icon: (
        <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
      ),
    },
    {
      title: "International Employees",
      value: data.international_breakdown.total,
      icon: (
        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
      ),
      showDonut: true,
      donutData: data.international_breakdown,
    },
    {
      title: "YTD Avg Headcount",
      value: (data as any).ytd_avg_headcount ?? "-",
      icon: <BarChart className="w-6 h-6 text-green-600 dark:text-green-400" />,
      subtitle: `Current: ${data.active_employees}`,
      badge:
        (data as any).ytd_avg_headcount &&
          data.active_employees > (data as any).ytd_avg_headcount
          ? "Growing"
          : (data as any).ytd_avg_headcount &&
            data.active_employees < (data as any).ytd_avg_headcount
            ? "Declining"
            : "Stable",
      badgeColor:
        (data as any).ytd_avg_headcount &&
          data.active_employees > (data as any).ytd_avg_headcount
          ? "green"
          : (data as any).ytd_avg_headcount &&
            data.active_employees < (data as any).ytd_avg_headcount
            ? "red"
            : "blue",
    },
    {
      title: "Regrettable Turnover",
      value:
        (data as any).regrettable_turnover_pct !== undefined
          ? `${(data as any).regrettable_turnover_pct}%`
          : "-",
      icon: <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />,
      subtitle:
        data.ytd_terminations.involuntary !== undefined
          ? `${data.ytd_terminations.involuntary} of ${data.ytd_terminations.total} terms`
          : undefined,
      badge:
        (data as any).regrettable_turnover_pct !== undefined
          ? (data as any).regrettable_turnover_pct > 50
            ? "High Risk"
            : (data as any).regrettable_turnover_pct > 30
              ? "Moderate"
              : "Low Risk"
          : undefined,
      badgeColor:
        (data as any).regrettable_turnover_pct !== undefined
          ? (data as any).regrettable_turnover_pct > 50
            ? "red"
            : (data as any).regrettable_turnover_pct > 30
              ? "yellow"
              : "green"
          : "blue",
    },
  ];

  // ---------------------- JSX Rendering ---------------------- //
  return (
    <div className="p-6 space-y-8">
      {/* Header with Last Updated */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <BarChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            HR Dashboard Overview
          </h2>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <RefreshCcw className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span>
            Last Updated:{" "}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {lastUpdated || "Just now"}
            </span>
          </span>
          <motion.button
            whileTap={{ rotate: 360, scale: 0.9 }}
            onClick={fetchData}
            title="Refresh Analytics"
            className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
          >
            ↻
          </motion.button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 mb-3">
              {kpi.icon}
              <span className="text-gray-700 dark:text-gray-300 font-medium text-lg">
                {kpi.title}
              </span>
            </div>

            {"showDonut" in kpi && (kpi as any).showDonut ? (
              <div className="w-full">
                <div className="text-center mb-2">
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {kpi.value}
                  </span>
                </div>
                <InternationalDonutChart data={(kpi as any).donutData as any} />
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                  {kpi.value}
                </span>
                {"subtitle" in kpi && (kpi as any).subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {(kpi as any).subtitle}
                  </p>
                )}
                {"badge" in kpi && (kpi as any).badge && (
                  <span
                    className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${(kpi as any).badgeColor === "green"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : (kpi as any).badgeColor === "red"
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : (kpi as any).badgeColor === "yellow"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      }`}
                  >
                    {(kpi as any).badge}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Birthday and Tenure Anniversary Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BirthdayWidget />
        <TenureAnniversaryWidget />
      </div>

      {/* Employee Location Distribution */}
      <LocationDistribution />

      {/* Average Tenure Section */}
      {avgTenure && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Average Tenure by {tenureView.replace("_", " ")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Overall Company Average:{" "}
                <span className="font-medium">
                  {avgTenure.overall_avg_tenure}
                </span>{" "}
                years
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExcelDownload}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Download Excel"
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button
                onClick={handlePdfDownload}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Download PDF"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>

              <select
                value={tenureView}
                onChange={(e) =>
                  setTenureView(
                    e.target.value as "cost_center" | "department" | "team"
                  )
                }
                className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 min-w-[140px]"
              >
                <option value="cost_center">Cost Center</option>
                <option value="department">Department</option>
                <option value="team">Team</option>
              </select>
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="h-96">
            <AvgTenureBarChart
              labels={Object.keys(avgTenure[`by_${tenureView}`])}
              values={Object.values(avgTenure[`by_${tenureView}`])}
              title={`Avg Tenure by ${tenureView.replace("_", " ")}`}
            />
          </div>
        </div>
      )}

      {/* Headcount Chart */}
      <HeadcountChart data={data.headcount_trend || { labels: [], values: [] }} />

      {/* Department Breakdown Chart */}
      <DepartmentChart />

      {/* PTO Utilization Chart */}
      <PtoUtilizationChart />

      {/* Inline Toast */}
      <Toast message={toast.message} type={toast.type} show={toast.show} />
    </div>
  );
}
