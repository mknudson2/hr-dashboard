import { useEffect, useState } from "react";
import { X, DollarSign, Heart, Shield, TrendingUp, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Benefits {
    medical: {
        plan: string | null;
        tier: string | null;
        ee_cost: number | null;
        er_cost: number | null;
    };
    dental: {
        plan: string | null;
        tier: string | null;
        ee_cost: number | null;
        er_cost: number | null;
    };
    vision: {
        plan: string | null;
        tier: string | null;
        ee_cost: number | null;
        er_cost: number | null;
    };
    retirement: {
        plan_type: string | null;
        ee_contribution_pct: number | null;
        ee_contribution_amount: number | null;
        er_match_pct: number | null;
        er_match_amount: number | null;
        vesting_schedule: string | null;
        vested_pct: number | null;
    };
    hsa: {
        ee_contribution: number | null;
        er_contribution: number | null;
    };
    fsa: {
        contribution: number | null;
        dependent_care: number | null;
    };
    life_insurance: {
        coverage: number | null;
        ee_cost: number | null;
        er_cost: number | null;
    };
    disability: {
        std_enrolled: boolean;
        std_cost: number | null;
        ltd_enrolled: boolean;
        ltd_cost: number | null;
    };
    other: {
        commuter_benefits: number | null;
        wellness_stipend: number | null;
    };
}

interface EmployeeDetail {
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: string;
    position: string;
    wage: number;
    wage_type: string;
    annual_wage: number;
    hourly_wage: number;
    benefits: Benefits;
}

interface EmployeeBenefitsDrawerProps {
    employeeId: string | null;
    onClose: () => void;
}

export default function EmployeeBenefitsDrawer({ employeeId, onClose }: EmployeeBenefitsDrawerProps) {
    const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!employeeId) {
            setEmployee(null);
            return;
        }

        async function fetchEmployeeDetails() {
            try {
                setLoading(true);
                const res = await fetch(`http://127.0.0.1:8000/analytics/employees/${employeeId}`);
                const data = await res.json();
                setEmployee(data);
            } catch (error) {
                console.error("Error fetching employee details:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchEmployeeDetails();
    }, [employeeId]);

    // Calculate total monthly costs
    const calculateMonthlyCosts = () => {
        if (!employee) return { eeCost: 0, erCost: 0, total: 0 };

        let eeCost = 0;
        let erCost = 0;

        // Health insurance
        if (employee.benefits.medical.ee_cost) eeCost += employee.benefits.medical.ee_cost;
        if (employee.benefits.medical.er_cost) erCost += employee.benefits.medical.er_cost;

        if (employee.benefits.dental.ee_cost) eeCost += employee.benefits.dental.ee_cost;
        if (employee.benefits.dental.er_cost) erCost += employee.benefits.dental.er_cost;

        if (employee.benefits.vision.ee_cost) eeCost += employee.benefits.vision.ee_cost;
        if (employee.benefits.vision.er_cost) erCost += employee.benefits.vision.er_cost;

        // Retirement
        if (employee.benefits.retirement.ee_contribution_amount) eeCost += employee.benefits.retirement.ee_contribution_amount;
        if (employee.benefits.retirement.er_match_amount) erCost += employee.benefits.retirement.er_match_amount;

        // HSA/FSA
        if (employee.benefits.hsa.ee_contribution) eeCost += employee.benefits.hsa.ee_contribution;
        if (employee.benefits.hsa.er_contribution) erCost += employee.benefits.hsa.er_contribution;
        if (employee.benefits.fsa.contribution) eeCost += employee.benefits.fsa.contribution;
        if (employee.benefits.fsa.dependent_care) eeCost += employee.benefits.fsa.dependent_care;

        // Life & Disability
        if (employee.benefits.life_insurance.ee_cost) eeCost += employee.benefits.life_insurance.ee_cost;
        if (employee.benefits.life_insurance.er_cost) erCost += employee.benefits.life_insurance.er_cost;
        if (employee.benefits.disability.std_cost) erCost += employee.benefits.disability.std_cost;
        if (employee.benefits.disability.ltd_cost) erCost += employee.benefits.disability.ltd_cost;

        // Other
        if (employee.benefits.other.commuter_benefits) erCost += employee.benefits.other.commuter_benefits;
        if (employee.benefits.other.wellness_stipend) erCost += employee.benefits.other.wellness_stipend;

        return {
            eeCost: eeCost,
            erCost: erCost,
            total: eeCost + erCost
        };
    };

    const BenefitCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            </div>
            {children}
        </div>
    );

    const CostRow = ({ label, eeCost, erCost }: { label: string; eeCost?: number | null; erCost?: number | null }) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            <div className="flex gap-4 text-sm">
                {eeCost !== undefined && (
                    <div className="text-right">
                        <span className="text-xs text-gray-500 dark:text-gray-400">EE: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            ${eeCost?.toFixed(2) || '0.00'}
                        </span>
                    </div>
                )}
                {erCost !== undefined && (
                    <div className="text-right">
                        <span className="text-xs text-gray-500 dark:text-gray-400">ER: </span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                            ${erCost?.toFixed(2) || '0.00'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    const costs = employee ? calculateMonthlyCosts() : { eeCost: 0, erCost: 0, total: 0 };

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
            {employeeId && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {employee?.full_name || "Loading..."}
                                </h2>
                                {employee && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {employee.position} • {employee.department}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-6 text-gray-500 dark:text-gray-400">
                                Loading employee details...
                            </div>
                        ) : employee ? (
                            <div className="p-6 space-y-6">
                                {/* Total Compensation Summary */}
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Total Compensation Summary
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Annual Salary</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                ${(employee.annual_wage || employee.wage || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Benefits (ER)</p>
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                ${costs.erCost.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Annual Benefits Cost (ER)</p>
                                            <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                                ${(costs.erCost * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Annual Comp</p>
                                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                                ${((employee.annual_wage || employee.wage || 0) + (costs.erCost * 12)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Health Insurance */}
                                {(employee.benefits.medical.plan || employee.benefits.dental.plan || employee.benefits.vision.plan) && (
                                    <BenefitCard title="Health Insurance" icon={<Heart className="w-5 h-5 text-red-600 dark:text-red-400" />}>
                                        <div className="space-y-1">
                                            {employee.benefits.medical.plan && (
                                                <>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        Medical: {employee.benefits.medical.plan} ({employee.benefits.medical.tier})
                                                    </div>
                                                    <CostRow
                                                        label="Monthly Premium"
                                                        eeCost={employee.benefits.medical.ee_cost}
                                                        erCost={employee.benefits.medical.er_cost}
                                                    />
                                                </>
                                            )}
                                            {employee.benefits.dental.plan && (
                                                <>
                                                    <div className="font-medium text-gray-900 dark:text-white mt-3">
                                                        Dental: {employee.benefits.dental.plan}
                                                    </div>
                                                    <CostRow
                                                        label="Monthly Premium"
                                                        eeCost={employee.benefits.dental.ee_cost}
                                                        erCost={employee.benefits.dental.er_cost}
                                                    />
                                                </>
                                            )}
                                            {employee.benefits.vision.plan && (
                                                <>
                                                    <div className="font-medium text-gray-900 dark:text-white mt-3">
                                                        Vision: {employee.benefits.vision.plan}
                                                    </div>
                                                    <CostRow
                                                        label="Monthly Premium"
                                                        eeCost={employee.benefits.vision.ee_cost}
                                                        erCost={employee.benefits.vision.er_cost}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </BenefitCard>
                                )}

                                {/* Retirement */}
                                {employee.benefits.retirement.plan_type && (
                                    <BenefitCard title="Retirement" icon={<TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Plan Type</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {employee.benefits.retirement.plan_type}
                                                </span>
                                            </div>
                                            <CostRow
                                                label={`Employee Contribution (${employee.benefits.retirement.ee_contribution_pct?.toFixed(1)}%)`}
                                                eeCost={employee.benefits.retirement.ee_contribution_amount}
                                            />
                                            <CostRow
                                                label={`Employer Match (${employee.benefits.retirement.er_match_pct?.toFixed(1)}%)`}
                                                erCost={employee.benefits.retirement.er_match_amount}
                                            />
                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Vesting</span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {employee.benefits.retirement.vesting_schedule}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Vested</span>
                                                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                        {employee.benefits.retirement.vested_pct?.toFixed(0)}%
                                                    </span>
                                                </div>
                                                {/* Vesting progress bar */}
                                                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-600 dark:bg-green-400 transition-all duration-500"
                                                        style={{ width: `${employee.benefits.retirement.vested_pct || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </BenefitCard>
                                )}

                                {/* HSA/FSA */}
                                {(employee.benefits.hsa.ee_contribution || employee.benefits.fsa.contribution || employee.benefits.fsa.dependent_care) && (
                                    <BenefitCard title="Health Savings & Flexible Spending" icon={<DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
                                        <div className="space-y-1">
                                            {employee.benefits.hsa.ee_contribution && (
                                                <CostRow
                                                    label="HSA Monthly Contribution"
                                                    eeCost={employee.benefits.hsa.ee_contribution}
                                                    erCost={employee.benefits.hsa.er_contribution}
                                                />
                                            )}
                                            {employee.benefits.fsa.contribution && (
                                                <CostRow
                                                    label="FSA Monthly Contribution"
                                                    eeCost={employee.benefits.fsa.contribution}
                                                />
                                            )}
                                            {employee.benefits.fsa.dependent_care && (
                                                <CostRow
                                                    label="Dependent Care FSA"
                                                    eeCost={employee.benefits.fsa.dependent_care}
                                                />
                                            )}
                                        </div>
                                    </BenefitCard>
                                )}

                                {/* Life & Disability Insurance */}
                                {employee.benefits.life_insurance.coverage && (
                                    <BenefitCard title="Life & Disability Insurance" icon={<Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />}>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Life Insurance Coverage</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    ${employee.benefits.life_insurance.coverage?.toLocaleString()}
                                                </span>
                                            </div>
                                            <CostRow
                                                label="Life Insurance Premium"
                                                eeCost={employee.benefits.life_insurance.ee_cost}
                                                erCost={employee.benefits.life_insurance.er_cost}
                                            />
                                            {employee.benefits.disability.std_enrolled && (
                                                <CostRow
                                                    label="Short-Term Disability"
                                                    erCost={employee.benefits.disability.std_cost}
                                                />
                                            )}
                                            {employee.benefits.disability.ltd_enrolled && (
                                                <CostRow
                                                    label="Long-Term Disability"
                                                    erCost={employee.benefits.disability.ltd_cost}
                                                />
                                            )}
                                        </div>
                                    </BenefitCard>
                                )}

                                {/* Other Benefits */}
                                {(employee.benefits.other.commuter_benefits || employee.benefits.other.wellness_stipend) && (
                                    <BenefitCard title="Additional Benefits" icon={<Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-400" />}>
                                        <div className="space-y-1">
                                            {employee.benefits.other.commuter_benefits && (
                                                <CostRow
                                                    label="Commuter Benefits"
                                                    erCost={employee.benefits.other.commuter_benefits}
                                                />
                                            )}
                                            {employee.benefits.other.wellness_stipend && (
                                                <CostRow
                                                    label="Wellness Stipend"
                                                    erCost={employee.benefits.other.wellness_stipend}
                                                />
                                            )}
                                        </div>
                                    </BenefitCard>
                                )}

                                {/* Monthly Totals */}
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Monthly Benefits Summary</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Employee Monthly Deductions</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                ${costs.eeCost.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Employer Monthly Cost</span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                ${costs.erCost.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                                            <span className="font-semibold text-gray-900 dark:text-white">Total Monthly Benefits</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">
                                                ${costs.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-red-500">Failed to load employee details</div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
