import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, TrendingUp, DollarSign, Users, RefreshCw, UserMinus, ArrowRightLeft, Plus } from "lucide-react";
import TerminationDrawer from "@/components/TerminationDrawer";
import InternalChangeDrawer from "@/components/InternalChangeDrawer";
import NewTerminationModal from "@/components/NewTerminationModal";
import NewInternalChangeModal from "@/components/NewInternalChangeModal";

interface DashboardStats {
    total_terminations: number;
    ytd_terminations: number;
    voluntary_terminations: number;
    involuntary_terminations: number;
    ytd_termination_cost: number;
    ytd_compensation_saved: number;
    total_internal_changes: number;
    ytd_internal_changes: number;
    ytd_cost_increase: number;
    ytd_cost_decrease: number;
    net_cost_impact: number;
    recent_terminations: number;
    recent_changes: number;
    ft_terminations: number;
    pt_terminations: number;
}

interface Termination {
    id: number;
    employee_id: string;
    employee_name: string;
    termination_date: string;
    termination_type: string;
    termination_reason: string;
    position: string;
    department: string;
    employment_type: string;
    total_compensation: number;
    total_turnover_cost: number;
}

interface InternalChange {
    id: number;
    employee_id: string;
    employee_name: string;
    change_date: string;
    change_type: string;
    change_reason: string;
    position_before: string;
    position_after: string;
    annual_cost_impact: number;
}

