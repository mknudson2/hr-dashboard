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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
    labels: string[];
    values: number[];
    title?: string;
}

export default function AvgTenureBarChart({ labels, values, title }: Props) {
    const data = {
        labels,
        datasets: [
            {
                label: "Avg Tenure (Years)",
                data: values,
                backgroundColor: "rgba(37, 99, 235, 0.7)", // Tailwind blue-600
                borderColor: "rgba(37, 99, 235, 1)",
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: !!title, text: title || "" },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: "Years" },
            },
            x: {
                ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 },
            },
        },
    };

    return <Bar data={data} options={options} />;
}
