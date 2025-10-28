import { useTheme } from "next-themes";
import { useState } from "react";
import { Sun, Moon, User, Settings, Save } from "lucide-react";

export default function SettingsPage() {
    const { resolvedTheme, setTheme } = useTheme();

    const [profile, setProfile] = useState({
        name: "Michael Knudson",
        email: "michael.knudson@nbs.com",
        role: "Manager of Payroll & Benefits",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        alert("Profile settings saved! (Future DB integration here.)");
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

            {/* Preferences Section */}
            <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 transition hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <Sun className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Preferences
                    </h3>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Theme Mode
                    </span>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setTheme("light")}
                            className={`p-2 rounded-lg border ${resolvedTheme === "light"
                                    ? "bg-blue-100 border-blue-400 text-blue-700"
                                    : "dark:border-gray-700"
                                }`}
                        >
                            <Sun className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setTheme("dark")}
                            className={`p-2 rounded-lg border ${resolvedTheme === "dark"
                                    ? "bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-300"
                                    : "dark:border-gray-700"
                                }`}
                        >
                            <Moon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
