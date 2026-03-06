import { useEffect, useState } from "react";
import { Award, Calendar, FileText, Star, Check } from "lucide-react";
import { motion } from "framer-motion";

interface Anniversary {
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: string;
    hire_date: string | null;
    hire_month: number;
    hire_day: number | null;
    years_of_service: number;
    show_exact_dates: boolean;
    has_milestone_bonus?: boolean;
    milestone_bonus_paid?: boolean;
}

interface AnniversaryData {
    month: string;
    year: number;
    count: number;
    anniversaries: Anniversary[];
}

export default function TenureAnniversaryWidget() {
    const [data, setData] = useState<AnniversaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        async function fetchAnniversaries() {
            try {
                const res = await fetch("/analytics/tenure-anniversaries", {
                    credentials: 'include',
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Error fetching tenure anniversaries:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAnniversaries();
    }, []);

    const handleExportPDF = async () => {
        try {
            setExporting(true);
            const res = await fetch("/analytics/tenure-anniversaries/export/pdf", {
                credentials: 'include',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `anniversaries_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting anniversaries PDF:", error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
                <div className="text-gray-500 dark:text-gray-400">Loading anniversaries...</div>
            </div>
        );
    }

    if (!data || !data.anniversaries) {
        return null;
    }

    // Check if years is a 5-year milestone (5, 10, 15, 20, 25, 30, etc.)
    const isMilestone = (years: number) => {
        return years >= 5 && years % 5 === 0;
    };

    const getYearsBadgeColor = (years: number) => {
        if (years >= 20) return "bg-bifrost-violet/15 text-bifrost-violet dark:bg-bifrost-violet/30 dark:text-bifrost-violet-light border border-bifrost-violet/20 dark:border-bifrost-violet-light/30";
        if (years >= 10) return "bg-bifrost-violet/10 text-bifrost-violet dark:bg-bifrost-violet/25 dark:text-bifrost-violet-light border border-bifrost-violet/15 dark:border-bifrost-violet-light/25";
        if (years >= 5) return "bg-aurora-teal/10 text-aurora-teal-dark dark:bg-aurora-teal/25 dark:text-aurora-teal border border-aurora-teal/15 dark:border-aurora-teal/30";
        return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 border border-gray-200 dark:border-white/15";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-aurora-teal/8 dark:bg-aurora-teal/15">
                        <Award className="w-5 h-5 text-aurora-teal-dark dark:text-aurora-teal" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {data.month} Anniversaries
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {data.count} work {data.count === 1 ? 'anniversary' : 'anniversaries'} this month
                        </p>
                    </div>
                </div>
                {/* Export Button */}
                <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors"
                    title="Export to PDF"
                >
                    <FileText className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'PDF'}
                </button>
            </div>

            {/* Anniversary List */}
            {data.count === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No work anniversaries this month
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.anniversaries.map((anniversary, idx) => (
                        <motion.div
                            key={anniversary.employee_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-aurora-teal/8 dark:bg-aurora-teal/15 text-aurora-teal-dark dark:text-aurora-teal font-display font-semibold">
                                    {anniversary.show_exact_dates && anniversary.hire_day
                                        ? anniversary.hire_day
                                        : <Award className="w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {anniversary.full_name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {anniversary.department}
                                        {anniversary.show_exact_dates && anniversary.hire_day && (
                                            <span className="ml-2">
                                                • {data.month} {anniversary.hire_day}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Milestone Badge */}
                                {isMilestone(anniversary.years_of_service) && (
                                    <div className="relative group">
                                        {anniversary.milestone_bonus_paid ? (
                                            <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 animate-pulse">
                                                <Star className="w-4 h-4" />
                                            </div>
                                        )}
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                                            <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                                {anniversary.milestone_bonus_paid
                                                    ? 'Anniversary bonus paid'
                                                    : `$${anniversary.years_of_service * 25} anniversary bonus pending`}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getYearsBadgeColor(anniversary.years_of_service)}`}>
                                    {anniversary.years_of_service} {anniversary.years_of_service === 1 ? 'year' : 'years'}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
