import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  User,
  Settings,
  Save,
  Bell,
  Database,
  Download,
  Upload,
  Trash2,
  Shield,
  Mail,
  Eye,
  FileText,
  Lock,
  Layout,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const API_URL = 'http://localhost:8000';

export default function SettingsPage() {
    const { resolvedTheme, setTheme } = useTheme();
    const { user } = useAuth();

    const [profile, setProfile] = useState({
        name: user?.full_name || "",
        email: user?.email || "",
        role: user?.role || "",
    });

    const [show2FASetup, setShow2FASetup] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [loading2FA, setLoading2FA] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        newHires: true,
        terminations: true,
        wageChanges: false,
        ptoRequests: true,
        weeklyReport: true,
    });

    const [displaySettings, setDisplaySettings] = useState({
        compactView: false,
        showTooltips: true,
        animationsEnabled: true,
        defaultView: "dashboard",
    });

    const [pageVisibility, setPageVisibility] = useState({
        dashboard: true,
        employees: true,
        onboarding: true,
        offboarding: true,
        equipment: true,
        fmla: true,
        garnishments: true,
        turnover: true,
        events: true,
        contributions: true,
        overtime: true,
        compensation: true,
        performance: true,
        aca: true,
        eeo: true,
        reports: true,
        "advanced-analytics": true,
        users: true,
        settings: true,
    });

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedProfile = localStorage.getItem("hr_dashboard_profile");
        const savedNotifications = localStorage.getItem("hr_dashboard_notifications");
        const savedDisplaySettings = localStorage.getItem("hr_dashboard_display");
        const savedPageVisibility = localStorage.getItem("hr_dashboard_page_visibility");

        if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
        }
        if (savedNotifications) {
            setNotifications(JSON.parse(savedNotifications));
        }
        if (savedDisplaySettings) {
            setDisplaySettings(JSON.parse(savedDisplaySettings));
        }
        if (savedPageVisibility) {
            setPageVisibility(JSON.parse(savedPageVisibility));
        }

        // Mark initial load as complete
        setIsInitialLoad(false);

        // Check 2FA status
        const check2FAStatus = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`${API_URL}/auth/2fa/status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setTwoFAEnabled(data.enabled);
                }
            } catch (error) {
                console.error('Failed to check 2FA status:', error);
            }
        };

        check2FAStatus();
    }, []);

    // Save notifications to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("hr_dashboard_notifications", JSON.stringify(notifications));
        // Send to backend to update preferences
        saveNotificationPreferences(notifications);
    }, [notifications]);

    // Save display settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("hr_dashboard_display", JSON.stringify(displaySettings));
    }, [displaySettings]);

    // Save page visibility to localStorage whenever it changes
    useEffect(() => {
        // Skip saving on initial load
        if (isInitialLoad) return;

        localStorage.setItem("hr_dashboard_page_visibility", JSON.stringify(pageVisibility));
        // Dispatch custom event to notify MainLayout of changes
        window.dispatchEvent(new Event('pageVisibilityChanged'));
    }, [pageVisibility, isInitialLoad]);

    // Save notification preferences to backend
    const saveNotificationPreferences = async (prefs: typeof notifications) => {
        try {
            await fetch("http://127.0.0.1:8000/notifications/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: profile.email,
                    preferences: prefs,
                }),
            });
        } catch (error) {
            console.error("Error saving notification preferences:", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        localStorage.setItem("hr_dashboard_profile", JSON.stringify(profile));
        alert("Profile settings saved!");
    };

    const handleExportSettings = () => {
        const settings = {
            profile,
            notifications,
            displaySettings,
            theme: resolvedTheme,
        };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "dashboard_settings.json";
        link.click();
    };

    const handleClearCache = () => {
        if (confirm("Are you sure you want to clear all cached data? This will reload the page.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    // 2FA Functions
    const handleEnable2FA = () => {
        setShow2FASetup(true);
    };

    const handleDisable2FA = async () => {
        const password = prompt('Enter your password to disable 2FA:');
        if (!password) return;

        setLoading2FA(true);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/auth/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ current_password: password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to disable 2FA');
            }

            setTwoFAEnabled(false);
            alert('Two-Factor Authentication has been disabled.');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to disable 2FA');
        } finally {
            setLoading2FA(false);
        }
    };

    const handle2FASetupSuccess = () => {
        setTwoFAEnabled(true);
        alert('Two-Factor Authentication has been enabled successfully!');
    };

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Settings
                </h2>
            </div>

            {/* User Profile Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Profile Information
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={profile.name}
                            onChange={handleChange}
                            className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={handleChange}
                            className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Role / Title
                        </label>
                        <input
                            type="text"
                            name="role"
                            value={profile.role}
                            onChange={handleChange}
                            className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                >
                    <Save className="w-4 h-4" /> Save Changes
                </button>
            </section>

            {/* Appearance Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Appearance & Display
                    </h3>
                </div>

                <div className="space-y-4">
                    {/* Theme Mode */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Theme Mode</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Choose light or dark theme</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setTheme("light")}
                                className={`p-2 rounded-lg border transition-colors ${
                                    resolvedTheme === "light"
                                        ? "bg-blue-100 border-blue-400 text-blue-700"
                                        : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Sun className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`p-2 rounded-lg border transition-colors ${
                                    resolvedTheme === "dark"
                                        ? "bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-300"
                                        : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Moon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Compact View */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Compact View</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Reduce spacing and padding</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={displaySettings.compactView}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, compactView: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Show Tooltips */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Show Tooltips</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Display helpful tooltips on hover</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={displaySettings.showTooltips}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, showTooltips: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Animations */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Enable Animations</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Show smooth transitions and animations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={displaySettings.animationsEnabled}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, animationsEnabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Default View */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Default Landing Page</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Page to show on login</p>
                        </div>
                        <select
                            value={displaySettings.defaultView}
                            onChange={(e) => setDisplaySettings({ ...displaySettings, defaultView: e.target.value })}
                            className="border dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="dashboard">Dashboard</option>
                            <option value="employees">Employees</option>
                            <option value="reports">Reports</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Notifications Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Notifications
                    </h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Email Alerts</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Receive email notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.emailAlerts}
                                onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">New Hires</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Notify when new employees are added</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.newHires}
                                onChange={(e) => setNotifications({ ...notifications, newHires: e.target.checked })}
                                className="sr-only peer"
                                disabled={!notifications.emailAlerts}
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Terminations</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Notify about employee terminations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.terminations}
                                onChange={(e) => setNotifications({ ...notifications, terminations: e.target.checked })}
                                className="sr-only peer"
                                disabled={!notifications.emailAlerts}
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Wage Changes</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Notify about compensation updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.wageChanges}
                                onChange={(e) => setNotifications({ ...notifications, wageChanges: e.target.checked })}
                                className="sr-only peer"
                                disabled={!notifications.emailAlerts}
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Weekly Summary Report</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly analytics summary</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.weeklyReport}
                                onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                                className="sr-only peer"
                                disabled={!notifications.emailAlerts}
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                </div>
            </section>

            {/* Data Management Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Data Management
                    </h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Export Settings</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Download your preferences as JSON</p>
                        </div>
                        <button
                            onClick={handleExportSettings}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Clear Cache</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Remove all cached data and reload</p>
                        </div>
                        <button
                            onClick={handleClearCache}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        About
                    </h3>
                </div>

                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p><strong>Application:</strong> NBS HR Dashboard</p>
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        © 2025 NBS HR Dashboard. Built for comprehensive HR analytics and employee management.
                    </p>
                </div>
            </section>

            {/* Security Section - Two-Factor Authentication */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Security
                    </h3>
                </div>

                <div className="space-y-6">
                    {/* Change Password */}
                    <div className="flex items-start justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                Password
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Change your password to keep your account secure.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowPasswordChange(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                        >
                            <Lock className="w-4 h-4" />
                            Change Password
                        </button>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                Two-Factor Authentication (2FA)
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Add an extra layer of security to your account by requiring a code from your phone in addition to your password.
                            </p>
                            {twoFAEnabled && (
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                                    <Shield className="w-4 h-4" />
                                    <span>Enabled</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={twoFAEnabled ? handleDisable2FA : handleEnable2FA}
                            disabled={loading2FA}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                twoFAEnabled
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            } disabled:opacity-50`}
                        >
                            {loading2FA ? 'Processing...' : (twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Page Visibility Section - Admin Only */}
            {user?.role === 'admin' && (
                <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <Layout className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Page Visibility
                        </h3>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Control which pages are visible in the sidebar navigation. This setting applies organization-wide for all users.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(pageVisibility).map(([key, value]) => {
                            // Format page name for display
                            const pageName = key
                                .split('-')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');

                            // Settings page is always visible
                            const isSettings = key === 'settings';

                            return (
                                <div
                                    key={key}
                                    className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
                                        isSettings
                                            ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <span className={`text-sm font-medium ${
                                            isSettings
                                                ? 'text-gray-500 dark:text-gray-400'
                                                : 'text-gray-900 dark:text-gray-100'
                                        }`}>
                                            {pageName}
                                        </span>
                                        {isSettings && (
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                                Always visible
                                            </p>
                                        )}
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            disabled={isSettings}
                                            onChange={(e) => setPageVisibility({
                                                ...pageVisibility,
                                                [key]: e.target.checked
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-4 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${
                                            value
                                                ? 'bg-blue-600 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white'
                                                : 'bg-red-500 peer-focus:ring-red-300 dark:peer-focus:ring-red-800'
                                        } ${isSettings ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Note:</strong> These settings are saved locally and will apply immediately to your navigation. Hidden pages will not be accessible from the sidebar.
                        </p>
                    </div>
                </section>
            )}

            {/* 2FA Setup Modal */}
            <TwoFactorSetupModal
                isOpen={show2FASetup}
                onClose={() => setShow2FASetup(false)}
                onSuccess={handle2FASetupSuccess}
            />

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={showPasswordChange}
                onClose={() => setShowPasswordChange(false)}
                isRequired={false}
                onSuccess={() => setShowPasswordChange(false)}
            />
        </div>
    );
}
