import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "next-themes";

ChartJS.register(ArcElement, Tooltip, Legend);

interface InternationalBreakdown {
  total: number;
  congruent: number;
  ameripol: number;
  bloom: number;
}

interface InternationalDonutChartProps {
  data: InternationalBreakdown;
}

export default function InternationalDonutChart({
  data,
}: InternationalDonutChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Guard against undefined data
  if (!data) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = {
    labels: ["Congruent", "Ameripol", "Bloom"],
    datasets: [
      {
        data: [data.congruent, data.ameripol, data.bloom],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)", // blue
          "rgba(16, 185, 129, 0.8)", // green
          "rgba(251, 146, 60, 0.8)", // orange
        ],
        borderColor: [
          "rgb(59, 130, 246)",
          "rgb(16, 185, 129)",
          "rgb(251, 146, 60)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: isDark ? "#e5e7eb" : "#1f2937",
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = data.total;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="w-full h-32">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
