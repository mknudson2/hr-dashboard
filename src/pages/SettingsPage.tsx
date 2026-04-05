import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Sun,
  Moon,
  User,
  Settings,
  Save,
  Bell,
  Database,
  Download,
  Trash2,
  Shield,
  Eye,
  FileText,
  Lock,
  Layout,
  FolderPlus,
  Folder,
  Plus,
  X,
  AlertTriangle,
  Loader,
  Users,
  CalendarDays,
  Link2,
  Unlink,
  CheckCircle2,
  XCircle,
  FileEdit,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import FolderPickerModal from "@/components/FolderPickerModal";
import UserManagementPage from "./UserManagementPage";
import RoleManagementPage from "./RoleManagementPage";
import ContentManagementPage from "./ContentManagementPage";

type SettingsTab = "general" | "content" | "users" | "roles";

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string; icon: typeof SlidersHorizontal; adminOnly?: boolean }> = [
  { key: "general", label: "General", icon: SlidersHorizontal },
  { key: "content", label: "Content", icon: FileEdit, adminOnly: true },
  { key: "users", label: "Users", icon: Users, adminOnly: true },
  { key: "roles", label: "Roles", icon: Shield, adminOnly: true },
];

const API_URL = '';

export default function SettingsPage() {
    const { resolvedTheme, setTheme } = useTheme();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const isAdmin = user?.role === "admin";
    const visibleTabs = SETTINGS_TABS.filter((t) => !t.adminOnly || isAdmin);
    const requestedTab = searchParams.get("tab") as SettingsTab | null;
    const initialTab: SettingsTab =
        requestedTab && visibleTabs.some((t) => t.key === requestedTab)
            ? requestedTab
            : "general";
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

    // Keep URL in sync with active tab
    useEffect(() => {
        const currentParam = searchParams.get("tab");
        if (activeTab === "general") {
            if (currentParam) {
                const next = new URLSearchParams(searchParams);
                next.delete("tab");
                setSearchParams(next, { replace: true });
            }
        } else if (currentParam !== activeTab) {
            const next = new URLSearchParams(searchParams);
            next.set("tab", activeTab);
            setSearchParams(next, { replace: true });
        }
    }, [activeTab, searchParams, setSearchParams]);

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

    // Calendar integration state
    const [calendarProviders, setCalendarProviders] = useState<string[]>([]);
    const [calendarConnection, setCalendarConnection] = useState<{
        connected: boolean;
        provider?: string;
        calendar_email?: string;
        is_active?: boolean;
        last_sync_error?: string | null;
    }>({ connected: false });
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

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

    const [shimmerAnimated, setShimmerAnimated] = useState(() => {
        const stored = localStorage.getItem('bifrost_shimmer_animated');
        return stored !== 'false';
    });

    const [pageVisibility, setPageVisibility] = useState({
        dashboard: true,
        employees: true,
        recruiting: true,
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

    // HR Contacts settings
    const [hrContacts, setHrContacts] = useState({
        retirement_contact_name: "Kat Haynie",
        equipment_return_contact_name: "",
        equipment_return_contact_email: "",
    });
    const [hrContactsLoading, setHrContactsLoading] = useState(false);
    const [hrContactsSaved, setHrContactsSaved] = useState(false);
    const [hrContactsError, setHrContactsError] = useState<string | null>(null);

    // International settings
    const [intlSettings, setIntlSettings] = useState({
        id_prefixes: ["NL", "VV", "SN"] as string[],
        prefix_labels: { "NL": "Norðurljós", "VV": "Vestanvind", "SN": "Súlnasker" } as Record<string, string>,
        contractor_contact_name: "",
        contractor_contact_email: "",
    });
    const [intlSettingsLoading, setIntlSettingsLoading] = useState(false);
    const [intlSettingsSaved, setIntlSettingsSaved] = useState(false);
    const [intlSettingsError, setIntlSettingsError] = useState<string | null>(null);
    const [newPrefix, setNewPrefix] = useState("");
    const [newPrefixLabel, setNewPrefixLabel] = useState("");

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

        // Load HR contacts settings from backend
        const loadHrContacts = async () => {
            try {
                const response = await fetch(`${API_URL}/settings/hr-contacts`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setHrContacts({
                        retirement_contact_name: data.retirement_contact_name || "Kat Haynie",
                        equipment_return_contact_name: data.equipment_return_contact_name || "",
                        equipment_return_contact_email: data.equipment_return_contact_email || "",
                    });
                }
            } catch (error) {
                console.error('Failed to load HR contacts settings:', error);
            }
        };

        loadHrContacts();

        // Load international settings from backend
        const loadIntlSettings = async () => {
            try {
                const response = await fetch(`${API_URL}/settings/international`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setIntlSettings({
                        id_prefixes: data.id_prefixes || ["NL", "VV", "SN"],
                        prefix_labels: data.prefix_labels || { "NL": "Norðurljós", "VV": "Vestanvind", "SN": "Súlnasker" },
                        contractor_contact_name: data.contractor_contact_name || "",
                        contractor_contact_email: data.contractor_contact_email || "",
                    });
                }
            } catch (error) {
                console.error('Failed to load international settings:', error);
            }
        };

        loadIntlSettings();

        // Load calendar integration status
        const loadCalendarStatus = async () => {
            try {
                const [providersRes, connectionRes] = await Promise.all([
                    fetch(`${API_URL}/calendar/providers`, { credentials: 'include' }),
                    fetch(`${API_URL}/calendar/connection`, { credentials: 'include' }),
                ]);
                if (providersRes.ok) {
                    const data = await providersRes.json();
                    setCalendarProviders(data.providers || []);
                }
                if (connectionRes.ok) {
                    const data = await connectionRes.json();
                    setCalendarConnection(data);
                }
            } catch (error) {
                console.error('Failed to load calendar status:', error);
            }
        };

        loadCalendarStatus();

        // Check URL params for calendar connection result
        const params = new URLSearchParams(window.location.search);
        if (params.get('calendar_connected')) {
            loadCalendarStatus();
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('calendar_error')) {
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
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

    const handleCalendarConnect = async (provider: string) => {
        setCalendarLoading(true);
        try {
            const res = await fetch(`${API_URL}/calendar/${provider}/auth-url`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to get auth URL');
            const data = await res.json();
            // Open OAuth in popup
            const popup = window.open(data.auth_url, 'calendar_auth', 'width=600,height=700,scrollbars=yes');
            // Poll for popup close, then refresh connection status
            const pollTimer = setInterval(async () => {
                if (!popup || popup.closed) {
                    clearInterval(pollTimer);
                    setCalendarLoading(false);
                    // Refresh connection status
                    try {
                        const connRes = await fetch(`${API_URL}/calendar/connection`, { credentials: 'include' });
                        if (connRes.ok) setCalendarConnection(await connRes.json());
                    } catch {}
                }
            }, 500);
        } catch (error) {
            console.error('Calendar connect error:', error);
            setCalendarLoading(false);
        }
    };

    const handleCalendarDisconnect = async () => {
        setCalendarLoading(true);
        try {
            const res = await fetch(`${API_URL}/calendar/disconnect`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                setCalendarConnection({ connected: false });
            }
        } catch (error) {
            console.error('Calendar disconnect error:', error);
        } finally {
            setCalendarLoading(false);
            setShowDisconnectConfirm(false);
        }
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

    // Clear Demo Data
    const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
    const [clearDemoLoading, setClearDemoLoading] = useState(false);
    const [clearDemoResult, setClearDemoResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleClearDemoData = async () => {
        setClearDemoLoading(true);
        setClearDemoResult(null);
        try {
            const response = await fetch(`${API_URL}/employees/demo-data`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to clear data');
            setClearDemoResult({ success: true, message: data.message });
            setShowClearDemoConfirm(false);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'An error occurred';
            setClearDemoResult({ success: false, message: msg });
        } finally {
            setClearDemoLoading(false);
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

    // HR Contacts Functions
    const saveHrContacts = async () => {
        setHrContactsLoading(true);
        setHrContactsError(null);
        setHrContactsSaved(false);

        try {
            const response = await fetch(`${API_URL}/settings/hr-contacts`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(hrContacts),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to save HR contacts settings');
            }

            setHrContactsSaved(true);
            setTimeout(() => setHrContactsSaved(false), 3000);
        } catch (error) {
            setHrContactsError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setHrContactsLoading(false);
        }
    };

    // International Settings Functions
    const saveIntlSettings = async () => {
        setIntlSettingsLoading(true);
        setIntlSettingsError(null);
        setIntlSettingsSaved(false);

        try {
            const response = await fetch(`${API_URL}/settings/international`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(intlSettings),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to save international settings');
            }

            setIntlSettingsSaved(true);
            setTimeout(() => setIntlSettingsSaved(false), 3000);
        } catch (error) {
            setIntlSettingsError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIntlSettingsLoading(false);
        }
    };

    const addPrefix = () => {
        const prefix = newPrefix.trim().toUpperCase();
        if (!prefix) return;
        if (intlSettings.id_prefixes.includes(prefix)) return;

        const label = newPrefixLabel.trim() || prefix;
        setIntlSettings({
            ...intlSettings,
            id_prefixes: [...intlSettings.id_prefixes, prefix],
            prefix_labels: { ...intlSettings.prefix_labels, [prefix]: label },
        });
        setNewPrefix("");
        setNewPrefixLabel("");
    };

    const removePrefix = (prefix: string) => {
        const newPrefixes = intlSettings.id_prefixes.filter(p => p !== prefix);
        const newLabels = { ...intlSettings.prefix_labels };
        delete newLabels[prefix];
        setIntlSettings({ ...intlSettings, id_prefixes: newPrefixes, prefix_labels: newLabels });
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

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-1 -mb-px">
                    {visibleTabs.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === key
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === "general" && (
            <>
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

                    {/* Sidebar Shimmer Animation */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Sidebar Shimmer Animation</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Animate the gradient bar on the sidebar edge, or keep it static</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={shimmerAnimated}
                                onChange={(e) => {
                                    const newVal = e.target.checked;
                                    setShimmerAnimated(newVal);
                                    localStorage.setItem('bifrost_shimmer_animated', String(newVal));
                                    window.dispatchEvent(new Event('shimmerSettingChanged'));
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 transition-colors duration-200" style={toggleTrackStyle(shimmerAnimated)}></div>
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

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Clear Employee Data</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Remove all employees and dependent records (PTO, reviews, wage history, etc.) to prepare for fresh data import</p>
                        </div>
                        <button
                            onClick={() => setShowClearDemoConfirm(true)}
                            disabled={clearDemoLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                        >
                            {clearDemoLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {clearDemoLoading ? 'Clearing...' : 'Clear All'}
                        </button>
                    </div>

                    {clearDemoResult && (
                        <div className={`p-3 rounded-lg text-sm ${clearDemoResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                            {clearDemoResult.message}
                        </div>
                    )}
                </div>

                {/* Clear Demo Data Confirmation Modal — rendered via portal to escape stacking context */}
                {showClearDemoConfirm && createPortal(
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999]">
                        <div className="bg-white/95 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 max-w-md mx-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear All Employee Data?</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                This will permanently delete:
                            </p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 list-disc list-inside space-y-1">
                                <li>All employee records</li>
                                <li>Wage history</li>
                                <li>Performance reviews & goals</li>
                                <li>PTO requests</li>
                                <li>FMLA cases</li>
                                <li>Onboarding & offboarding tasks</li>
                                <li>Garnishments, bonuses, documents</li>
                            </ul>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                                User accounts, roles, and system settings will not be affected. You can re-import data via the File Upload page.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowClearDemoConfirm(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearDemoData}
                                    disabled={clearDemoLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                                >
                                    {clearDemoLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    {clearDemoLoading ? 'Clearing...' : 'Yes, Clear All Data'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
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

            {/* HR Contacts Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        HR Contacts
                    </h3>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Configure HR contact information used in automated emails and documents.
                </p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            401(k) Plan Contact
                        </label>
                        <input
                            type="text"
                            value={hrContacts.retirement_contact_name}
                            onChange={(e) => setHrContacts({ ...hrContacts, retirement_contact_name: e.target.value })}
                            placeholder="Enter contact name..."
                            className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Name of the person who handles 401(k) questions. Used in exit documents emails.
                        </p>
                    </div>

                    {/* Equipment Return Label Contact */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Equipment Return Label Contact
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={hrContacts.equipment_return_contact_name}
                                    onChange={(e) => setHrContacts({ ...hrContacts, equipment_return_contact_name: e.target.value })}
                                    placeholder="Enter contact name..."
                                    className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={hrContacts.equipment_return_contact_email}
                                    onChange={(e) => setHrContacts({ ...hrContacts, equipment_return_contact_email: e.target.value })}
                                    placeholder="contact@company.com"
                                    className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Contact person for requesting prepaid return shipping labels.
                        </p>
                    </div>

                    {/* Error Message */}
                    {hrContactsError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{hrContactsError}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {hrContactsSaved && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-400">HR contacts settings saved successfully!</p>
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={saveHrContacts}
                        disabled={hrContactsLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {hrContactsLoading ? 'Saving...' : 'Save HR Contacts'}
                    </button>
                </div>
            </section>

            {/* International Employee Settings */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Layout className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        International Employee Settings
                    </h3>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Configure ID prefixes for international employee detection and contractor contact information for termination requests.
                </p>

                <div className="space-y-6">
                    {/* ID Prefixes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Employee ID Prefixes
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {intlSettings.id_prefixes.map(prefix => (
                                <span
                                    key={prefix}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg text-sm"
                                >
                                    <span className="font-mono font-semibold text-teal-700 dark:text-teal-300">{prefix}</span>
                                    <span className="text-gray-500 dark:text-gray-400">({intlSettings.prefix_labels[prefix] || prefix})</span>
                                    <button
                                        onClick={() => removePrefix(prefix)}
                                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPrefix}
                                onChange={(e) => setNewPrefix(e.target.value)}
                                placeholder="Prefix (e.g. AM)"
                                className="w-28 rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                            />
                            <input
                                type="text"
                                value={newPrefixLabel}
                                onChange={(e) => setNewPrefixLabel(e.target.value)}
                                placeholder="Label (e.g. Vestanvind)"
                                className="flex-1 rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                            <button
                                onClick={addPrefix}
                                disabled={!newPrefix.trim()}
                                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Employees whose ID starts with these prefixes are detected as international employees.
                        </p>
                    </div>

                    {/* Contractor Contact */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Contractor Contact for Termination Requests
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={intlSettings.contractor_contact_name}
                                    onChange={(e) => setIntlSettings({ ...intlSettings, contractor_contact_name: e.target.value })}
                                    placeholder="Enter contact name..."
                                    className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={intlSettings.contractor_contact_email}
                                    onChange={(e) => setIntlSettings({ ...intlSettings, contractor_contact_email: e.target.value })}
                                    placeholder="contractor@company.com"
                                    className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Contact for international employee termination requests (Norðurljós, Vestanvind, Súlnasker, etc.)
                        </p>
                    </div>

                    {/* Error / Success Messages */}
                    {intlSettingsError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{intlSettingsError}</p>
                        </div>
                    )}
                    {intlSettingsSaved && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-400">International settings saved successfully!</p>
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={saveIntlSettings}
                        disabled={intlSettingsLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {intlSettingsLoading ? 'Saving...' : 'Save International Settings'}
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

            {/* Calendar Integration Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Calendar Integration
                    </h3>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Connect your Microsoft 365 or Google Workspace calendar to auto-create interview events, generate video meeting links, and send .ics calendar invitations to candidates.
                </p>

                {/* Connection Status */}
                {calendarConnection.connected ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                    Connected to {calendarConnection.provider === 'microsoft' ? 'Microsoft 365' : 'Google Workspace'}
                                </p>
                                {calendarConnection.calendar_email && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                        {calendarConnection.calendar_email}
                                    </p>
                                )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                calendarConnection.is_active
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                                {calendarConnection.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {calendarConnection.last_sync_error && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                    Last sync error: {calendarConnection.last_sync_error}
                                </p>
                            </div>
                        )}

                        {showDisconnectConfirm ? (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-700 dark:text-red-300 flex-1">
                                    Disconnect calendar? Future interviews won't auto-sync.
                                </p>
                                <button
                                    onClick={handleCalendarDisconnect}
                                    disabled={calendarLoading}
                                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    {calendarLoading ? 'Disconnecting...' : 'Confirm'}
                                </button>
                                <button
                                    onClick={() => setShowDisconnectConfirm(false)}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowDisconnectConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Unlink className="w-4 h-4" />
                                Disconnect Calendar
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {calendarProviders.length === 0 ? (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-center">
                                <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No calendar providers configured. Ask your administrator to set up Microsoft 365 or Google Workspace credentials.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {calendarProviders.includes('microsoft') && (
                                    <button
                                        onClick={() => handleCalendarConnect('microsoft')}
                                        disabled={calendarLoading}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
                                    >
                                        <div className="w-10 h-10 bg-[#0078D4] rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">M</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {calendarLoading ? 'Connecting...' : 'Connect Microsoft 365'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Outlook calendar + Teams meetings
                                            </p>
                                        </div>
                                    </button>
                                )}
                                {calendarProviders.includes('google') && (
                                    <button
                                        onClick={() => handleCalendarConnect('google')}
                                        disabled={calendarLoading}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
                                    >
                                        <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="font-bold text-sm" style={{ color: '#4285F4' }}>G</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {calendarLoading ? 'Connecting...' : 'Connect Google Workspace'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Google Calendar + Meet meetings
                                            </p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>
            </>
            )}

            {activeTab === "content" && isAdmin && <ContentManagementPage embedded />}
            {activeTab === "users" && isAdmin && <UserManagementPage embedded />}
            {activeTab === "roles" && isAdmin && <RoleManagementPage embedded />}

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
