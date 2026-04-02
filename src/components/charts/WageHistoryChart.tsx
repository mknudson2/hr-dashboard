import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

interface WageHistoryRecord {
  effective_date: string;
  wage: number;
  change_reason: string | null;
  change_amount: number | null;
  change_percentage: number | null;
}

interface WageHistoryChartProps {
  data: WageHistoryRecord[];
}

export default function WageHistoryChart({ data }: WageHistoryChartProps) {
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No wage history available
      </div>
    );
  }

  const labels = data.map((record) =>
    new Date(record.effective_date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
  );

  const wages = data.map((record) => record.wage);

  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const gridColor = isDark ? "#374151" : "#e5e7eb";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Wage",
        data: wages,
        tension: 0.3,
        fill: true,
        borderWidth: 3,
        borderColor: isDark ? "#60a5fa" : "#2563eb",
        backgroundColor: isDark ? "rgba(96,165,250,0.1)" : "rgba(37,99,235,0.1)",
        pointBackgroundColor: isDark ? "#60a5fa" : "#2563eb",
        pointBorderColor: "#fff",
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? "#1f2937" : "#f9fafb",
        titleColor: isDark ? "#f3f4f6" : "#111827",
        bodyColor: isDark ? "#d1d5db" : "#374151",
        borderWidth: 1,
        borderColor: isDark ? "#374151" : "#e5e7eb",
        displayColors: false,
        callbacks: {
          title: (context: { dataIndex: number }[]) => {
            const index = context[0].dataIndex;
            const record = data[index];
            return new Date(record.effective_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            });
          },
          label: (context: { dataIndex: number }) => {
            const index = context.dataIndex;
            const record = data[index];
            const lines = [
              `Wage: $${record.wage.toLocaleString()}`,
            ];

            if (record.change_reason) {
              lines.push(`Reason: ${record.change_reason}`);
            }

            if (record.change_amount && record.change_amount > 0) {
              lines.push(
                `Increase: $${record.change_amount.toLocaleString()} (${record.change_percentage}%)`
              );
            }

            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: textColor,
          callback: (value: string | number) => `$${Number(value).toLocaleString()}`,
        },
        grid: { color: gridColor },
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  );
}
