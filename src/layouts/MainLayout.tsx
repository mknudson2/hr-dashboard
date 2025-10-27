import { LayoutDashboard, Users, FileBarChart, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import DarkModeToggle from "@/components/DarkModeToggle";

const links = [
    { to: "/dashboard", text: "Dashboard", icon: LayoutDashboard },
    { to: "/employees", text: "Employees", icon: Users },
    { to: "/reports", text: "Reports", icon: FileBarChart },
    { to: "/settings", text: "Settings", icon: Settings },
];

export default function MainLayout() {
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md p-6 fixed left-0 top-0 h-full flex flex-col justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-10 text-gray-900 dark:text-white">HR Hub</h1>
                    <nav className="flex flex-col gap-2">
                        {links.map(({ to, text, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-2 rounded-md font-medium transition ${isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`
                                }
                            >
                                <Icon size={18} />
                                {text}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className="flex flex-col gap-3">
                    <DarkModeToggle />
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                        © {new Date().getFullYear()} NBS HR Dashboard
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto bg-gray-100 dark:bg-gray-900">
                <Outlet />
            </main>
        </div>
    );
}
