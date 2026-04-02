import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface PTOUtilizationResponse {
    by_department: Record<string, number>;
    by_cost_center: Record<string, number>;
    by_team: Record<string, number>;
    as_of: string;
}

export default function DepartmentChart() {
    const { resolvedTheme } = useTheme();
    const [isDark, setIsDark] = useState(false);
    const [chartColor, setChartColor] = useState("#3b82f6");
    const [filter, setFilter] = useState<"department" | "cost_center" | "team">("department");
    const [data, setData] = useState<PTOUtilizationResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // 🌙 Theme
    useEffect(() => {
        const dark = resolvedTheme === "dark";
        setIsDark(dark);
        setChartColor(dark ? "#2ABFBF" : "#1F9E9E");
    }, [resolvedTheme]);

    // 📊 Fetch PTO Utilization
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/analytics/pto-utilization", {
                    credentials: 'include',
                });
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Error fetching PTO utilization:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400">
                <Loader2 className="animate-spin h-5 w-5 mb-2" />
                Loading PTO utilization...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 text-center text-red-500">
                Failed to load PTO utilization data.
            </div>
        );
    }

    // ✅ Choose grouping
    const currentData =
        filter === "department"
            ? data.by_department
            : filter === "cost_center"
                ? data.by_cost_center
                : data.by_team;

    const labels = Object.keys(currentData);
    const values = Object.values(currentData);

    const textColor = isDark ? "#e5e7eb" : "#1f2937";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    const chartData = {
        labels,
        datasets: [
            {
                label: "Average PTO Utilization (%)",
                data: values,
                backgroundColor: `${chartColor}88`,
                borderColor: chartColor,
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: `${chartColor}cc`,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: "easeOutQuart" as const },
        plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
                backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                titleColor: isDark ? "#f3f4f6" : "#111827",
                bodyColor: isDark ? "#d1d5db" : "#374151",
                borderWidth: 1,
                borderColor: isDark ? "#374151" : "#e5e7eb",
                displayColors: false,
                callbacks: {
                    label: (ctx: { label: string; parsed: { y: number } }) => `${ctx.label}: ${ctx.parsed.y.toFixed(2)}%`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: textColor, font: { size: 12 } },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                grace: "10%",
                ticks: {
                    color: textColor,
                    callback: (value: string | number) => `${value}%`,
                },
                grid: { color: gridColor },
            },
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`${filter}-${isDark ? "dark" : "light"}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4 }}
                className="
          relative overflow-hidden p-6 mt-8 rounded-2xl border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 shadow-sm transition-all duration-300
          hover:shadow-md hover:-translate-y-0.5
        "
            >
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #E8B84B, #D4A030)' }} />
                {/* Header */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-gray-100">
                        PTO Utilization by {filter.replace("_", " ")}
                    </h3>

                    {/* Filter Selector */}
                    <select
                        value={filter}
                        onChange={(e) =>
                            setFilter(e.target.value as "department" | "cost_center" | "team")
                        }
                        className="text-sm rounded-md border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
              px-3 py-1.5 min-w-[140px]"
                    >
                        <option value="department">Department</option>
                        <option value="cost_center">Cost Center</option>
                        <option value="team">Team</option>
                    </select>
                </div>

                {/* Chart */}
                <div className="h-96">
                    {labels.length > 0 ? (
                        <Bar data={chartData} options={options} />
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center mt-12">
                            No data available for this view.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    As of{" "}
                    {new Date(data.as_of).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                </p>
            </motion.div>
        </AnimatePresence>
    );
}
