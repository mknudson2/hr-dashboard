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
  FolderPlus,
  Folder,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import FolderPickerModal from "@/components/FolderPickerModal";

const API_URL = '';

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

    // Employee folder settings
    const [folderSettings, setFolderSettings] = useState({
        base_path: "",
        subfolders: [] as string[],
        enabled: false,
    });
    const [newSubfolder, setNewSubfolder] = useState("");
    const [folderSettingsLoading, setFolderSettingsLoading] = useState(false);
    const [folderSettingsError, setFolderSettingsError] = useState<string | null>(null);
    const [folderSettingsSaved, setFolderSettingsSaved] = useState(false);
    const [showFolderPicker, setShowFolderPicker] = useState(false);

    const toggleTrackStyle = (checked: boolean) => ({
        backgroundColor: checked ? '#007AFF' : undefined,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
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
                const response = await fetch(`${API_URL}/auth/2fa/status`, {
                    credentials: 'include',
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

        // Load folder settings from backend
        const loadFolderSettings = async () => {
            try {
                const response = await fetch(`${API_URL}/settings/employee-folders`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setFolderSettings({
                        base_path: data.base_path || "",
                        subfolders: data.subfolders || [],
                        enabled: data.enabled || false,
                    });
                }
            } catch (error) {
                console.error('Failed to load folder settings:', error);
            }
        };

        loadFolderSettings();
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
            await fetch("/notifications/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: 'include',
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

    // Employee Folder Settings Functions
    const saveFolderSettings = async () => {
        setFolderSettingsLoading(true);
        setFolderSettingsError(null);
        setFolderSettingsSaved(false);

        try {
            const response = await fetch(`${API_URL}/settings/employee-folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(folderSettings),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to save folder settings');
            }

            setFolderSettingsSaved(true);
            setTimeout(() => setFolderSettingsSaved(false), 3000);
        } catch (error) {
            setFolderSettingsError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setFolderSettingsLoading(false);
        }
    };

    const addSubfolder = async () => {
        if (!newSubfolder.trim()) return;

        try {
            const response = await fetch(`${API_URL}/settings/employee-folders/add-subfolder?subfolder_name=${encodeURIComponent(newSubfolder.trim())}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add subfolder');
            }

            const data = await response.json();
            setFolderSettings({ ...folderSettings, subfolders: data.subfolders });
            setNewSubfolder("");
        } catch (error) {
            setFolderSettingsError(error instanceof Error ? error.message : 'Failed to add subfolder');
        }
    };

    const removeSubfolder = async (subfolder: string) => {
        try {
            const response = await fetch(`${API_URL}/settings/employee-folders/remove-subfolder/${encodeURIComponent(subfolder)}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to remove subfolder');
            }

            const data = await response.json();
            setFolderSettings({ ...folderSettings, subfolders: data.subfolders });
        } catch (error) {
            setFolderSettingsError(error instanceof Error ? error.message : 'Failed to remove subfolder');
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
            const response = await fetch(`${API_URL}/auth/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
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
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200" style={toggleTrackStyle(displaySettings.compactView)}></div>
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
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200" style={toggleTrackStyle(displaySettings.showTooltips)}></div>
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
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200" style={toggleTrackStyle(displaySettings.animationsEnabled)}></div>
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
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200" style={toggleTrackStyle(notifications.emailAlerts)}></div>
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
                            <div className={`w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200 ${!notifications.emailAlerts ? 'opacity-50' : ''}`} style={toggleTrackStyle(notifications.newHires)}></div>
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
                            <div className={`w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200 ${!notifications.emailAlerts ? 'opacity-50' : ''}`} style={toggleTrackStyle(notifications.terminations)}></div>
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
                            <div className={`w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200 ${!notifications.emailAlerts ? 'opacity-50' : ''}`} style={toggleTrackStyle(notifications.wageChanges)}></div>
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
                            <div className={`w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200 ${!notifications.emailAlerts ? 'opacity-50' : ''}`} style={toggleTrackStyle(notifications.weeklyReport)}></div>
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

            {/* Employee Folder Settings Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <FolderPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Employee Folder Creation
                    </h3>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Automatically create employee folders when new employees are onboarded. Folders will be named "LastName, FirstName - StateAbbreviation".
                </p>

                <div className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Enable Folder Creation</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically create folders for new hires</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={folderSettings.enabled}
                                onChange={(e) => setFolderSettings({ ...folderSettings, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200" style={toggleTrackStyle(folderSettings.enabled)}></div>
                        </label>
                    </div>

                    {/* Base Path */}
                    <div className="py-3 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Base Folder Path
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={folderSettings.base_path}
                                onChange={(e) => setFolderSettings({ ...folderSettings, base_path: e.target.value })}
                                placeholder="/path/to/employee/folders"
                                className="flex-1 rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                            <button
                                onClick={() => setShowFolderPicker(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                            >
                                <Folder className="w-4 h-4" />
                                Browse
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Enter the path manually or click Browse to select a folder
                        </p>
                    </div>

                    {/* Subfolders Management */}
                    <div className="py-3 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Default Subfolders
                        </label>

                        {/* Current Subfolders */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {folderSettings.subfolders.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No subfolders configured</p>
                            ) : (
                                folderSettings.subfolders.map((subfolder) => (
                                    <div
                                        key={subfolder}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg"
                                    >
                                        <Folder className="w-4 h-4" />
                                        <span className="text-sm font-medium">{subfolder}</span>
                                        <button
                                            onClick={() => removeSubfolder(subfolder)}
                                            className="p-0.5 hover:bg-orange-200 dark:hover:bg-orange-800 rounded transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add New Subfolder */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSubfolder}
                                onChange={(e) => setNewSubfolder(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSubfolder()}
                                placeholder="Enter subfolder name..."
                                className="flex-1 rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                            <button
                                onClick={addSubfolder}
                                disabled={!newSubfolder.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    {folderSettings.enabled && folderSettings.base_path && (
                        <div className="py-3 border-t border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Folder Structure Preview
                            </label>
                            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm">
                                <div className="text-gray-700 dark:text-gray-300">
                                    {folderSettings.base_path}/
                                </div>
                                <div className="ml-4 text-orange-600 dark:text-orange-400">
                                    └── Smith, John - TX/
                                </div>
                                {folderSettings.subfolders.map((subfolder, index) => (
                                    <div key={subfolder} className="ml-8 text-gray-600 dark:text-gray-400">
                                        {index === folderSettings.subfolders.length - 1 ? '└── ' : '├── '}{subfolder}/
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {folderSettingsError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{folderSettingsError}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {folderSettingsSaved && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-400">Settings saved successfully!</p>
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={saveFolderSettings}
                        disabled={folderSettingsLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {folderSettingsLoading ? 'Saving...' : 'Save Folder Settings'}
                    </button>
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
                                        <div className={`w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200 ${isSettings ? 'opacity-50 cursor-not-allowed' : ''}`} style={toggleTrackStyle(value)}></div>
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

            {/* Folder Picker Modal */}
            <FolderPickerModal
                isOpen={showFolderPicker}
                onClose={() => setShowFolderPicker(false)}
                onSelect={(path) => setFolderSettings({ ...folderSettings, base_path: path })}
                currentPath={folderSettings.base_path}
            />
        </div>
    );
}
