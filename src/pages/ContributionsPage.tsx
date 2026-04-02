import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Calculator, TrendingUp, Users, AlertCircle, Info, PiggyBank, Heart, Baby, Edit, Download, ChevronDown, FileSpreadsheet } from 'lucide-react';
import EmployeeContributionModal from '../components/EmployeeContributionModal';
import ContributionReconciliationModal from '../components/ContributionReconciliationModal';

// Utility function to mask Employee ID for security
const maskEmployeeId = (id: string): string => {
  if (!id || id.length < 4) return '****';
  // Show only last 4 digits
  return '****' + id.slice(-4);
};

// Contribution Limits - Fetched dynamically from API
// Default values as fallback
const DEFAULT_CONTRIBUTION_LIMITS = {
  hsa: {
    individual: 4300,
    family: 8550,
    catchUp: 1000,
    catchUpAge: 55,
    description: "HSA contributions are tax-deductible. You cannot have both an HSA and a full Healthcare FSA."
  },
  hra: {
    description: "HRA is employer-funded only. Employees cannot contribute. Cannot be used with HSA."
  },
  fsa: {
    healthcare: 3300,
    dependent_care: 5000,
    description: "FSA funds are use-it-or-lose-it. You cannot have both a Healthcare FSA and HSA.",
    notes: ""
  },
  lfsa: {
    limited: 3300,
    description: "Limited FSA (LFSA) only covers dental and vision. Can be used with HSA."
  },
  retirement_401k: {
    employee: 23500,
    catchUp: 7500,
    catchUpAge: 50,
    notes: ""
  },
  year: 2025
};

interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  annual_wage: number;
  hsa_ee_contribution: number | null;
  hsa_er_contribution: number | null;
  hra_er_contribution: number | null; // HRA is employer-only
  fsa_contribution: number | null;
  lfsa_contribution: number | null; // Limited FSA
  dependent_care_fsa: number | null;
  retirement_ee_contribution_amount: number | null;
  retirement_ee_contribution_pct: number | null;
  medical_tier: string | null;
}

const ContributionsPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  // Contribution limits state
  const [contributionLimits, setContributionLimits] = useState(DEFAULT_CONTRIBUTION_LIMITS);

  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcType, setCalcType] = useState<'hsa' | 'fsa' | 'dcfsa'>('hsa');
  const [calcTier, setCalcTier] = useState<'individual' | 'family'>('individual');
  const [calcAge, setCalcAge] = useState<number>(30);
  const [calcAnnualContribution, setCalcAnnualContribution] = useState<number>(0);

  // Employee editing
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Reconciliation modal
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchContributionLimits();
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Fetch from analytics endpoint which has contribution fields
      const response = await fetch('/analytics/employees', { credentials: 'include' });
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContributionLimits = async () => {
    try {
      const response = await fetch('/contribution-limits/current', { credentials: 'include' });
      const data = await response.json();
      setContributionLimits(data);
    } catch (error) {
      console.error('Error fetching contribution limits:', error);
    }
  };

  const handleSaveContributions = async (employeeId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/employees/${employeeId}/contributions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update contributions');
      }

      // Refresh employee list
      await fetchEmployees();
      setEditingEmployee(null);
      alert('Contributions updated successfully!');
    } catch (error) {
      console.error('Error updating contributions:', error);
      alert('Failed to update contributions. Please try again.');
    }
  };

  const handleExportWebLink = () => {
    setShowExportMenu(false);

    const COMPANY_CODE = '152680';
    const PLAN_DATE = '01/01/2026'; // Both EffectiveDate and Start Date

    // Map medical tier to HSA code
    const getHSACode = (tier: string | null): string => {
      switch (tier) {
        case 'Employee Only': return 'HSA';
        case 'Employee + Children': return 'HSACH';
        case 'Employee + Spouse': return 'HSASP';
        case 'Family': return 'HSAFM';
        default: return 'HSA';
      }
    };

    // Headers - only required columns
    const headers = [
      'CO',
      'Id',
      'DedorEarn',
      'Deduction Code',
      'EffectiveDate',
      'Amount',
      'Annual Max',
    ];

    const rows: (string | number)[][] = [];

    employees.forEach(emp => {
      // HSA Employee Contribution
      if (emp.hsa_ee_contribution && emp.hsa_ee_contribution > 0) {
        const hsaCode = getHSACode(emp.medical_tier);
        const annualAmount = emp.hsa_ee_contribution * 12;
        const limit = emp.medical_tier?.includes('Family') ? contributionLimits.hsa.family : contributionLimits.hsa.individual;

        rows.push([
          COMPANY_CODE,
          emp.employee_id,
          'D',
          hsaCode,
          PLAN_DATE,
          annualAmount.toFixed(2),
          limit.toFixed(2),
        ]);
      }

      // HSA Employer Contribution
      if (emp.hsa_er_contribution && emp.hsa_er_contribution > 0) {
        const annualAmount = emp.hsa_er_contribution * 12;

        rows.push([
          COMPANY_CODE,
          emp.employee_id,
          'E',
          'HSAER',
          PLAN_DATE,
          annualAmount.toFixed(2),
          '',  // No limit for ER contribution
        ]);
      }

      // FSA
      if (emp.fsa_contribution && emp.fsa_contribution > 0) {
        const annualAmount = emp.fsa_contribution * 12;

        rows.push([
          COMPANY_CODE,
          emp.employee_id,
          'D',
          'FSA',
          PLAN_DATE,
          annualAmount.toFixed(2),
          contributionLimits.fsa.healthcare.toFixed(2),
        ]);
      }

      // Limited Purpose FSA
      if (emp.lfsa_contribution && emp.lfsa_contribution > 0) {
        const annualAmount = emp.lfsa_contribution * 12;

        rows.push([
          COMPANY_CODE,
          emp.employee_id,
          'D',
          'FSAL',
          PLAN_DATE,
          annualAmount.toFixed(2),
          contributionLimits.lfsa.limited.toFixed(2),
        ]);
      }

      // Dependent Care FSA
      if (emp.dependent_care_fsa && emp.dependent_care_fsa > 0) {
        const annualAmount = emp.dependent_care_fsa * 12;

        rows.push([
          COMPANY_CODE,
          emp.employee_id,
          'D',
          'DCARE',
          PLAN_DATE,
          annualAmount.toFixed(2),
          contributionLimits.fsa.dependent_care.toFixed(2),
        ]);
      }
    });

    // Create CSV content with headers
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `weblink_deduction_import_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = (exportType: 'all' | 'hsa' | 'hra' | 'fsa' | 'lfsa' | 'dcfsa' | '401k') => {
    setShowExportMenu(false);

    // Employer contribution amounts per paycheck by medical tier
    const hsaEmployerContributions: Record<string, number> = {
      'Employee Only': 32,
      'Employee + Spouse': 66,
      'Employee + Children': 62,
      'Family': 96,
    };

    const hraEmployerContributions: Record<string, number> = {
      'Employee Only': 25,
      'Employee + Spouse': 50,
      'Employee + Children': 50,
      'Family': 75,
    };

    // Get current date and plan dates
    const today = new Date();
    const payrollDate = today.toISOString().split('T')[0].replace(/-/g, '');
    // HRA uses first of the month
    const hraPayrollDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}01`;
    const planStartDate = `${today.getFullYear()}0101`; // January 1st of current year
    const planEndDate = `${today.getFullYear()}1231`; // December 31st of current year

    // Define base headers
    const baseHeaders = ['Employee ID', 'Employee Name', 'Department', 'Annual Wage', 'Medical Tier'];

    let headers: string[] = [];
    let fileName = '';

    // Configure headers based on export type
    switch (exportType) {
      case 'hsa':
        headers = ['Payroll Date', 'Account Type Code', 'Plan Start Date', 'Plan End Date', 'Last Name', 'First Name', 'Employee ID', 'Employee Contributions Per Pay Period', 'Employer Contributions Per Pay Period'];
        fileName = 'hsa_export';
        break;
      case 'hra':
        headers = ['Payroll Date', 'Account Type Code', 'Plan Start Date', 'Plan End Date', 'Last Name', 'First Name', 'Employee ID', 'Employee Contributions Per Pay Period', 'Employer Contributions Per Pay Period'];
        fileName = 'hra_export';
        break;
      case 'fsa':
        headers = ['Payroll Date', 'Account Type Code', 'Plan Start Date', 'Plan End Date', 'Last Name', 'First Name', 'Employee ID', 'Employee Contributions Per Pay Period', 'Employer Contributions Per Pay Period'];
        fileName = 'fsa_export';
        break;
      case 'lfsa':
        headers = ['Payroll Date', 'Account Type Code', 'Plan Start Date', 'Plan End Date', 'Last Name', 'First Name', 'Employee ID', 'Employee Contributions Per Pay Period', 'Employer Contributions Per Pay Period'];
        fileName = 'lfsa_export';
        break;
      case 'dcfsa':
        headers = ['Payroll Date', 'Account Type Code', 'Plan Start Date', 'Plan End Date', 'Last Name', 'First Name', 'Employee ID', 'Employee Contributions Per Pay Period', 'Employer Contributions Per Pay Period'];
        fileName = 'dcfsa_export';
        break;
      case '401k':
        headers = ['Payroll Date', 'Account Type Code', 'Plan Start Date', 'Plan End Date', 'Last Name', 'First Name', 'Employee ID', 'Employee Contributions Per Pay Period', 'Employer Contributions Per Pay Period'];
        fileName = '401k_export';
        break;
      default: // 'all'
        headers = [
          ...baseHeaders,
          'HSA Employee (Monthly)', 'HSA Employer (Monthly)', 'HSA Employee (Annual)', 'HSA Employer (Annual)',
          'HRA Employer (Monthly)', 'HRA Employer (Annual)',
          'FSA (Monthly)', 'FSA (Annual)',
          'LFSA (Monthly)', 'LFSA (Annual)',
          'Dependent Care FSA (Monthly)', 'Dependent Care FSA (Annual)',
          '401k Contribution (Monthly)', '401k Contribution (Annual)',
          'Total Tax-Advantaged (Annual)',
        ];
        fileName = 'all_contributions_export';
    }

    // Filter employees based on export type
    const filteredEmployees = exportType === 'all' ? employees : employees.filter(emp => {
      switch (exportType) {
        case 'hsa': return (emp.hsa_ee_contribution || 0) > 0 || (emp.hsa_er_contribution || 0) > 0;
        case 'hra': return (emp.hra_er_contribution || 0) > 0;
        case 'fsa': return (emp.fsa_contribution || 0) > 0;
        case 'lfsa': return (emp.lfsa_contribution || 0) > 0;
        case 'dcfsa': return (emp.dependent_care_fsa || 0) > 0;
        case '401k': return (emp.retirement_ee_contribution_amount || 0) > 0;
        default: return true;
      }
    });

    // Generate CSV rows
    const rows = filteredEmployees.map(emp => {
      const hsaEeMonthly = emp.hsa_ee_contribution || 0;
      const hsaErMonthly = emp.hsa_er_contribution || 0;
      const hraErMonthly = emp.hra_er_contribution || 0;
      const fsaMonthly = emp.fsa_contribution || 0;
      const lfsaMonthly = emp.lfsa_contribution || 0;
      const dcfsaMonthly = emp.dependent_care_fsa || 0;
      const retirementMonthly = emp.retirement_ee_contribution_amount || 0;

      const hsaEeAnnual = hsaEeMonthly * 12;
      const hsaErAnnual = hsaErMonthly * 12;
      const hraErAnnual = hraErMonthly * 12;
      const fsaAnnual = fsaMonthly * 12;
      const lfsaAnnual = lfsaMonthly * 12;
      const dcfsaAnnual = dcfsaMonthly * 12;
      const retirementAnnual = retirementMonthly * 12;

      const totalAnnual = hsaEeAnnual + fsaAnnual + lfsaAnnual + dcfsaAnnual + retirementAnnual;

      // Parse first and last names
      const nameParts = emp.full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Calculate per-pay-period amounts (bi-weekly = 26 pay periods)
      const hsaEePerPayPeriod = (hsaEeMonthly * 12 / 26).toFixed(2);
      const hsaErPerPayPeriod = hsaEmployerContributions[emp.medical_tier || ''] || 0;
      const hraErPerPayPeriod = hraEmployerContributions[emp.medical_tier || ''] || 0;
      const fsaPerPayPeriod = (fsaMonthly * 12 / 26).toFixed(2);
      const lfsaPerPayPeriod = (lfsaMonthly * 12 / 26).toFixed(2);
      const dcfsaPerPayPeriod = (dcfsaMonthly * 12 / 26).toFixed(2);
      const retirementPerPayPeriod = (retirementMonthly * 12 / 26).toFixed(2);

      const baseData = [
        emp.employee_id,
        emp.full_name,
        emp.department,
        emp.annual_wage,
        emp.medical_tier || 'None',
      ];

      let rowData: (string | number)[] = [];

      switch (exportType) {
        case 'hsa':
          rowData = [
            payrollDate,
            'PNC',
            planStartDate,
            planEndDate,
            lastName,
            firstName,
            emp.employee_id,
            hsaEePerPayPeriod,
            hsaErPerPayPeriod.toFixed(2),
          ];
          break;
        case 'hra':
          rowData = [
            hraPayrollDate, // First of the month for HRA
            'HRP',
            planStartDate,
            planEndDate,
            lastName,
            firstName,
            emp.employee_id,
            '0.00', // Employees don't contribute to HRA
            hraErPerPayPeriod.toFixed(2),
          ];
          break;
        case 'fsa':
          rowData = [
            payrollDate,
            'FSA',
            planStartDate,
            planEndDate,
            lastName,
            firstName,
            emp.employee_id,
            fsaPerPayPeriod,
            '0.00', // No employer contribution for FSA
          ];
          break;
        case 'lfsa':
          rowData = [
            payrollDate,
            'LPF',
            planStartDate,
            planEndDate,
            lastName,
            firstName,
            emp.employee_id,
            lfsaPerPayPeriod,
            '0.00', // No employer contribution for LFSA
          ];
          break;
        case 'dcfsa':
          rowData = [
            payrollDate,
            'DCP',
            planStartDate,
            planEndDate,
            lastName,
            firstName,
            emp.employee_id,
            dcfsaPerPayPeriod,
            '0.00', // No employer contribution for Dependent Care FSA
          ];
          break;
        case '401k':
          rowData = [
            payrollDate,
            '401K',
            planStartDate,
            planEndDate,
            lastName,
            firstName,
            emp.employee_id,
            retirementPerPayPeriod,
            '0.00', // Employer match would go here if applicable
          ];
          break;
        default: // 'all'
          rowData = [
            ...baseData,
            hsaEeMonthly.toFixed(2), hsaErMonthly.toFixed(2), hsaEeAnnual.toFixed(2), hsaErAnnual.toFixed(2),
            hraErMonthly.toFixed(2), hraErAnnual.toFixed(2),
            fsaMonthly.toFixed(2), fsaAnnual.toFixed(2),
            lfsaMonthly.toFixed(2), lfsaAnnual.toFixed(2),
            dcfsaMonthly.toFixed(2), dcfsaAnnual.toFixed(2),
            retirementMonthly.toFixed(2), retirementAnnual.toFixed(2),
            totalAnnual.toFixed(2),
          ];
      }

      return rowData;
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalHsaEe = 0;
    let totalHsaEr = 0;
    let totalHraEr = 0;
    let totalFsa = 0;
    let totalLfsa = 0;
    let totalDcFsa = 0;
    let totalRetirement = 0;
    let participantCount = {
      hsa: 0,
      hra: 0,
      fsa: 0,
      lfsa: 0,
      dcfsa: 0,
      retirement: 0,
    };

    employees.forEach(emp => {
      if (emp.hsa_ee_contribution) {
        totalHsaEe += emp.hsa_ee_contribution * 12;
        participantCount.hsa++;
      }
      if (emp.hsa_er_contribution) {
        totalHsaEr += emp.hsa_er_contribution * 12;
      }
      if (emp.hra_er_contribution) {
        totalHraEr += emp.hra_er_contribution * 12;
        participantCount.hra++;
      }
      if (emp.fsa_contribution) {
        totalFsa += emp.fsa_contribution * 12;
        participantCount.fsa++;
      }
      if (emp.lfsa_contribution) {
        totalLfsa += emp.lfsa_contribution * 12;
        participantCount.lfsa++;
      }
      if (emp.dependent_care_fsa) {
        totalDcFsa += emp.dependent_care_fsa * 12;
        participantCount.dcfsa++;
      }
      if (emp.retirement_ee_contribution_amount) {
        totalRetirement += emp.retirement_ee_contribution_amount * 12;
        participantCount.retirement++;
      }
    });

    return {
      hsa: { employee: totalHsaEe, employer: totalHsaEr, participants: participantCount.hsa },
      hra: { employer: totalHraEr, participants: participantCount.hra },
      fsa: { total: totalFsa, participants: participantCount.fsa },
      lfsa: { total: totalLfsa, participants: participantCount.lfsa },
      dcfsa: { total: totalDcFsa, participants: participantCount.dcfsa },
      retirement: { total: totalRetirement, participants: participantCount.retirement },
    };
  };

  const totals = calculateTotals();

  // Calculator functions
  const getCalculatorLimit = () => {
    switch (calcType) {
      case 'hsa':
        const baseLimit = calcTier === 'individual'
          ? contributionLimits.hsa.individual
          : contributionLimits.hsa.family;
        return calcAge >= (contributionLimits.hsa.catchUpAge || 55) ? baseLimit + contributionLimits.hsa.catchUp : baseLimit;
      case 'fsa':
        return contributionLimits.fsa.healthcare;
      case 'dcfsa':
        return contributionLimits.fsa.dependent_care;
      default:
        return 0;
    }
  };

  const getMonthlyContribution = () => {
    return calcAnnualContribution / 12;
  };

  const getTaxSavings = (annualAmount: number) => {
    // Assuming average combined tax rate of 30% (federal + state + FICA)
    return annualAmount * 0.30;
  };

  const getRemainingLimit = () => {
    return getCalculatorLimit() - calcAnnualContribution;
  };

  const filteredEmployees = employees.filter(emp => {
    if (selectedType === 'all') return true;
    if (selectedType === 'hsa') return emp.hsa_ee_contribution !== null && emp.hsa_ee_contribution > 0;
    if (selectedType === 'hra') return emp.hra_er_contribution !== null && emp.hra_er_contribution > 0;
    if (selectedType === 'fsa') return emp.fsa_contribution !== null && emp.fsa_contribution > 0;
    if (selectedType === 'lfsa') return emp.lfsa_contribution !== null && emp.lfsa_contribution > 0;
    if (selectedType === 'dcfsa') return emp.dependent_care_fsa !== null && emp.dependent_care_fsa > 0;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading contributions data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Contribution Accounts
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track HSA, FSA, and Dependent Care FSA contributions across your organization
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReconciliationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Reconcile Data
              </button>
              <div className="relative export-menu-container">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="py-1">
                      <button
                        onClick={handleExportWebLink}
                        className="w-full text-left px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-600"
                      >
                        WebLink Deduction Import
                      </button>
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                        Standard Exports
                      </div>
                      <button
                        onClick={() => handleExportCSV('all')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        All Contributions
                      </button>
                      <button
                        onClick={() => handleExportCSV('hsa')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        HSA Only
                      </button>
                      <button
                        onClick={() => handleExportCSV('hra')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        HRA Only
                      </button>
                      <button
                        onClick={() => handleExportCSV('fsa')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Healthcare FSA Only
                      </button>
                      <button
                        onClick={() => handleExportCSV('lfsa')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Limited FSA Only
                      </button>
                      <button
                        onClick={() => handleExportCSV('dcfsa')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Dependent Care FSA Only
                      </button>
                      <button
                        onClick={() => handleExportCSV('401k')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        401(k) Only
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Calculator className="w-5 h-5" />
                {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Calculator Section */}
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Contribution Calculator
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calculator Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Type
                  </label>
                  <select
                    value={calcType}
                    onChange={(e) => setCalcType(e.target.value as 'hsa' | 'fsa' | 'dcfsa')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="hsa">Health Savings Account (HSA)</option>
                    <option value="fsa">Healthcare FSA</option>
                    <option value="dcfsa">Dependent Care FSA</option>
                  </select>
                </div>

                {calcType === 'hsa' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Coverage Tier
                    </label>
                    <select
                      value={calcTier}
                      onChange={(e) => setCalcTier(e.target.value as 'individual' | 'family')}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="individual">Individual</option>
                      <option value="family">Family</option>
                    </select>
                  </div>
                )}

                {calcType === 'hsa' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={calcAge}
                      onChange={(e) => setCalcAge(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="18"
                      max="100"
                    />
                    {calcAge >= 55 && (
                      <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                        Eligible for $1,000 catch-up contribution
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Contribution Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={calcAnnualContribution}
                      onChange={(e) => setCalcAnnualContribution(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="0"
                      max={getCalculatorLimit()}
                      step="100"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      IRS Limit: ${getCalculatorLimit().toLocaleString()}
                    </span>
                    <span className={`font-medium ${
                      calcAnnualContribution > getCalculatorLimit()
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {calcAnnualContribution > getCalculatorLimit()
                        ? 'Over Limit!'
                        : `${getRemainingLimit().toLocaleString()} remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculator Results */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Calculation Results
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-300 dark:border-gray-500">
                    <span className="text-gray-700 dark:text-gray-300">Annual Contribution:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${calcAnnualContribution.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Monthly Contribution:</span>
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">
                      ${getMonthlyContribution().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Per Paycheck (bi-weekly):</span>
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">
                      ${(calcAnnualContribution / 26).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-300 dark:border-gray-500">
                    <span className="text-gray-700 dark:text-gray-300">Estimated Tax Savings:</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${getTaxSavings(calcAnnualContribution).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <Info className="w-4 h-4 inline mr-1" />
                      Tax savings estimated at 30% (federal + state + FICA). Actual savings may vary based on individual tax situation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PiggyBank className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{totals.hsa.participants} participants</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">HSA Contributions</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              ${totals.hsa.employee.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Employer: ${totals.hsa.employer.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Heart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{totals.fsa.participants} participants</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Healthcare FSA</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totals.fsa.total.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Annual employee contributions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Baby className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{totals.dcfsa.participants} participants</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Dependent Care FSA</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totals.dcfsa.total.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Annual employee contributions</p>
          </motion.div>

          {/* HRA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <PiggyBank className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{totals.hra.participants} participants</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">HRA (Employer-Funded)</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totals.hra.employer.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Annual employer contributions
            </p>
            <div className="mt-2 flex items-start gap-1 text-xs text-teal-600 dark:text-teal-400">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{contributionLimits.hra.description}</span>
            </div>
          </motion.div>

          {/* LFSA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Heart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{totals.lfsa.participants} participants</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Limited FSA</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totals.lfsa.total.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Annual employee contributions</p>
            <div className="mt-2 flex items-start gap-1 text-xs text-indigo-600 dark:text-indigo-400">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{contributionLimits.lfsa.description}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">All accounts</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Tax-Advantaged</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(totals.hsa.employee + totals.fsa.total + totals.lfsa.total + totals.dcfsa.total).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Employee annual savings</p>
          </motion.div>
        </div>

        {/* IRS Limits Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            {contributionLimits.year} IRS Contribution Limits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">HSA Limits</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Individual: <span className="font-medium text-gray-900 dark:text-white">${contributionLimits.hsa.individual.toLocaleString()}</span></li>
                <li>Family: <span className="font-medium text-gray-900 dark:text-white">${contributionLimits.hsa.family.toLocaleString()}</span></li>
                <li>Catch-up ({contributionLimits.hsa.catchUpAge}+): <span className="font-medium text-gray-900 dark:text-white">+${contributionLimits.hsa.catchUp.toLocaleString()}</span></li>
              </ul>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">FSA Limits</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Healthcare FSA: <span className="font-medium text-gray-900 dark:text-white">${contributionLimits.fsa.healthcare.toLocaleString()}</span></li>
                <li>No catch-up provision</li>
              </ul>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dependent Care FSA</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Annual Limit: <span className="font-medium text-gray-900 dark:text-white">${contributionLimits.fsa.dependent_care.toLocaleString()}</span></li>
                <li>No catch-up provision</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Employee Contributions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Employee Contributions
              </h2>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Accounts</option>
                <option value="hsa">HSA Only</option>
                <option value="hra">HRA Only</option>
                <option value="fsa">FSA Only</option>
                <option value="lfsa">LFSA Only</option>
                <option value="dcfsa">Dependent Care Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Employee ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">HSA (Monthly)</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">HRA (Monthly)</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">FSA (Monthly)</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">LFSA (Monthly)</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">DCFSA (Monthly)</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Annual</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((emp) => {
                  const totalAnnual =
                    ((emp.hsa_ee_contribution || 0) +
                     (emp.hra_er_contribution || 0) +
                     (emp.fsa_contribution || 0) +
                     (emp.lfsa_contribution || 0) +
                     (emp.dependent_care_fsa || 0)) * 12;

                  return (
                    <tr key={emp.employee_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {emp.full_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {maskEmployeeId(emp.employee_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {emp.department}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        {emp.hsa_ee_contribution ? `$${emp.hsa_ee_contribution.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-teal-600 dark:text-teal-400">
                        {emp.hra_er_contribution ? `$${emp.hra_er_contribution.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        {emp.fsa_contribution ? `$${emp.fsa_contribution.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-indigo-600 dark:text-indigo-400">
                        {emp.lfsa_contribution ? `$${emp.lfsa_contribution.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                        {emp.dependent_care_fsa ? `$${emp.dependent_care_fsa.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                        ${totalAnnual.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Employee Contribution Modal */}
      <AnimatePresence>
        {editingEmployee && (
          <EmployeeContributionModal
            employee={editingEmployee}
            onClose={() => setEditingEmployee(null)}
            onSave={handleSaveContributions}
          />
        )}
      </AnimatePresence>

      {/* Contribution Reconciliation Modal */}
      <ContributionReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
      />
    </div>
  );
};

export default ContributionsPage;
