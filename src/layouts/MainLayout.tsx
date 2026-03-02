import { LayoutDashboard, Users, FileBarChart, Settings, Heart, Scale, TrendingDown, Calendar, PiggyBank, BarChart3, DollarSign, Award, UserPlus, UserMinus, Package, Clock, LogOut, User, Shield, UserCheck, Mail, Upload, ClipboardList, CheckSquare, FileEdit } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import DarkModeToggle from "@/components/DarkModeToggle";
import NotificationBell from "@/components/NotificationBell";
import BifrostAdminLogo from "@/components/BifrostAdminLogo";
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
    { to: "/content-management", text: "Content Management", icon: FileEdit, adminOnly: true },
    { to: "/users", text: "User Management", icon: Users, adminOnly: true },
    { to: "/roles", text: "Role Management", icon: Shield, adminOnly: true },
    { to: "/par-approvals", text: "HR Request Approvals", icon: ClipboardList, adminOnly: true },
    { to: "/settings", text: "Settings", icon: Settings },
];

export default function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [pageVisibility, setPageVisibility] = useState<Record<string, boolean>>({});
    const [shimmerAnimated, setShimmerAnimated] = useState(() => {
        const stored = localStorage.getItem('bifrost_shimmer_animated');
        return stored !== 'false';
    });

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

    // Listen for shimmer setting changes from SettingsPage
    useEffect(() => {
        const handleShimmerChange = () => {
            const stored = localStorage.getItem('bifrost_shimmer_animated');
            setShimmerAnimated(stored !== 'false');
        };
        window.addEventListener('shimmerSettingChanged', handleShimmerChange);
        return () => window.removeEventListener('shimmerSettingChanged', handleShimmerChange);
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
            {/* Sidebar with shimmer bar */}
            <aside className="w-[233px] fixed left-0 top-0 h-full flex">
                {/* Vertical shimmer bar */}
                <div className={`w-[3px] h-full bifrost-shimmer-v ${shimmerAnimated ? '' : 'static'} flex-shrink-0`} />
                {/* Sidebar content */}
                <div className="flex-1 bg-white dark:bg-gray-800 shadow-md flex flex-col">
                    {/* Header - Fixed */}
                    <div className="p-5 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <BifrostAdminLogo />
                            <NotificationBell />
                        </div>
                    </div>

                    {/* Navigation - Scrollable */}
                    <nav className="flex-1 overflow-y-auto px-3 pb-4">
                        <div className="flex flex-col gap-1">
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
                                        `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition ${isActive
                                            ? "bg-bifrost-violet/10 dark:bg-bifrost-violet/15 text-bifrost-violet dark:text-white font-semibold border-l-[3px] border-bifrost-violet -ml-[3px]"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        }`
                                    }
                                >
                                    <Icon size={16} />
                                    {text}
                                </NavLink>
                            ))}
                        </div>
                    </nav>

                    {/* Footer - Fixed */}
                    <div className="p-4 flex-shrink-0 flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700">
                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bifrost-violet to-aurora-teal flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">
                                        {user?.full_name}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
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
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center">
                            © Bifröstin — HR Hub
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content — aurora in dark mode, realm-white in light */}
            <main className="flex-1 ml-[233px] p-8 overflow-y-auto bg-realm-white dark-aurora-main relative">
                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
