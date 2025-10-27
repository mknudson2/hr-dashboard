import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, BarElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip } from "chart.js";
ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

export default function AnalyticsPage() {
    const chartData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May"],
        datasets: [
            {
                label: "Headcount",
                data: [4, 4, 5, 5, 5],
                borderColor: "#2563eb",
                tension: 0.4,
                fill: false,
            },
            {
                label: "Turnover Rate",
                data: [10, 12, 15, 18, 20],
                backgroundColor: "#f97316",
                yAxisID: "y1",
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            y: { beginAtZero: true },
            y1: {
                position: "right" as const,
                grid: { drawOnChartArea: false },
            },
        },
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Workforce Overview</h2>
            <Line data={chartData} options={options} />
        </div>
    );
}