export default function TurnoverPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [terminations, setTerminations] = useState<Termination[]>([]);
    const [internalChanges, setInternalChanges] = useState<InternalChange[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTerminationId, setSelectedTerminationId] = useState<number | null>(null);
    const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null);
    const [showNewTermination, setShowNewTermination] = useState(false);
    const [showNewChange, setShowNewChange] = useState(false);

    const [activeTab, setActiveTab] = useState<"terminations" | "changes">("terminations");
    const [terminationTypeFilter, setTerminationTypeFilter] = useState<string>("all");
    const [changeTypeFilter, setChangeTypeFilter] = useState<string>("all");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, terminationsRes, changesRes] = await Promise.all([
                fetch("http://127.0.0.1:8000/turnover/dashboard"),
                fetch("http://127.0.0.1:8000/turnover/terminations"),
                fetch("http://127.0.0.1:8000/turnover/internal-changes"),
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (terminationsRes.ok) setTerminations(await terminationsRes.json());
            if (changesRes.ok) setInternalChanges(await changesRes.json());
        } catch (error) {
            console.error("Error fetching turnover data:", error);
        } finally {
            setLoading(false);
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
            month: "short",
            day: "numeric",
        });
    };

    const filteredTerminations = terminationTypeFilter === "all"
        ? terminations
        : terminations.filter((t) => t.termination_type === terminationTypeFilter);

    const filteredChanges = changeTypeFilter === "all"
        ? internalChanges
        : internalChanges.filter((c) => c.change_type === changeTypeFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Turnover Cost Tracking</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Track terminations, internal changes, and cost impacts
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Dashboard Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">YTD Terminations</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {stats.ytd_terminations}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Vol: {stats.voluntary_terminations} | Invol: {stats.involuntary_terminations}
                                </p>
                            </div>
                            <UserMinus className="w-12 h-12 text-red-500 opacity-80" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Turnover Cost (YTD)</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(stats.ytd_termination_cost)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    FT: {stats.ft_terminations} | PT: {stats.pt_terminations}
                                </p>
                            </div>
                            <DollarSign className="w-12 h-12 text-yellow-500 opacity-80" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Compensation Saved</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(stats.ytd_compensation_saved)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    From terminated positions
                                </p>
                            </div>
                            <TrendingDown className="w-12 h-12 text-green-500 opacity-80" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Internal Changes (YTD)</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {stats.ytd_internal_changes}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Recent (30d): {stats.recent_changes}
                                </p>
                            </div>
                            <ArrowRightLeft className="w-12 h-12 text-blue-500 opacity-80" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-indigo-500 col-span-full md:col-span-2"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Net Cost Impact (YTD)</p>
                                <p className={`text-3xl font-bold mt-1 ${stats.net_cost_impact < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(Math.abs(stats.net_cost_impact))}
                                    <span className="text-sm ml-2">
                                        {stats.net_cost_impact < 0 ? '(Savings)' : '(Cost)'}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Increase: {formatCurrency(stats.ytd_cost_increase)} | Decrease: {formatCurrency(stats.ytd_cost_decrease)}
                                </p>
                            </div>
                            {stats.net_cost_impact < 0 ? (
                                <TrendingDown className="w-12 h-12 text-green-500 opacity-80" />
                            ) : (
                                <TrendingUp className="w-12 h-12 text-red-500 opacity-80" />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab("terminations")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                        activeTab === "terminations"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                >
                    <UserMinus className="w-4 h-4" />
                    Terminations ({terminations.length})
                </button>
                <button
                    onClick={() => setActiveTab("changes")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                        activeTab === "changes"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                >
                    <ArrowRightLeft className="w-4 h-4" />
                    Internal Changes ({internalChanges.length})
                </button>
            </div>

            {/* Terminations Tab */}
            {activeTab === "terminations" && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <select
                                value={terminationTypeFilter}
                                onChange={(e) => setTerminationTypeFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="all">All Types</option>
                                <option value="Voluntary">Voluntary</option>
                                <option value="Involuntary">Involuntary</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setShowNewTermination(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <Plus className="w-4 h-4" />
                            Add Termination
                        </button>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Total Compensation
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Turnover Cost
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredTerminations.map((term) => (
                                        <motion.tr
                                            key={term.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            onClick={() => setSelectedTerminationId(term.id)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {term.employee_name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {term.employee_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {formatDate(term.termination_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        term.termination_type === "Voluntary"
                                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                    }`}
                                                >
                                                    {term.termination_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                {term.termination_reason || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                {term.position || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(term.total_compensation)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                                                {formatCurrency(term.total_turnover_cost)}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Internal Changes Tab */}
            {activeTab === "changes" && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <select
                                value={changeTypeFilter}
                                onChange={(e) => setChangeTypeFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="all">All Types</option>
                                <option value="Position Change">Position Change</option>
                                <option value="Compensation Change">Compensation Change</option>
                                <option value="Employment Type Change">Employment Type Change</option>
                                <option value="Department Transfer">Department Transfer</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setShowNewChange(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <Plus className="w-4 h-4" />
                            Add Internal Change
                        </button>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Change Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Position Change
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Cost Impact
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredChanges.map((change) => (
                                        <motion.tr
                                            key={change.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            onClick={() => setSelectedChangeId(change.id)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {change.employee_name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {change.employee_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {formatDate(change.change_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    {change.change_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                {change.change_reason || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                <div>{change.position_before || "N/A"}</div>
                                                <div className="text-gray-500 dark:text-gray-400">↓</div>
                                                <div>{change.position_after || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                <span className={change.annual_cost_impact >= 0 ? "text-red-600" : "text-green-600"}>
                                                    {change.annual_cost_impact >= 0 ? "+" : ""}
                                                    {formatCurrency(change.annual_cost_impact)}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Drawers and Modals */}
            <AnimatePresence>
                {selectedTerminationId && (
                    <TerminationDrawer
                        terminationId={selectedTerminationId}
                        onClose={() => {
                            setSelectedTerminationId(null);
                            fetchData();
                        }}
                    />
                )}
                {selectedChangeId && (
                    <InternalChangeDrawer
                        changeId={selectedChangeId}
                        onClose={() => {
                            setSelectedChangeId(null);
                            fetchData();
                        }}
                    />
                )}
                {showNewTermination && (
                    <NewTerminationModal
                        onClose={() => {
                            setShowNewTermination(false);
                            fetchData();
                        }}
                    />
                )}
                {showNewChange && (
                    <NewInternalChangeModal
                        onClose={() => {
                            setShowNewChange(false);
                            fetchData();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
