import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Search, ArrowRightLeft } from "lucide-react";

interface Employee {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    type: string;
    cost_center?: string;
    team?: string;
    position?: string;
    supervisor?: string;
    annual_wage?: number;
    hourly_wage?: number;
    benefits_cost_annual?: number;
    employer_taxes_annual?: number;
    total_compensation?: number;
}

interface NewInternalChangeModalProps {
    onClose: () => void;
}

export default function NewInternalChangeModal({ onClose }: NewInternalChangeModalProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({
        employee_id: "",
        change_date: new Date().toISOString().split("T")[0],
        change_type: "Position Change",
        change_reason: "",
        position_before: "",
        supervisor_before: "",
        department_before: "",
        cost_center_before: "",
        team_before: "",
        employment_type_before: "Full Time",
        position_after: "",
        supervisor_after: "",
        department_after: "",
        cost_center_after: "",
        team_after: "",
        employment_type_after: "Full Time",
        annual_wage_before: 0,
        hourly_wage_before: 0,
        benefits_cost_before: 0,
        employer_taxes_before: 0,
        total_compensation_before: 0,
        annual_wage_after: 0,
        hourly_wage_after: 0,
        benefits_cost_after: 0,
        employer_taxes_after: 0,
        total_compensation_after: 0,
        compensation_change_amount: 0,
        compensation_change_percentage: 0,
        annual_cost_impact: 0,
        notes: "",
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        const totalBefore = formData.annual_wage_before + formData.benefits_cost_before + formData.employer_taxes_before;
        setFormData(prev => ({ ...prev, total_compensation_before: totalBefore }));
    }, [formData.annual_wage_before, formData.benefits_cost_before, formData.employer_taxes_before]);

    useEffect(() => {
        const totalAfter = formData.annual_wage_after + formData.benefits_cost_after + formData.employer_taxes_after;
        setFormData(prev => ({ ...prev, total_compensation_after: totalAfter }));
    }, [formData.annual_wage_after, formData.benefits_cost_after, formData.employer_taxes_after]);

    useEffect(() => {
        const changeAmount = formData.total_compensation_after - formData.total_compensation_before;
        const changePercentage = formData.total_compensation_before > 0
            ? (changeAmount / formData.total_compensation_before) * 100
            : 0;

        setFormData(prev => ({
            ...prev,
            compensation_change_amount: changeAmount,
            compensation_change_percentage: changePercentage,
            annual_cost_impact: changeAmount,
        }));
    }, [formData.total_compensation_before, formData.total_compensation_after]);

    const fetchEmployees = async () => {
        try {
            const response = await fetch("/employees");
            if (response.ok) {
                const data = await response.json();
                setEmployees(data.filter((e: Employee) => e.type !== "Terminated"));
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const handleEmployeeSelect = (employee: Employee) => {
        setSelectedEmployee(employee);

        // Auto-populate all "before" fields from current employee data
        setFormData(prev => ({
            ...prev,
            employee_id: employee.employee_id,
            position_before: employee.position || "",
            supervisor_before: employee.supervisor || "",
            department_before: employee.department || "",
            cost_center_before: employee.cost_center || "",
            team_before: employee.team || "",
            employment_type_before: employee.type || "Full Time",
            annual_wage_before: employee.annual_wage || 0,
            hourly_wage_before: employee.hourly_wage || 0,
            benefits_cost_before: employee.benefits_cost_annual || 0,
            employer_taxes_before: employee.employer_taxes_annual || 0,
            total_compensation_before: employee.total_compensation || 0,
        }));
        setSearchQuery("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployee) {
            alert("Please select an employee");
            return;
        }

        try {
            const response = await fetch("/turnover/internal-changes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                onClose();
            } else {
                alert("Failed to create internal change record");
            }
        } catch (error) {
            console.error("Error creating internal change:", error);
            alert("Error creating internal change record");
        }
    };

    const filteredEmployees = employees.filter((emp) =>
        `${emp.first_name} ${emp.last_name} ${emp.employee_id}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Add Internal Change
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Employee Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select Employee *
                            </label>
                            {selectedEmployee ? (
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {selectedEmployee.first_name} {selectedEmployee.last_name} ({selectedEmployee.employee_id})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEmployee(null)}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search employees..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    {searchQuery && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredEmployees.map((emp) => (
                                                <button
                                                    key={emp.employee_id}
                                                    type="button"
                                                    onClick={() => handleEmployeeSelect(emp)}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                                                >
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {emp.first_name} {emp.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {emp.employee_id} • {emp.department}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Change Details */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Change Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.change_date}
                                    onChange={(e) => setFormData({ ...formData, change_date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Change Type *
                                </label>
                                <select
                                    required
                                    value={formData.change_type}
                                    onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="Position Change">Position Change</option>
                                    <option value="Compensation Change">Compensation Change</option>
                                    <option value="Employment Type Change">Employment Type Change</option>
                                    <option value="Department Transfer">Department Transfer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Change Reason
                                </label>
                                <select
                                    value={formData.change_reason}
                                    onChange={(e) => setFormData({ ...formData, change_reason: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select reason...</option>
                                    <option value="Promotion">Promotion</option>
                                    <option value="Lateral Move">Lateral Move</option>
                                    <option value="Demotion">Demotion</option>
                                    <option value="Reorganization">Reorganization</option>
                                    <option value="Merit Increase">Merit Increase</option>
                                    <option value="Market Adjustment">Market Adjustment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Before/After Comparison */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* BEFORE Section */}
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Before Change</h3>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Position
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.position_before}
                                        onChange={(e) => setFormData({ ...formData, position_before: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Supervisor
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.supervisor_before}
                                        onChange={(e) => setFormData({ ...formData, supervisor_before: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department_before}
                                        onChange={(e) => setFormData({ ...formData, department_before: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Cost Center
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cost_center_before}
                                        onChange={(e) => setFormData({ ...formData, cost_center_before: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Team
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.team_before}
                                        onChange={(e) => setFormData({ ...formData, team_before: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Employment Type
                                    </label>
                                    <select
                                        value={formData.employment_type_before}
                                        onChange={(e) => setFormData({ ...formData, employment_type_before: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="Full Time">Full Time</option>
                                        <option value="Part Time">Part Time</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-gray-300 dark:border-gray-600 space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Compensation</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            Annual Wage
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.annual_wage_before}
                                            onChange={(e) => setFormData({ ...formData, annual_wage_before: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            Benefits Cost
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.benefits_cost_before}
                                            onChange={(e) => setFormData({ ...formData, benefits_cost_before: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            Employer Taxes
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.employer_taxes_before}
                                            onChange={(e) => setFormData({ ...formData, employer_taxes_before: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="bg-gray-200 dark:bg-gray-600 rounded-lg p-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            ${formData.total_compensation_before.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* AFTER Section */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4 border-2 border-blue-300 dark:border-blue-700">
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">After Change</h3>

                                <div>
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                        Position
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.position_after}
                                        onChange={(e) => setFormData({ ...formData, position_after: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                        Supervisor
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.supervisor_after}
                                        onChange={(e) => setFormData({ ...formData, supervisor_after: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department_after}
                                        onChange={(e) => setFormData({ ...formData, department_after: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                        Cost Center
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cost_center_after}
                                        onChange={(e) => setFormData({ ...formData, cost_center_after: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                        Team
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.team_after}
                                        onChange={(e) => setFormData({ ...formData, team_after: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                        Employment Type
                                    </label>
                                    <select
                                        value={formData.employment_type_after}
                                        onChange={(e) => setFormData({ ...formData, employment_type_after: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="Full Time">Full Time</option>
                                        <option value="Part Time">Part Time</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-blue-300 dark:border-blue-700 space-y-3">
                                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Compensation</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                            Annual Wage
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.annual_wage_after}
                                            onChange={(e) => setFormData({ ...formData, annual_wage_after: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                            Benefits Cost
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.benefits_cost_after}
                                            onChange={(e) => setFormData({ ...formData, benefits_cost_after: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                            Employer Taxes
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.employer_taxes_after}
                                            onChange={(e) => setFormData({ ...formData, employer_taxes_after: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2">
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Total</p>
                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                            ${formData.total_compensation_after.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cost Impact Summary */}
                        <div className={`rounded-lg p-4 ${formData.annual_cost_impact >= 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Cost Impact Summary</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Change Amount</p>
                                    <p className={`text-xl font-bold mt-1 ${formData.compensation_change_amount >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {formData.compensation_change_amount >= 0 ? "+" : ""}
                                        ${formData.compensation_change_amount.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Change Percentage</p>
                                    <p className={`text-xl font-bold mt-1 ${formData.compensation_change_percentage >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {formData.compensation_change_percentage >= 0 ? "+" : ""}
                                        {formData.compensation_change_percentage.toFixed(2)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Annual Cost Impact</p>
                                    <p className={`text-xl font-bold mt-1 ${formData.annual_cost_impact >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {formData.annual_cost_impact >= 0 ? "+" : ""}
                                        ${formData.annual_cost_impact.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Additional notes..."
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                            >
                                Create Internal Change Record
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}
