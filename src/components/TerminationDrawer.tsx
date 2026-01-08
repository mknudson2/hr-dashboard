import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, DollarSign, Calendar, User, Briefcase, Building2, Users, FileText, Trash2 } from "lucide-react";

interface TerminationDetail {
    id: number;
    employee_id: string;
    employee_name: string;
    termination_date: string;
    termination_type: string;
    termination_reason: string;
    position: string;
    supervisor: string;
    department: string;
    cost_center: string;
    team: string;
    employment_type: string;
    annual_wage: number;
    hourly_wage: number;
    benefits_cost_annual: number;
    employer_taxes_annual: number;
    total_compensation: number;
    severance_cost: number;
    unused_pto_payout: number;
    recruitment_cost: number;
    training_cost: number;
    total_turnover_cost: number;
    rehire_eligible: boolean;
    notes: string;
}

interface TerminationDrawerProps {
    terminationId: number;
    onClose: () => void;
}

export default function TerminationDrawer({ terminationId, onClose }: TerminationDrawerProps) {
    const [terminationDetail, setTerminationDetail] = useState<TerminationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedNotes, setEditedNotes] = useState("");

    useEffect(() => {
        fetchTerminationDetail();
    }, [terminationId]);

    const fetchTerminationDetail = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/turnover/terminations/${terminationId}`);
            if (response.ok) {
                const data = await response.json();
                setTerminationDetail(data);
                setEditedNotes(data.notes || "");
            }
        } catch (error) {
            console.error("Error fetching termination details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!terminationDetail) return;

        try {
            const response = await fetch(`/turnover/terminations/${terminationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: editedNotes }),
            });

            if (response.ok) {
                setTerminationDetail({ ...terminationDetail, notes: editedNotes });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating notes:", error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this termination record?")) return;

        try {
            const response = await fetch(`/turnover/terminations/${terminationId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                onClose();
            }
        } catch (error) {
            console.error("Error deleting termination:", error);
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
            ) : terminationDetail ? (
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
                            Termination Details
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {terminationDetail.employee_name} ({terminationDetail.employee_id})
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
                    {/* Termination Information */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Termination Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Termination Date</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {formatDate(terminationDetail.termination_date)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Termination Type</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                            terminationDetail.termination_type === "Voluntary"
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        }`}
                                    >
                                        {terminationDetail.termination_type}
                                    </span>
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Termination Reason</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.termination_reason || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Employment Type</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.employment_type || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Rehire Eligible</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                            terminationDetail.rehire_eligible
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        }`}
                                    >
                                        {terminationDetail.rehire_eligible ? "Yes" : "No"}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Position Information */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Position Details (at Termination)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Position</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.position || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Supervisor</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.supervisor || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Department</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.department || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Cost Center</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.cost_center || "N/A"}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Team</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.team || "N/A"}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Compensation Information */}
                    <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Compensation (at Termination)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Annual Wage</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.annual_wage)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Hourly Wage</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {terminationDetail.hourly_wage ? `$${terminationDetail.hourly_wage.toFixed(2)}/hr` : "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Annual Benefits Cost</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.benefits_cost_annual)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Employer Taxes</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.employer_taxes_annual)}
                                </p>
                            </div>
                            <div className="col-span-2 bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                                <p className="text-xs text-blue-700 dark:text-blue-300 uppercase">Total Annual Compensation</p>
                                <p className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                                    {formatCurrency(terminationDetail.total_compensation)}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Turnover Costs */}
                    <section className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-red-600" />
                            Turnover Costs
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Severance Cost</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.severance_cost)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Unused PTO Payout</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.unused_pto_payout)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Recruitment Cost</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.recruitment_cost)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Training Cost</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(terminationDetail.training_cost)}
                                </p>
                            </div>
                            <div className="col-span-2 bg-red-100 dark:bg-red-900 rounded-lg p-3">
                                <p className="text-xs text-red-700 dark:text-red-300 uppercase">Total Turnover Cost</p>
                                <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                                    {formatCurrency(terminationDetail.total_turnover_cost)}
                                </p>
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
                                    placeholder="Add notes about this termination..."
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
                                            setEditedNotes(terminationDetail.notes || "");
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
                                    {terminationDetail.notes || "No notes added"}
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
                            Delete Termination Record
                        </button>
                    </div>
                </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );
}
