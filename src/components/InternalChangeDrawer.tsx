import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Calendar, ArrowRight, Briefcase, Building2, FileText, Trash2 } from "lucide-react";

interface InternalChangeDetail {
    id: number;
    employee_id: string;
    employee_name: string;
    change_date: string;
    change_type: string;
    change_reason: string;
    position_before: string;
    supervisor_before: string;
    department_before: string;
    cost_center_before: string;
    team_before: string;
    employment_type_before: string;
    position_after: string;
    supervisor_after: string;
    department_after: string;
    cost_center_after: string;
    team_after: string;
    employment_type_after: string;
    annual_wage_before: number;
    hourly_wage_before: number;
    benefits_cost_before: number;
    employer_taxes_before: number;
    total_compensation_before: number;
    annual_wage_after: number;
    hourly_wage_after: number;
    benefits_cost_after: number;
    employer_taxes_after: number;
    total_compensation_after: number;
    compensation_change_amount: number;
    compensation_change_percentage: number;
    annual_cost_impact: number;
    notes: string;
}

interface InternalChangeDrawerProps {
    changeId: number;
    onClose: () => void;
}

export default function InternalChangeDrawer({ changeId, onClose }: InternalChangeDrawerProps) {
    const [changeDetail, setChangeDetail] = useState<InternalChangeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedNotes, setEditedNotes] = useState("");

    useEffect(() => {
        fetchChangeDetail();
    }, [changeId]);

    const fetchChangeDetail = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8000/turnover/internal-changes/${changeId}`);
            if (response.ok) {
                const data = await response.json();
                setChangeDetail(data);
                setEditedNotes(data.notes || "");
            }
        } catch (error) {
            console.error("Error fetching internal change details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!changeDetail) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/turnover/internal-changes/${changeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: editedNotes }),
            });

            if (response.ok) {
                setChangeDetail({ ...changeDetail, notes: editedNotes });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating notes:", error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this internal change record?")) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/turnover/internal-changes/${changeId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                onClose();
            }
        } catch (error) {
            console.error("Error deleting internal change:", error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // ESC key support
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const ComparisonRow = ({ label, before, after }: { label: string; before: string; after: string }) => (
        <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{label} (Before)</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{before || "N/A"}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 uppercase mb-1">{label} (After)</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{after || "N/A"}</p>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {loading ? (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto z-50"
                    >
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                        </div>
                    </motion.div>
                </>
            ) : changeDetail ? (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto z-50"
                    >
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Internal Change Details
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {changeDetail.employee_name} ({changeDetail.employee_id})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Change Information */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Change Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Change Date</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {formatDate(changeDetail.change_date)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Change Type</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                        {changeDetail.change_type}
                                    </span>
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Change Reason</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {changeDetail.change_reason || "N/A"}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Position Changes */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Position Changes
                        </h3>
                        <div className="space-y-3">
                            <ComparisonRow
                                label="Position"
                                before={changeDetail.position_before}
                                after={changeDetail.position_after}
                            />
                            <ComparisonRow
                                label="Supervisor"
                                before={changeDetail.supervisor_before}
                                after={changeDetail.supervisor_after}
                            />
                            <ComparisonRow
                                label="Employment Type"
                                before={changeDetail.employment_type_before}
                                after={changeDetail.employment_type_after}
                            />
                        </div>
                    </section>

                    {/* Department Changes */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Department & Team Changes
                        </h3>
                        <div className="space-y-3">
                            <ComparisonRow
                                label="Department"
                                before={changeDetail.department_before}
                                after={changeDetail.department_after}
                            />
                            <ComparisonRow
                                label="Cost Center"
                                before={changeDetail.cost_center_before}
                                after={changeDetail.cost_center_after}
                            />
                            <ComparisonRow
                                label="Team"
                                before={changeDetail.team_before}
                                after={changeDetail.team_after}
                            />
                        </div>
                    </section>

                    {/* Compensation Changes */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Compensation Changes
                        </h3>
                        <div className="space-y-4">
                            {/* Before/After Comparison */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-3 space-y-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Before</p>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Annual Wage</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.annual_wage_before)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Benefits Cost</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.benefits_cost_before)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Employer Taxes</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.employer_taxes_before)}
                                        </p>
                                    </div>
                                    <div className="border-t border-gray-300 dark:border-gray-500 pt-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Compensation</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.total_compensation_before)}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 space-y-2 border-2 border-blue-300 dark:border-blue-700">
                                    <p className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">After</p>
                                    <div>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Annual Wage</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.annual_wage_after)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Benefits Cost</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.benefits_cost_after)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Employer Taxes</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.employer_taxes_after)}
                                        </p>
                                    </div>
                                    <div className="border-t border-blue-300 dark:border-blue-700 pt-2">
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Total Compensation</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(changeDetail.total_compensation_after)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Change Summary */}
                            <div className={`rounded-lg p-4 ${changeDetail.annual_cost_impact >= 0 ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700' : 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'}`}>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Change Amount</p>
                                        <p className={`text-lg font-bold mt-1 ${changeDetail.compensation_change_amount >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                            {changeDetail.compensation_change_amount >= 0 ? "+" : ""}
                                            {formatCurrency(changeDetail.compensation_change_amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Change %</p>
                                        <p className={`text-lg font-bold mt-1 ${changeDetail.compensation_change_percentage >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                            {changeDetail.compensation_change_percentage >= 0 ? "+" : ""}
                                            {changeDetail.compensation_change_percentage.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Annual Cost Impact</p>
                                        <p className={`text-lg font-bold mt-1 ${changeDetail.annual_cost_impact >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                            {changeDetail.annual_cost_impact >= 0 ? "+" : ""}
                                            {formatCurrency(changeDetail.annual_cost_impact)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Notes Section */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Notes
                        </h3>
                        {isEditing ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editedNotes}
                                    onChange={(e) => setEditedNotes(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    rows={4}
                                    placeholder="Add notes about this change..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveNotes}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditedNotes(changeDetail.notes || "");
                                        }}
                                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {changeDetail.notes || "No notes added"}
                                </p>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Edit Notes
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Delete Button */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Internal Change Record
                        </button>
                    </div>
                </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );
}
