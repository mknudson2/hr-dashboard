import { Home, Users, BarChart, Clock, CheckSquare, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Sidebar() {
    const navItems = [
        { label: "Dashboard", icon: <Home />, path: "/" },
        { label: "Employees", icon: <Users />, path: "/employees" },
        { label: "Analytics", icon: <BarChart />, path: "/analytics" },
        { label: "Time Tracking", icon: <Clock />, path: "/time-tracking" },
        { label: "Timesheet Approval", icon: <CheckSquare />, path: "/timesheet-approval" },
        { label: "Capitalization Analytics", icon: <TrendingUp />, path: "/capitalization-analytics" },
    ];

    return (
        <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
            <h2 className="text-2xl font-bold mb-6">HR Dashboard</h2>
            <nav className="space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-3 p-3 hover:bg-gray-700 rounded"
                    >
                        {item.icon} {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
