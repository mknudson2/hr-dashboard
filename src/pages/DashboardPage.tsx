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

interface KpiCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  showDonut?: boolean;
  donutData?: {
    total: number;
    nordurljós: number;
    vestanvind: number;
    súlnasker: number;
  };
}

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
    nordurljós: number;
    vestanvind: number;
    súlnasker: number;
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
  // Bifröst accent strip gradients by category
  const accentStrips: Record<string, string> = {
    violet: 'linear-gradient(90deg, #6C3FA0, #8B5FC4)',
    teal: 'linear-gradient(90deg, #1F9E9E, #2ABFBF)',
    gold: 'linear-gradient(90deg, #D4A030, #E8B84B)',
    pink: 'linear-gradient(90deg, #E05C8A, #F47BA0)',
    navy: 'linear-gradient(90deg, #1B3A5C, #2A5580)',
    red: 'linear-gradient(90deg, #EF4444, #F97316)',
  };

  const kpis: KpiCard[] = [
    {
      title: "Total Employees",
      value: data.active_employees,
      icon: <Users className="w-5 h-5 text-bifrost-violet dark:text-bifrost-violet-light" />,
      accent: 'violet',
    },
    {
      title: "YTD Terminations",
      value: data.ytd_terminations?.total ?? 0,
      icon: <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />,
      subtitle:
        data.ytd_terminations?.voluntary !== undefined &&
          data.ytd_terminations?.involuntary !== undefined
          ? `${data.ytd_terminations.voluntary} voluntary, ${data.ytd_terminations.involuntary} involuntary`
          : undefined,
      accent: 'red',
    },
    {
      title: "Turnover Rate",
      value: `${data.turnover_rate}%`,
      icon: (
        <TrendingUp className="w-5 h-5 text-bridge-gold dark:text-bridge-gold" />
      ),
      accent: 'gold',
    },
    {
      title: "International Employees",
      value: data.international_breakdown?.total ?? 0,
      icon: (
        <Users className="w-5 h-5 text-aurora-teal dark:text-aurora-teal" />
      ),
      showDonut: true,
      donutData: data.international_breakdown,
      accent: 'teal',
    },
    {
      title: "YTD Avg Headcount",
      value: data.ytd_avg_headcount ?? "-",
      icon: <BarChart className="w-5 h-5 text-mimir-blue dark:text-well-silver" />,
      subtitle: `Current: ${data.active_employees}`,
      badge:
        data.ytd_avg_headcount &&
          data.active_employees > data.ytd_avg_headcount
          ? "Growing"
          : data.ytd_avg_headcount &&
            data.active_employees < data.ytd_avg_headcount
            ? "Declining"
            : "Stable",
      badgeColor:
        data.ytd_avg_headcount &&
          data.active_employees > data.ytd_avg_headcount
          ? "green"
          : data.ytd_avg_headcount &&
            data.active_employees < data.ytd_avg_headcount
            ? "red"
            : "blue",
      accent: 'navy',
    },
    {
      title: "Involuntary Turnover %",
      value:
        data.regrettable_turnover_pct !== undefined
          ? `${data.regrettable_turnover_pct}%`
          : "-",
      icon: <TrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />,
      subtitle:
        data.ytd_terminations?.involuntary !== undefined
          ? `${data.ytd_terminations.involuntary} of ${data.ytd_terminations?.total ?? 0} terms`
          : undefined,
      badge:
        data.regrettable_turnover_pct !== undefined
          ? data.regrettable_turnover_pct > 50
            ? "High Risk"
            : data.regrettable_turnover_pct > 30
              ? "Moderate"
              : "Low Risk"
          : undefined,
      badgeColor:
        data.regrettable_turnover_pct !== undefined
          ? data.regrettable_turnover_pct > 50
            ? "red"
            : data.regrettable_turnover_pct > 30
              ? "yellow"
              : "green"
          : "blue",
      accent: 'pink',
    },
  ];

  // ---------------------- JSX Rendering ---------------------- //
  return (
    <div className="p-6 space-y-8">
      {/* Header with Last Updated */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <BarChart className="w-5 h-5 text-gray-400" />
          <h2 className="font-display text-xl font-medium text-gray-900 dark:text-white">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          // Each card shows its 1/3 slice of the row gradient
          const colIndex = idx % 3;
          const rowIndex = Math.floor(idx / 3);
          // Row 1 colors: violet → violet-light → teal
          // Row 2 colors: teal → teal-dark → gold
          const rowColors = rowIndex === 0
            ? ['#6C3FA0', '#8B5FC4', '#2ABFBF']
            : ['#2ABFBF', '#1F9E9E', '#E8B84B'];
          // Card 0 gets color[0]→color[1], card 1 gets color[1]→color[2], card 2 gets color[2]→color[2] (end)
          // For a smooth 3-card split: card shows from its start color to its end color
          const cardGradient = colIndex === 0
            ? `linear-gradient(90deg, ${rowColors[0]}, ${rowColors[1]})`
            : colIndex === 1
              ? `linear-gradient(90deg, ${rowColors[1]}, ${rowColors[2]})`
              : `linear-gradient(90deg, ${rowColors[2]}, ${rowColors[2]})`;
          return (
          <motion.div
            key={idx}
            className="relative overflow-hidden flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300"
            whileHover={{ scale: 1.01, y: -1 }}
          >
            {/* Continuous gradient strip — different per row */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: cardGradient }}
            />

            <div className="flex items-center gap-2.5 mb-3">
              {kpi.icon}
              <span className="font-body text-xs text-gray-500 dark:text-well-silver">
                {kpi.title}
              </span>
            </div>

            {kpi.showDonut && kpi.donutData ? (
              <div className="w-full">
                <div className="text-center mb-2">
                  <span className="font-display text-3xl font-semibold text-gray-900 dark:text-white">
                    {kpi.value}
                  </span>
                </div>
                <InternationalDonutChart data={kpi.donutData} />
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <span className="font-display text-3xl font-semibold text-gray-900 dark:text-white">
                  {kpi.value}
                </span>
                {kpi.subtitle && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                    {kpi.subtitle}
                  </p>
                )}
                {kpi.badge && (
                  <span
                    className={`mt-3 px-3 py-1 rounded-md text-[10px] font-semibold ${kpi.badgeColor === "green"
                        ? "bg-aurora-teal/12 text-aurora-teal dark:bg-aurora-teal/12 dark:text-aurora-teal"
                        : kpi.badgeColor === "red"
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : kpi.badgeColor === "yellow"
                            ? "bg-bridge-gold/12 text-bridge-gold-dark dark:bg-bridge-gold/12 dark:text-bridge-gold"
                            : "bg-bifrost-violet/8 text-bifrost-violet dark:bg-bifrost-violet/12 dark:text-bifrost-violet-light"
                      }`}
                  >
                    {kpi.badge}
                  </span>
                )}
              </div>
            )}
          </motion.div>
          );
        })}
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
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF)' }} />
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
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
              labels={Object.keys(avgTenure[`by_${tenureView}`] || {})}
              values={Object.values(avgTenure[`by_${tenureView}`] || {})}
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
