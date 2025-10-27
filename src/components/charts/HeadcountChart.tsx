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

export default function HeadcountChart({ data }: { data: number[] }) {
    const { theme } = useTheme();
    const [isDark, setIsDark] = useState(false);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        setIsDark(theme === "dark");
    }, [theme]);

    // 🩵 Animate the glow color
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        let glowIntensity = 0.4;
        let increasing = true;

        const interval = setInterval(() => {
            const ctx = chart.ctx;
            const dataset = chart.config.data.datasets[0];
            const color = isDark
                ? `rgba(96,165,250,${glowIntensity})`
                : `rgba(37,99,235,${glowIntensity})`;

            dataset.borderColor = color;
            dataset.backgroundColor = isDark
                ? `rgba(96,165,250,0.15)`
                : `rgba(37,99,235,0.12)`;

            ctx.shadowColor = color;
            ctx.shadowBlur = isDark ? 12 : 0;

            glowIntensity += increasing ? 0.05 : -0.05;
            if (glowIntensity >= 0.9) increasing = false;
            if (glowIntensity <= 0.3) increasing = true;

            chart.update("none");
        }, 100);

        return () => clearInterval(interval);
    }, [isDark]);

    const chartData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May"],
        datasets: [
            {
                label: "Headcount",
                data,
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                borderColor: isDark ? "rgba(96,165,250,0.7)" : "rgba(37,99,235,0.7)",
                backgroundColor: isDark
                    ? "rgba(96,165,250,0.15)"
                    : "rgba(37,99,235,0.12)",
                pointRadius: 4,
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
                labels: {
                    color: isDark ? "#e5e7eb" : "#374151",
                },
            },
        },
        scales: {
            x: {
                ticks: { color: isDark ? "#9ca3af" : "#4b5563" },
                grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
            },
            y: {
                ticks: { color: isDark ? "#9ca3af" : "#4b5563" },
                grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
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
                className="h-80 relative"
            >
                <Line ref={chartRef} data={chartData} options={options} />
            </motion.div>
        </AnimatePresence>
    );
}
