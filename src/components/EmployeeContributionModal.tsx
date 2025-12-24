import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';

// Utility function to mask Employee ID for security
const maskEmployeeId = (id: string): string => {
  if (!id || id.length < 4) return '****';
  // Show only last 4 digits
  return '****' + id.slice(-4);
};

interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  annual_wage: number;
  medical_tier: string | null;
  hsa_ee_contribution: number | null;
  hsa_er_contribution: number | null;
  hra_er_contribution: number | null;
  fsa_contribution: number | null;
  lfsa_contribution: number | null;
  dependent_care_fsa: number | null;
  retirement_ee_contribution_amount: number | null;
  retirement_ee_contribution_pct: number | null;
}

interface EmployeeContributionModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSave: (employeeId: string, updates: any) => void;
}

// 2025 IRS Limits
const LIMITS = {
  hsa_individual: 4300,
  hsa_family: 8550,
  fsa: 3200,
  lfsa: 3200, // Same as FSA
  dcfsa: 5000,
};

// Standard Employer Contributions by Medical Tier (Monthly)
// Based on per-paycheck amounts: HSA (32, 62, 66, 96) and HRA (25, 50, 50, 75) * 26 paychecks / 12 months
const EMPLOYER_CONTRIBUTIONS = {
  'Employee Only': {
    hsa: 69.33,  // $32/paycheck * 26 = $832/year / 12 months
    hra: 54.17,  // $25/paycheck * 26 = $650/year / 12 months
  },
  'Employee + Spouse': {
    hsa: 143.00, // $66/paycheck * 26 = $1716/year / 12 months
    hra: 108.33, // $50/paycheck * 26 = $1300/year / 12 months
  },
  'Employee + Children': {
    hsa: 134.33, // $62/paycheck * 26 = $1612/year / 12 months
    hra: 108.33, // $50/paycheck * 26 = $1300/year / 12 months
  },
  'Family': {
    hsa: 208.00, // $96/paycheck * 26 = $2496/year / 12 months
    hra: 162.50, // $75/paycheck * 26 = $1950/year / 12 months
  },
};

