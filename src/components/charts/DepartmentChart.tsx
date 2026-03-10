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
import { motion } from "framer-motion";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface DeptData {
    [department: string]: { active: number; ytd_terms: number };
}

export default function DepartmentChart() {
    const { resolvedTheme } = useTheme();
    const [deptData, setDeptData] = useState<DeptData>({});
    const [stacked, setStacked] = useState(false);
    const [filter, setFilter] = useState<"department" | "cost_center" | "team">("department");

    useEffect(() => {
        async function fetchDepartments() {
            try {
                const res = await fetch(`/analytics/departments?group_by=${filter}`, {
                    credentials: 'include',
                });
                const json = await res.json();
                setDeptData(json);
            } catch (error) {
                console.error("Error fetching department summary:", error);
            }
        }
        fetchDepartments();
    }, [filter]);

    const labels = Object.keys(deptData);
    const activeCounts = labels.map((d) => deptData[d].active);
    const termCounts = labels.map((d) => deptData[d].ytd_terms);

    const textColor = resolvedTheme === "dark" ? "#e5e7eb" : "#1f2937";
    const gridColor = resolvedTheme === "dark" ? "#374151" : "#e5e7eb";

    const data = {
        labels,
        datasets: [
            {
                label: "Active",
                data: activeCounts,
                backgroundColor: "rgba(42,191,191,0.6)", // aurora-teal
                borderColor: "rgb(42,191,191)",
                borderWidth: 1.5,
                borderRadius: 6,
            },
            {
                label: "YTD Terminations",
                data: termCounts,
                backgroundColor: "rgba(232,184,75,0.6)", // bridge-gold
                borderColor: "rgb(232,184,75)",
                borderWidth: 1.5,
                borderRadius: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => `${ctx.parsed.y} employees`,
                },
            },
        },
        scales: {
            x: { stacked, ticks: { color: textColor }, grid: { color: gridColor } },
            y: {
                stacked,
                beginAtZero: true,
                ticks: { color: textColor, stepSize: 1 },
                grid: { color: gridColor },
            },
        },
        animation: { duration: 1200, easing: "easeOutQuart" as const },
    };

    return (
        <div className="relative overflow-hidden w-full mt-8 mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-gray-200 dark:border-gray-700">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #2ABFBF, #1F9E9E)' }} />
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
                    {filter === "department" ? "Department" : filter === "cost_center" ? "Cost Center" : "Team"} Breakdown — Active vs. YTD Terminations
                </h3>

                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as "department" | "cost_center" | "team")}
                        className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 min-w-[140px]"
                    >
                        <option value="department">Department</option>
                        <option value="cost_center">Cost Center</option>
                        <option value="team">Team</option>
                    </select>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setStacked(!stacked)}
                        className="px-3 py-1 text-sm rounded-md bg-bifrost-violet hover:bg-bifrost-violet-light text-white transition"
                    >
                        {stacked ? "View Grouped" : "View Stacked"}
                    </motion.button>
                </div>
            </div>

            <div className="h-80">
                {labels.length > 0 ? (
                    <Bar data={data} options={options} />
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center mt-8">
                        No department data available.
                    </p>
                )}
            </div>
        </div>
    );
}
