import { LayoutDashboard, Users, FileBarChart, Settings, Heart, Scale, TrendingDown, Calendar, PiggyBank, BarChart3, DollarSign, Award, UserPlus, UserMinus, Package, Clock, LogOut, User, Shield, UserCheck, Mail, Upload, ClipboardList, CheckSquare } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import DarkModeToggle from "@/components/DarkModeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface NavigationLink {
    to: string;
    text: string;
    icon: any;
    adminOnly?: boolean;
}

const links: NavigationLink[] = [
    { to: "/dashboard", text: "Dashboard", icon: LayoutDashboard },
    { to: "/employees", text: "Employees", icon: Users },
    { to: "/onboarding", text: "Onboarding", icon: UserPlus },
    { to: "/offboarding", text: "Offboarding", icon: UserMinus },
    { to: "/payroll", text: "Payroll", icon: DollarSign },
    { to: "/equipment", text: "Equipment", icon: Package },
    { to: "/fmla", text: "FMLA", icon: Heart },
    { to: "/garnishments", text: "Garnishments", icon: Scale },
    { to: "/turnover", text: "Turnover", icon: TrendingDown },
    { to: "/events", text: "Events", icon: Calendar },
    { to: "/contributions", text: "Contributions", icon: PiggyBank },
    { to: "/overtime", text: "Overtime", icon: Clock },
    { to: "/capitalized-labor", text: "Capitalized Labor", icon: TrendingDown },
    { to: "/compensation", text: "Compensation", icon: DollarSign },
    { to: "/performance", text: "Performance", icon: Award },
    { to: "/aca", text: "ACA Compliance", icon: Shield },
    { to: "/eeo", text: "EEO Reporting", icon: UserCheck },
    { to: "/reports", text: "Reports", icon: FileBarChart },
    { to: "/advanced-analytics", text: "Advanced Analytics", icon: BarChart3 },
    { to: "/emails", text: "Email Management", icon: Mail },
    { to: "/file-uploads", text: "File Uploads", icon: Upload },
    { to: "/users", text: "User Management", icon: Users, adminOnly: true },
    { to: "/roles", text: "Role Management", icon: Shield, adminOnly: true },
    { to: "/settings", text: "Settings", icon: Settings },
];

export default function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [pageVisibility, setPageVisibility] = useState<Record<string, boolean>>({});

    // Load page visibility settings from localStorage
    useEffect(() => {
        const loadPageVisibility = () => {
            const savedPageVisibility = localStorage.getItem("hr_dashboard_page_visibility");
            if (savedPageVisibility) {
                setPageVisibility(JSON.parse(savedPageVisibility));
            }
        };

        // Load on mount
        loadPageVisibility();

        // Listen for storage changes (for cross-tab updates)
        window.addEventListener('storage', loadPageVisibility);

        // Listen for custom event (for same-tab updates)
        window.addEventListener('pageVisibilityChanged', loadPageVisibility);

        return () => {
            window.removeEventListener('storage', loadPageVisibility);
            window.removeEventListener('pageVisibilityChanged', loadPageVisibility);
        };
    }, []);

    // Convert route path to page key (e.g., "/dashboard" -> "dashboard")
    const getPageKey = (path: string) => {
        return path.replace('/', '') || 'dashboard';
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md fixed left-0 top-0 h-full flex flex-col">
                {/* Header - Fixed */}
                <div className="p-6 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR Hub</h1>
                </div>

                {/* Navigation - Scrollable */}
                <nav className="flex-1 overflow-y-auto px-6 pb-4">
                    <div className="flex flex-col gap-2">
                        {links
                            .filter(link => {
                                // Filter by admin role
                                if (link.adminOnly && user?.role !== 'admin') return false;

                                // Filter by page visibility settings (if loaded)
                                const pageKey = getPageKey(link.to);
                                if (Object.keys(pageVisibility).length > 0) {
                                    return pageVisibility[pageKey] !== false;
                                }

                                return true;
                            })
                            .map(({ to, text, icon: Icon }) => (
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
                    </div>
                </nav>

                {/* Footer - Fixed */}
                <div className="p-6 flex-shrink-0 flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700">
                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user?.full_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.role}
                                </p>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <DarkModeToggle />
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                        © Bifröstin - HR Hub
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
