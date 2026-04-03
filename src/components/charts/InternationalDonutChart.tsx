import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "next-themes";

ChartJS.register(ArcElement, Tooltip, Legend);

interface InternationalBreakdown {
  total: number;
  nordurljós: number;
  vestanvind: number;
  súlnasker: number;
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
    labels: ["Norðurljós", "Vestanvind", "Súlnasker"],
    datasets: [
      {
        data: [data.nordurljós, data.vestanvind, data.súlnasker],
        backgroundColor: [
          "rgba(108, 63, 160, 0.85)", // Bifröst violet
          "rgba(42, 191, 191, 0.85)", // Aurora teal
          "rgba(232, 184, 75, 0.85)", // Bridge gold
        ],
        borderColor: [
          "#6C3FA0",
          "#2ABFBF",
          "#E8B84B",
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
          label: (context: { label?: string; parsed: number }) => {
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
