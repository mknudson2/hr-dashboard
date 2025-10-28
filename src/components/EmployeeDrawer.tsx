import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Line, Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
} from "chart.js";
import { X, User, Calendar, Activity, BarChart3, Clock } from "lucide-react";
import { getAnalytics } from "../services/employeeService";

ChartJS.register(LineElement, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Employee {
    id: number;
    name: string;
    status: string;
    role?: string;
    hireDate?: string;
    totalHours?: number;
    ptoUsed?: number;
    ptoAllotted?: number;
    attendance?: number[];
    terminationRisk?: string;
}

interface EmployeeDrawerProps {
    employee: Employee | null;
    onClose: () => void;
}

export default function EmployeeDrawer({ employee, onClose }: EmployeeDrawerProps) {
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        if (employee) {
            getAnalytics().then(setAnalytics).catch(console.error);
        }
    }, [employee]);

    if (!employee) return null;

    const monthlyHours = [160, 155, 162, 148, 171, 158];
    const attendance = employee.attendance || [95, 97, 92, 94, 98, 96];
    const ptoAllotted = employee.ptoAllotted ?? 120;
    const ptoUsed = employee.ptoUsed ?? 32;

    const chartData = {
        labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
        datasets: [
            {
                label: "Monthly Hours",
                data: monthlyHours,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37,99,235,0.25)",
                tension: 0.35,
                fill: true,
                pointRadius: 3,
            },
        ],
    };

    const ptoData = {
        labels: ["Used", "Remaining"],
        datasets: [
            {
                data: [ptoUsed, ptoAllotted - ptoUsed],
                backgroundColor: ["#3b82f6", "#e5e7eb"],
                borderWidth: 0,
            },
        ],
    };

    const attendanceData = {
        labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
        datasets: [
            {
                data: attendance,
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.15)",
                tension: 0.4,
                fill: true,
                pointRadius: 0,
            },
        ],
    };

    const baseOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(156,163,175,0.1)" } },
            y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(156,163,175,0.1)" } },
        },
    };

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                className="fixed inset-0 bg-black/40 z-40"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            <motion.div
                key="drawer"
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto p-6"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" /> {employee.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Info Section */}
                <div className="space-y-4">
                    <Info label="Status">
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${employee.status === "Active"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                }`}
                        >
                            {employee.status}
                        </span>
                    </Info>
                    <Info label="Role" value={employee.role} />
                    <Info label="Hire Date" value={employee.hireDate} icon={<Calendar className="w-4 h-4" />} />
                </div>

                <hr className="my-6 border-gray-300 dark:border-gray-700" />

                {/* Quick Stats */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Key Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <Stat label="Total Hours" value={`${employee.totalHours ?? 0}`} />
                    <Stat label="PTO Used" value={`${ptoUsed} hrs`} />
                    <Stat label="Tenure" value="2.4 yrs" />
                    <Stat label="Risk" value={employee.terminationRisk ?? "Low"} />
                </div>

                {/* Charts */}
                <div className="space-y-6">
                    {/* Hours Trend */}
                    <ChartCard title="Monthly Hours Trend" icon={<BarChart3 className="w-5 h-5 text-blue-500" />}>
                        <Line data={chartData} options={baseOptions} />
                    </ChartCard>

                    {/* PTO Donut */}
                    <ChartCard title="PTO Usage" icon={<Clock className="w-5 h-5 text-indigo-500" />}>
                        <div className="flex justify-center items-center h-48">
                            <Doughnut data={ptoData} options={{ cutout: "70%" }} />
                        </div>
                        <p className="text-center mt-3 text-sm text-gray-500 dark:text-gray-400">
                            {ptoUsed} of {ptoAllotted} hours used
                        </p>
                    </ChartCard>

                    {/* Attendance Sparkline */}
                    <ChartCard title="Attendance Trend" icon={<Activity className="w-5 h-5 text-green-500" />}>
                        <Line data={attendanceData} options={baseOptions} />
                    </ChartCard>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function Info({
    label,
    value,
    icon,
    children,
}: {
    label: string;
    value?: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                {icon} {label}:
            </span>
            {children ?? <span className="text-gray-900 dark:text-gray-200">{value}</span>}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    );
}

function ChartCard({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h4>
            </div>
            {children}
        </div>
    );
}
