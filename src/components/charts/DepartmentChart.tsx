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

    useEffect(() => {
        async function fetchDepartments() {
            try {
                const res = await fetch("http://127.0.0.1:8000/analytics/departments");
                const json = await res.json();
                setDeptData(json);
            } catch (error) {
                console.error("Error fetching department summary:", error);
            }
        }
        fetchDepartments();
    }, []);

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
                backgroundColor: "rgba(34,197,94,0.6)", // green
                borderColor: "rgb(34,197,94)",
                borderWidth: 1.5,
                borderRadius: 6,
            },
            {
                label: "YTD Terminations",
                data: termCounts,
                backgroundColor: "rgba(239,68,68,0.6)", // red
                borderColor: "rgb(239,68,68)",
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
        <div className="w-full h-80 mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow border dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Department Breakdown — Active vs. YTD Terminations
                </h3>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStacked(!stacked)}
                    className="px-3 py-1 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                    {stacked ? "View Grouped" : "View Stacked"}
                </motion.button>
            </div>

            {labels.length > 0 ? (
                <Bar data={data} options={options} />
            ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center mt-8">
                    No department data available.
                </p>
            )}
        </div>
    );
}
