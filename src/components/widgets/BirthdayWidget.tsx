import { useEffect, useState } from "react";
import { Cake, Calendar, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { API_URL } from "@/config/api";

interface Birthday {
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: string;
    birth_date: string | null;
    birth_month: number;
    birth_day: number | null;
    age: number;
    show_exact_dates: boolean;
}

interface BirthdayData {
    month: string;
    year: number;
    count: number;
    birthdays: Birthday[];
}

export default function BirthdayWidget() {
    const [data, setData] = useState<BirthdayData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        async function fetchBirthdays() {
            try {
                const res = await fetch(`${API_URL}/analytics/birthdays`, {
                    credentials: 'include',
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Error fetching birthdays:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchBirthdays();
    }, []);

    const handleExportPDF = async () => {
        try {
            setExporting(true);
            const res = await fetch(`${API_URL}/analytics/birthdays/export/pdf`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `birthdays_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting birthdays PDF:", error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
                <div className="text-gray-500 dark:text-gray-400">Loading birthdays...</div>
            </div>
        );
    }

    if (!data || !data.birthdays) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-bifrost-violet/8 dark:bg-bifrost-violet/15">
                        <Cake className="w-5 h-5 text-bifrost-violet dark:text-bifrost-violet-light" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {data.month} Birthdays
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {data.count} {data.count === 1 ? 'birthday' : 'birthdays'} this month
                        </p>
                    </div>
                </div>
                {/* Export Button */}
                <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500/12 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold transition-colors"
                    title="Export to PDF"
                >
                    <FileText className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'PDF'}
                </button>
            </div>

            {/* Birthday List */}
            {data.count === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No birthdays this month
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.birthdays.map((birthday, idx) => (
                        <motion.div
                            key={birthday.employee_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-bifrost-violet/8 dark:bg-bifrost-violet/15 text-bifrost-violet dark:text-bifrost-violet-light font-display font-semibold">
                                    {birthday.show_exact_dates && birthday.birth_day
                                        ? birthday.birth_day
                                        : <Cake className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {birthday.full_name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {birthday.department}
                                        {birthday.show_exact_dates && birthday.birth_day && (
                                            <span className="ml-2">
                                                • {data.month} {birthday.birth_day}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
