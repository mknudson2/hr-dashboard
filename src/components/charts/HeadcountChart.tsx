import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

interface HeadcountTrend {
    labels: string[];
    values: number[];
}

export default function HeadcountChart({ data }: { data: HeadcountTrend }) {
    const { resolvedTheme } = useTheme();
    const [isDark, setIsDark] = useState(false);
    const [chartColor, setChartColor] = useState("#2563eb");
    const chartRef = useRef<ChartJS<"line"> | null>(null);

    useEffect(() => {
        const isDarkMode = resolvedTheme === "dark";
        setIsDark(isDarkMode);
        setChartColor(isDarkMode ? "#8B5FC4" : "#6C3FA0");
    }, [resolvedTheme]);

    // 🩵 Animate the glow color
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        let glowIntensity = 0.4;
        let increasing = true;

        const interval = setInterval(() => {
            const ctx = chart.ctx;
            const dataset = chart.config?.data?.datasets?.[0];

            // Guard against null ctx or missing dataset
            if (!ctx || !dataset) return;

            const color = isDark
                ? `rgba(139,95,196,${glowIntensity})`
                : `rgba(108,63,160,${glowIntensity})`;

            dataset.borderColor = color;
            dataset.backgroundColor = isDark
                ? `rgba(139,95,196,0.15)`
                : `rgba(108,63,160,0.12)`;

            ctx.shadowColor = color;
            ctx.shadowBlur = isDark ? 12 : 0;

            glowIntensity += increasing ? 0.05 : -0.05;
            if (glowIntensity >= 0.9) increasing = false;
            if (glowIntensity <= 0.3) increasing = true;

            chart.update("none");
        }, 100);

        return () => clearInterval(interval);
    }, [isDark]);

    // ✅ Build chart data from API structure
    const chartData = {
        labels: data?.labels ?? [],
        datasets: [
            {
                label: "Headcount",
                data: data?.values ?? [],
                tension: 0.3,
                fill: true,
                borderWidth: 3,
                borderColor: chartColor,
                backgroundColor: `${chartColor}33`,
                pointBackgroundColor: chartColor,
                pointBorderColor: "#fff",
                pointRadius: 5,
                pointHoverRadius: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false as const,
        plugins: {
            legend: {
                position: "top" as const,
                labels: {
                    color: isDark ? "#d1d5db" : "#374151",
                },
            },
            tooltip: {
                backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                titleColor: isDark ? "#f3f4f6" : "#111827",
                bodyColor: isDark ? "#d1d5db" : "#374151",
                borderWidth: 1,
                borderColor: isDark ? "#374151" : "#e5e7eb",
                displayColors: false,
                callbacks: {
                    label: (context: { parsed: { y: number } }) => `Headcount: ${context.parsed.y}`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: isDark ? "#9ca3af" : "#6b7280" },
                grid: { display: false },
            },
            y: {
                ticks: { color: isDark ? "#9ca3af" : "#6b7280" },
                grid: { color: isDark ? "#374151" : "#e5e7eb" },
                beginAtZero: true,
                grace: "10%",
            },
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={isDark ? "dark" : "light"}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4 }}
                className="
          relative overflow-hidden p-6 mt-6 rounded-2xl border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 shadow-sm transition-all duration-300
          hover:shadow-md hover:-translate-y-0.5
        "
            >
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #6C3FA0, #8B5FC4)' }} />
                <h3 className="text-lg font-display font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Headcount Trend (YTD)
                </h3>
                <div className="h-80">
                    <Line ref={chartRef} data={chartData} options={options} />
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    As of {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
            </motion.div>
        </AnimatePresence>
    );
}
