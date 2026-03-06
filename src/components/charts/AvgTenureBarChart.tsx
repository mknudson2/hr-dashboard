import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { useTheme } from "next-themes";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
    labels: string[];
    values: number[];
    title?: string;
}

export default function AvgTenureBarChart({ labels, values, title }: Props) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const textColor = isDark ? "#e5e7eb" : "#1f2937";
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

    const data = {
        labels,
        datasets: [
            {
                label: "Avg Tenure (Years)",
                data: values,
                backgroundColor: isDark ? "rgba(108, 63, 160, 0.7)" : "rgba(37, 99, 235, 0.7)",
                borderColor: isDark ? "#8B5FC4" : "rgba(37, 99, 235, 1)",
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: !!title,
                text: title || "",
                color: textColor,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: "Years", color: textColor },
                ticks: { color: textColor },
                grid: { color: gridColor },
            },
            x: {
                ticks: { autoSkip: false, maxRotation: 45, minRotation: 0, color: textColor },
                grid: { color: gridColor },
            },
        },
    };

    return <Bar data={data} options={options} />;
}