const EmployeeContributionModal = ({ employee, onClose, onSave }: EmployeeContributionModalProps) => {
  const [formData, setFormData] = useState({
    medical_tier: '',
    hsa_ee_contribution: 0,
    hsa_er_contribution: 0,
    hra_er_contribution: 0,
    fsa_contribution: 0,
    lfsa_contribution: 0,
    dependent_care_fsa: 0,
    retirement_ee_contribution_amount: 0,
    retirement_ee_contribution_pct: 0,
  });

  const [retirementInputMode, setRetirementInputMode] = useState<'amount' | 'percentage'>('amount');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee) {
      // Round all monetary values to 2 decimals to fix floating-point precision
      setFormData({
        medical_tier: employee.medical_tier || '',
        hsa_ee_contribution: employee.hsa_ee_contribution ? parseFloat(employee.hsa_ee_contribution.toFixed(2)) : 0,
        hsa_er_contribution: employee.hsa_er_contribution ? parseFloat(employee.hsa_er_contribution.toFixed(2)) : 0,
        hra_er_contribution: employee.hra_er_contribution ? parseFloat(employee.hra_er_contribution.toFixed(2)) : 0,
        fsa_contribution: employee.fsa_contribution ? parseFloat(employee.fsa_contribution.toFixed(2)) : 0,
        lfsa_contribution: employee.lfsa_contribution ? parseFloat(employee.lfsa_contribution.toFixed(2)) : 0,
        dependent_care_fsa: employee.dependent_care_fsa ? parseFloat(employee.dependent_care_fsa.toFixed(2)) : 0,
        retirement_ee_contribution_amount: employee.retirement_ee_contribution_amount ? parseFloat(employee.retirement_ee_contribution_amount.toFixed(2)) : 0,
        retirement_ee_contribution_pct: employee.retirement_ee_contribution_pct ? parseFloat(employee.retirement_ee_contribution_pct.toFixed(2)) : 0,
      });

      // Set initial mode based on which field has a value
      if (employee.retirement_ee_contribution_pct && employee.retirement_ee_contribution_pct > 0) {
        setRetirementInputMode('percentage');
      } else {
        setRetirementInputMode('amount');
      }
    }
  }, [employee]);

  if (!employee) return null;

  // Determine which fields should be disabled based on current values
  const hasHSA = formData.hsa_ee_contribution > 0 || formData.hsa_er_contribution > 0;
  const hasHRA = formData.hra_er_contribution > 0;
  const hasFSA = formData.fsa_contribution > 0;

  // Disable rules
  const disableHSA = hasHRA || hasFSA;
  const disableHRA = hasHSA;
  const disableFSA = hasHSA;
  // LFSA can be used with HSA, so only disabled if HSA + FSA both exist (which shouldn't happen)

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // HSA validation
    if (formData.hsa_ee_contribution > 0) {
      const annualHsa = formData.hsa_ee_contribution * 12;
      const hsaLimit = formData.medical_tier?.includes('Family') ? LIMITS.hsa_family : LIMITS.hsa_individual;
      if (annualHsa > hsaLimit) {
        newErrors.hsa_ee_contribution = `Annual HSA exceeds ${formData.medical_tier?.includes('Family') ? 'family' : 'individual'} limit of $${hsaLimit.toLocaleString()}`;
      }
    }

    // FSA validation
    if (formData.fsa_contribution > 0) {
      const annualFsa = formData.fsa_contribution * 12;
      if (annualFsa > LIMITS.fsa) {
        newErrors.fsa_contribution = `Annual FSA exceeds limit of $${LIMITS.fsa.toLocaleString()}`;
      }
    }

    // LFSA validation
    if (formData.lfsa_contribution > 0) {
      const annualLfsa = formData.lfsa_contribution * 12;
      if (annualLfsa > LIMITS.lfsa) {
        newErrors.lfsa_contribution = `Annual LFSA exceeds limit of $${LIMITS.lfsa.toLocaleString()}`;
      }
    }

    // Dependent Care FSA validation
    if (formData.dependent_care_fsa > 0) {
      const annualDcFsa = formData.dependent_care_fsa * 12;
      if (annualDcFsa > LIMITS.dcfsa) {
        newErrors.dependent_care_fsa = `Annual Dependent Care FSA exceeds limit of $${LIMITS.dcfsa.toLocaleString()}`;
      }
    }

    // HSA and full Healthcare FSA are mutually exclusive (but HSA + LFSA is allowed)
    if (formData.hsa_ee_contribution > 0 && formData.fsa_contribution > 0) {
      newErrors.fsa_contribution = 'Cannot have both HSA and Healthcare FSA';
    }

    // HRA and HSA are mutually exclusive
    if (formData.hra_er_contribution > 0 && formData.hsa_ee_contribution > 0) {
      newErrors.hra_er_contribution = 'Cannot have both HRA and HSA';
    }

    // 401k validation
    if (formData.retirement_ee_contribution_amount > 0) {
      const annual401k = formData.retirement_ee_contribution_amount * 12;
      const limit401k = 23500; // 2025 IRS limit (catch-up not included in this validation)
      if (annual401k > limit401k) {
        newErrors.retirement_ee_contribution_amount = `Annual 401k exceeds base limit of $${limit401k.toLocaleString()} (catch-up contributions for age 50+ not included)`;
      }
    }

    // 401k percentage validation
    if (formData.retirement_ee_contribution_pct > 0) {
      const annual401k = (employee.annual_wage * formData.retirement_ee_contribution_pct / 100);
      const limit401k = 23500; // 2025 IRS limit
      if (annual401k > limit401k) {
        newErrors.retirement_ee_contribution_pct = `Annual 401k (${annual401k.toLocaleString()}) exceeds base limit of $${limit401k.toLocaleString()}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(employee.employee_id, formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Contributions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {employee.full_name} - {employee.department}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 font-mono">
                ID: {maskEmployeeId(employee.employee_id)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Medical Tier */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Medical Coverage</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Medical Tier
              </label>
              <select
                value={formData.medical_tier}
                onChange={(e) => {
                  const tier = e.target.value;
                  handleChange('medical_tier', tier);

                  // Auto-populate employer contributions based on tier
                  if (tier && EMPLOYER_CONTRIBUTIONS[tier as keyof typeof EMPLOYER_CONTRIBUTIONS]) {
                    const contributions = EMPLOYER_CONTRIBUTIONS[tier as keyof typeof EMPLOYER_CONTRIBUTIONS];

                    // Determine which to populate based on current state
                    // If neither HSA nor HRA has values, default to HSA
                    // If one already has values, keep using that one
                    const currentHasHSA = formData.hsa_ee_contribution > 0 || formData.hsa_er_contribution > 0;
                    const currentHasHRA = formData.hra_er_contribution > 0;

                    if (currentHasHRA || (formData.fsa_contribution > 0)) {
                      // Use HRA if HRA already exists or if FSA exists (which blocks HSA)
                      handleChange('hra_er_contribution', contributions.hra);
                    } else {
                      // Default to HSA
                      handleChange('hsa_er_contribution', contributions.hsa);
                    }
                  } else if (tier === '') {
                    // Clear employer contributions if "No Coverage" selected
                    handleChange('hsa_er_contribution', 0);
                    handleChange('hra_er_contribution', 0);
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">No Coverage</option>
                <option value="Employee Only">Employee Only</option>
                <option value="Employee + Spouse">Employee + Spouse</option>
                <option value="Employee + Children">Employee + Children</option>
                <option value="Family">Family</option>
              </select>
            </div>
          </div>

          {/* HSA Contributions */}
          <div className={disableHSA ? 'opacity-60' : ''}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Health Savings Account (HSA)
            </h3>
            {disableHSA ? (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-900 dark:text-red-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  HSA is disabled because employee has {hasHRA ? 'HRA' : hasFSA ? 'Healthcare FSA' : 'conflicting coverage'}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  2025 Annual Limits: ${LIMITS.hsa_individual.toLocaleString()} (Individual) / ${LIMITS.hsa_family.toLocaleString()} (Family)
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Contribution (Monthly)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.hsa_ee_contribution || ''}
                    onChange={(e) => handleChange('hsa_ee_contribution', e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0)}
                    disabled={disableHSA}
                    className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                      errors.hsa_ee_contribution ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    min="0"
                    step="0.01"
                  />
                </div>
                {formData.hsa_ee_contribution > 0 && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Annual: ${(formData.hsa_ee_contribution * 12).toLocaleString()}
                  </p>
                )}
                {errors.hsa_ee_contribution && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hsa_ee_contribution}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employer Contribution (Monthly)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.hsa_er_contribution || ''}
                    onChange={(e) => handleChange('hsa_er_contribution', e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0)}
                    disabled={disableHSA}
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    min="0"
                    step="0.01"
                  />
                </div>
                {formData.hsa_er_contribution > 0 && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Annual: ${(formData.hsa_er_contribution * 12).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* HRA Contributions */}
          <div className={disableHRA ? 'opacity-60' : ''}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Health Reimbursement Arrangement (HRA)
            </h3>
            {disableHRA ? (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-900 dark:text-red-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  HRA is disabled because employee has HSA
                </p>
              </div>
            ) : (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-teal-900 dark:text-teal-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  HRA is employer-funded only. Cannot be used with HSA.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employer Contribution (Monthly)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.hra_er_contribution || ''}
                  onChange={(e) => handleChange('hra_er_contribution', e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0)}
                  disabled={disableHRA}
                  className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                    errors.hra_er_contribution ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  min="0"
                  step="0.01"
                />
              </div>
              {formData.hra_er_contribution > 0 && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Annual: ${(formData.hra_er_contribution * 12).toLocaleString()}
                </p>
              )}
              {errors.hra_er_contribution && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hra_er_contribution}</p>
              )}
            </div>
          </div>

          {/* FSA Contributions */}
          <div className={disableFSA ? 'opacity-60' : ''}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Healthcare Flexible Spending Account (FSA)
            </h3>
            {disableFSA ? (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-900 dark:text-red-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Healthcare FSA is disabled because employee has HSA
                </p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-900 dark:text-green-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  2025 Annual Limit: ${LIMITS.fsa.toLocaleString()} | Cannot have both HSA and FSA
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee Contribution (Monthly)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.fsa_contribution || ''}
                  onChange={(e) => handleChange('fsa_contribution', e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0)}
                  disabled={disableFSA}
                  className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                    errors.fsa_contribution ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  min="0"
                  step="0.01"
                />
              </div>
              {formData.fsa_contribution > 0 && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Annual: ${(formData.fsa_contribution * 12).toLocaleString()}
                </p>
              )}
              {errors.fsa_contribution && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fsa_contribution}</p>
              )}
            </div>
          </div>

          {/* LFSA Contributions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Limited Flexible Spending Account (LFSA)
            </h3>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-indigo-900 dark:text-indigo-200">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                2025 Annual Limit: ${LIMITS.lfsa.toLocaleString()} | Only covers dental & vision. Can be used with HSA.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee Contribution (Monthly)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.lfsa_contribution || ''}
                  onChange={(e) => handleChange('lfsa_contribution', e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0)}
                  className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                    errors.lfsa_contribution ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  min="0"
                  step="0.01"
                />
              </div>
              {formData.lfsa_contribution > 0 && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Annual: ${(formData.lfsa_contribution * 12).toLocaleString()}
                </p>
              )}
              {errors.lfsa_contribution && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lfsa_contribution}</p>
              )}
            </div>
          </div>

          {/* Dependent Care FSA */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Dependent Care FSA
            </h3>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-purple-900 dark:text-purple-200">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                2025 Annual Limit: ${LIMITS.dcfsa.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee Contribution (Monthly)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.dependent_care_fsa || ''}
                  onChange={(e) => handleChange('dependent_care_fsa', e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0)}
                  className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                    errors.dependent_care_fsa ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  min="0"
                  step="0.01"
                />
              </div>
              {formData.dependent_care_fsa > 0 && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Annual: ${(formData.dependent_care_fsa * 12).toLocaleString()}
                </p>
              )}
              {errors.dependent_care_fsa && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dependent_care_fsa}</p>
              )}
            </div>
          </div>

          {/* 401k Contributions */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                401(k) Retirement
              </h3>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setRetirementInputMode('amount')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    retirementInputMode === 'amount'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Amount
                </button>
                <button
                  type="button"
                  onClick={() => setRetirementInputMode('percentage')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    retirementInputMode === 'percentage'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Percentage
                </button>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-900 dark:text-orange-200">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                2025 Annual Limit: $23,500 (Under 50) / $31,000 (50+)
              </p>
            </div>

            {retirementInputMode === 'amount' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Contribution (Monthly)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.retirement_ee_contribution_amount || ''}
                    onChange={(e) => {
                      const amount = e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0;
                      handleChange('retirement_ee_contribution_amount', amount);
                      // Clear percentage when entering amount
                      handleChange('retirement_ee_contribution_pct', 0);
                    }}
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                {formData.retirement_ee_contribution_amount > 0 && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Annual: ${(formData.retirement_ee_contribution_amount * 12).toLocaleString()}
                  </p>
                )}
                {errors.retirement_ee_contribution_amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.retirement_ee_contribution_amount}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Contribution (% of Annual Wage)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.retirement_ee_contribution_pct || ''}
                    onChange={(e) => {
                      const pct = e.target.value ? parseFloat(parseFloat(e.target.value).toFixed(2)) : 0;
                      handleChange('retirement_ee_contribution_pct', pct);
                      // Calculate and set the dollar amount
                      const monthlyAmount = (employee.annual_wage * pct / 100) / 12;
                      handleChange('retirement_ee_contribution_amount', parseFloat(monthlyAmount.toFixed(2)));
                    }}
                    className="w-full pr-8 pl-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
                {formData.retirement_ee_contribution_pct > 0 && (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p>Annual Wage: ${employee.annual_wage.toLocaleString()}</p>
                    <p className="font-semibold">
                      Monthly: ${((employee.annual_wage * formData.retirement_ee_contribution_pct / 100) / 12).toFixed(2)}
                    </p>
                    <p className="font-semibold">
                      Annual: ${(employee.annual_wage * formData.retirement_ee_contribution_pct / 100).toLocaleString()}
                    </p>
                  </div>
                )}
                {errors.retirement_ee_contribution_pct && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.retirement_ee_contribution_pct}</p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EmployeeContributionModal;
