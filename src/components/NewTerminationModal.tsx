import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Search, UserMinus } from "lucide-react";

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

interface NewTerminationModalProps {
    onClose: () => void;
}

export default function NewTerminationModal({ onClose }: NewTerminationModalProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({
        employee_id: "",
        termination_date: new Date().toISOString().split("T")[0],
        termination_type: "Voluntary",
        termination_reason: "",
        position: "",
        supervisor: "",
        department: "",
        cost_center: "",
        team: "",
        employment_type: "Full Time",
        annual_wage: 0,
        hourly_wage: 0,
        benefits_cost_annual: 0,
        employer_taxes_annual: 0,
        total_compensation: 0,
        severance_cost: 0,
        unused_pto_payout: 0,
        recruitment_cost: 0,
        training_cost: 0,
        total_turnover_cost: 0,
        rehire_eligible: true,
        notes: "",
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        // Auto-calculate total compensation
        const totalComp = formData.annual_wage + formData.benefits_cost_annual + formData.employer_taxes_annual;
        setFormData(prev => ({ ...prev, total_compensation: totalComp }));
    }, [formData.annual_wage, formData.benefits_cost_annual, formData.employer_taxes_annual]);

    useEffect(() => {
        // Auto-calculate total turnover cost
        const totalTurnover = formData.severance_cost + formData.unused_pto_payout + formData.recruitment_cost + formData.training_cost;
        setFormData(prev => ({ ...prev, total_turnover_cost: totalTurnover }));
    }, [formData.severance_cost, formData.unused_pto_payout, formData.recruitment_cost, formData.training_cost]);

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

        // Auto-populate all fields from employee data
        setFormData(prev => ({
            ...prev,
            employee_id: employee.employee_id,
            position: employee.position || "",
            supervisor: employee.supervisor || "",
            department: employee.department || "",
            cost_center: employee.cost_center || "",
            team: employee.team || "",
            employment_type: employee.type || "Full Time",
            annual_wage: employee.annual_wage || 0,
            hourly_wage: employee.hourly_wage || 0,
            benefits_cost_annual: employee.benefits_cost_annual || 0,
            employer_taxes_annual: employee.employer_taxes_annual || 0,
            total_compensation: employee.total_compensation || 0,
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
            const response = await fetch("/turnover/terminations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                onClose();
            } else {
                alert("Failed to create termination record");
            }
        } catch (error) {
            console.error("Error creating termination:", error);
            alert("Error creating termination record");
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
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <UserMinus className="w-6 h-6 text-red-600" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Add Termination
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

                        {/* Termination Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Termination Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.termination_date}
                                    onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Termination Type *
                                </label>
                                <select
                                    required
                                    value={formData.termination_type}
                                    onChange={(e) => setFormData({ ...formData, termination_type: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="Voluntary">Voluntary</option>
                                    <option value="Involuntary">Involuntary</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Termination Reason
                                </label>
                                <select
                                    value={formData.termination_reason}
                                    onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select reason...</option>
                                    <option value="Resignation">Resignation</option>
                                    <option value="Retirement">Retirement</option>
                                    <option value="Performance">Performance</option>
                                    <option value="Layoff">Layoff</option>
                                    <option value="Termination for Cause">Termination for Cause</option>
                                    <option value="Position Elimination">Position Elimination</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Position Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Position
                                </label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Supervisor
                                </label>
                                <input
                                    type="text"
                                    value={formData.supervisor}
                                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Department
                                </label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cost Center
                                </label>
                                <input
                                    type="text"
                                    value={formData.cost_center}
                                    onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Compensation Details */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compensation at Termination</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Annual Wage
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.annual_wage}
                                        onChange={(e) => setFormData({ ...formData, annual_wage: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Benefits Cost (Annual)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.benefits_cost_annual}
                                        onChange={(e) => setFormData({ ...formData, benefits_cost_annual: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Employer Taxes (Annual)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.employer_taxes_annual}
                                        onChange={(e) => setFormData({ ...formData, employer_taxes_annual: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-3">
                                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                                        Total Compensation
                                    </label>
                                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                                        ${formData.total_compensation.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Turnover Costs */}
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Turnover Costs</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Severance Cost
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.severance_cost}
                                        onChange={(e) => setFormData({ ...formData, severance_cost: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Unused PTO Payout
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.unused_pto_payout}
                                        onChange={(e) => setFormData({ ...formData, unused_pto_payout: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Recruitment Cost
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.recruitment_cost}
                                        onChange={(e) => setFormData({ ...formData, recruitment_cost: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Training Cost
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.training_cost}
                                        onChange={(e) => setFormData({ ...formData, training_cost: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="col-span-2 bg-red-100 dark:bg-red-900/50 rounded-lg p-3">
                                    <label className="block text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                                        Total Turnover Cost
                                    </label>
                                    <p className="text-xl font-bold text-red-900 dark:text-red-100">
                                        ${formData.total_turnover_cost.toLocaleString()}
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
                                Create Termination Record
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
