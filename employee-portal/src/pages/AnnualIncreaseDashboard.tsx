import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Search,
  AlertTriangle,
  Send,
  CheckCircle,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';
import { apiGet, apiPut, apiPost } from '@/utils/api';

// =============================================================================
// TYPES
// =============================================================================

interface AnnualCycleSettings {
  lookback_date: string;
  wage_matrix_exempt: boolean;
}

interface AnnualCycle {
  id: number;
  cycle_id: string;
  name: string;
  fiscal_year: number;
  total_budget: number;
  budget_used: number;
  budget_remaining: number;
  total_employees_eligible: number;
  settings?: AnnualCycleSettings;
}

interface BudgetAreaData {
  id: number;
  cycle_id: number;
  area_label: string;
  eligible_count: number;
  ineligible_count: number;
  total_budget: number;
  total_allocated: number;
  difference: number;
  submission_status: string;
  submitted_at: string | null;
  overage_justification: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

interface EmployeeEntry {
  id: number;
  employee_id: string;
  employee_name: string | null;
  is_eligible: boolean;
  ineligibility_reason: string | null;
  eligibility_override: boolean;
  override_justification: string | null;
  current_base_rate: number;
  current_annual_wage: number;
  wage_type: string | null;
  employment_type: string | null;
  position: string | null;
  supervisor_name: string | null;
  team: string | null;
  increase_percentage: number;
  projected_base_rate: number;
  projected_annual_wage: number;
  total_difference: number;
  budget_area_id: number;
}

interface DashboardResponse {
  active: boolean;
  message?: string;
  cycle?: AnnualCycle;
  budget_area?: BudgetAreaData;
}

interface OverrideResponse {
  entry: EmployeeEntry;
  budget_area: BudgetAreaData;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// =============================================================================
// ELIGIBILITY OVERRIDE MODAL
// =============================================================================

function EligibilityOverrideModal({
  entry,
  onClose,
  onSubmit,
  submitting,
}: {
  entry: EmployeeEntry;
  onClose: () => void;
  onSubmit: (justification: string) => void;
  submitting: boolean;
}) {
  const [justification, setJustification] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Eligibility Override</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {entry.employee_name || entry.employee_id}
            </p>
            <p className="text-xs text-gray-500">Position: {entry.position || '—'}</p>
            <p className="text-xs text-gray-500">Current Annual: {formatCurrency(entry.current_annual_wage)}</p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Ineligibility Reason: {entry.ineligibility_reason || '—'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Justification for Eligibility <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
              rows={4}
              placeholder="Explain why this employee should be included in the annual increase..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(justification)}
            disabled={!justification.trim() || submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Request Eligibility'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// SUBMIT WARNING MODAL
// =============================================================================

function SubmitWarningModal({
  overageAmount,
  onClose,
  onSubmit,
  submitting,
}: {
  overageAmount: number;
  onClose: () => void;
  onSubmit: (justification: string) => void;
  submitting: boolean;
}) {
  const [justification, setJustification] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Over Budget Warning</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your total allocated increases exceed the allotted budget by{' '}
            <span className="font-bold text-red-600">{formatCurrency(overageAmount)}</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Justification for Overage <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
              rows={3}
              placeholder="Explain why the budget overage is necessary..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(justification)}
            disabled={!justification.trim() || submitting}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit with Overage'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export default function AnnualIncreaseDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [budgetArea, setBudgetArea] = useState<BudgetAreaData | null>(null);

  // Employees
  const [employees, setEmployees] = useState<EmployeeEntry[]>([]);
  const [eligibleFilter, setEligibleFilter] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [directOnly, setDirectOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [overrideEntry, setOverrideEntry] = useState<EmployeeEntry | null>(null);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================================================
  // LOAD DASHBOARD
  // ==========================================================================

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<DashboardResponse>('/annual-increase/portal/annual-increase/active');
      setDashboardData(data);
      if (data.budget_area) {
        setBudgetArea(data.budget_area);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Load employees
  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const params = new URLSearchParams();
      params.set('eligible', String(eligibleFilter));
      if (searchQuery) params.set('search', searchQuery);
      if (supervisorFilter) params.set('supervisor', supervisorFilter);
      if (positionFilter) params.set('position', positionFilter);
      if (teamFilter) params.set('team', teamFilter);
      if (directOnly) params.set('direct_only', 'true');

      const data = await apiGet<EmployeeEntry[]>(
        `/annual-increase/portal/annual-increase/employees?${params.toString()}`
      );
      setEmployees(data);
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
    } finally {
      setLoadingEmployees(false);
    }
  }, [eligibleFilter, searchQuery, supervisorFilter, positionFilter, teamFilter, directOnly]);

  useEffect(() => {
    if (dashboardData?.active) {
      loadEmployees();
    }
  }, [dashboardData?.active, loadEmployees]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleUpdatePercentage = async (entry: EmployeeEntry, pct: number) => {
    try {
      const updated = await apiPut<EmployeeEntry>(
        `/annual-increase/portal/annual-increase/employees/${entry.id}`,
        { increase_percentage: pct }
      );
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      // Refresh budget area totals
      const data = await apiGet<DashboardResponse>('/annual-increase/portal/annual-increase/active');
      if (data.budget_area) setBudgetArea(data.budget_area);
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
    }
  };

  const handleRequestEligibility = async (justification: string) => {
    if (!overrideEntry) return;
    try {
      setSubmitting(true);
      const result = await apiPost<OverrideResponse>(
        `/annual-increase/portal/annual-increase/employees/${overrideEntry.id}/request-eligibility`,
        { justification }
      );
      // Update the budget area
      setBudgetArea(result.budget_area);
      // Refresh employee lists
      await loadEmployees();
      setOverrideEntry(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (overageJustification?: string) => {
    try {
      setSubmitting(true);
      const updated = await apiPost<BudgetAreaData>(
        '/annual-increase/portal/annual-increase/submit',
        { overage_justification: overageJustification || null }
      );
      setBudgetArea(updated);
      setShowSubmitWarning(false);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (!budgetArea) return;
    const difference = budgetArea.total_budget - budgetArea.total_allocated;
    if (difference < 0) {
      setShowSubmitWarning(true);
    } else {
      handleSubmit();
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bifrost-violet" />
      </div>
    );
  }

  if (!dashboardData?.active || !budgetArea) {
    return (
      <div className="space-y-6 p-6">
        <AuroraPageHeader title="Annual Wage Increase" icon={DollarSign} />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {dashboardData?.message || 'No active annual increase dashboard available.'}
          </p>
        </div>
      </div>
    );
  }

  const difference = budgetArea.total_budget - budgetArea.total_allocated;
  const isOverBudget = difference < 0;
  const isSubmitted = budgetArea.submission_status === 'submitted';
  const isApproved = budgetArea.submission_status === 'approved';
  const isReturned = budgetArea.submission_status === 'returned';
  const canEdit = !isSubmitted && !isApproved;

  return (
    <div className="space-y-6 p-6">
      <AuroraPageHeader
        title="Annual Wage Increase Review"
        subtitle={dashboardData.cycle?.name}
        icon={DollarSign}
      />

      {/* Status Banner */}
      {isSubmitted && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-3">
          <Send className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Your sheet has been submitted and is pending SVP HR approval.
          </p>
        </div>
      )}

      {isApproved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Your annual increase sheet has been approved.
            {budgetArea.reviewed_by && ` Reviewed by ${budgetArea.reviewed_by}.`}
          </p>
        </div>
      )}

      {isReturned && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              Your sheet has been returned for adjustments.
            </p>
          </div>
          {budgetArea.review_notes && (
            <p className="text-sm text-red-700 dark:text-red-400 mt-2 ml-8">
              Notes: {budgetArea.review_notes}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Budget</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(budgetArea.total_budget)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Used</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(budgetArea.total_allocated)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Difference</p>
          <p className={`text-lg font-bold mt-1 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(difference)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Eligible</p>
          <p className="text-lg font-bold text-green-600 mt-1">{budgetArea.eligible_count}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ineligible</p>
          <p className="text-lg font-bold text-gray-500 mt-1">{budgetArea.ineligible_count}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Eligible / Ineligible toggle */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setEligibleFilter(true)}
            className={`px-4 py-2 text-sm font-medium ${
              eligibleFilter
                ? 'bg-bifrost-violet text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Eligible
          </button>
          <button
            onClick={() => setEligibleFilter(false)}
            className={`px-4 py-2 text-sm font-medium ${
              !eligibleFilter
                ? 'bg-bifrost-violet text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Ineligible
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          />
        </div>

        {/* Toggle Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        {/* Direct only toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={directOnly}
            onChange={(e) => setDirectOnly(e.target.checked)}
            className="w-4 h-4 text-bifrost-violet rounded border-gray-300 dark:border-gray-600"
          />
          Direct reports only
        </label>
      </div>

      {/* Extended Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-3"
        >
          <input
            type="text"
            placeholder="Filter by supervisor..."
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Filter by position..."
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Filter by team..."
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          />
        </motion.div>
      )}

      {/* Employee Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Position</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Base Rate</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Annualized</th>
                {eligibleFilter ? (
                  <>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Increase %</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Proj. Base</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Proj. Annual</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Difference</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingEmployees ? (
                <tr>
                  <td colSpan={eligibleFilter ? 10 : 8} className="px-3 py-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bifrost-violet mx-auto" />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={eligibleFilter ? 10 : 8} className="px-3 py-8 text-center text-gray-500">
                    No {eligibleFilter ? 'eligible' : 'ineligible'} employees found
                  </td>
                </tr>
              ) : (
                employees.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      entry.eligibility_override ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {entry.employee_name || entry.employee_id}
                      {entry.eligibility_override && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                          Override
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{entry.position || '—'}</td>
                    <td className="px-3 py-2 text-sm text-center">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        entry.employment_type === 'Full Time'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      }`}>
                        {entry.employment_type === 'Full Time' ? 'FT' : entry.employment_type === 'Part Time' ? 'PT' : entry.employment_type || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-700 dark:text-gray-300">
                      {entry.wage_type || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(entry.current_base_rate)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(entry.current_annual_wage)}
                    </td>
                    {eligibleFilter ? (
                      <>
                        <td className="px-3 py-2 text-center">
                          {canEdit ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={entry.increase_percentage}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) handleUpdatePercentage(entry, val);
                              }}
                              className="w-16 px-2 py-1 text-sm text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded text-blue-800 dark:text-blue-300"
                            />
                          ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {entry.increase_percentage}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(entry.projected_base_rate)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(entry.projected_annual_wage)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(entry.total_difference)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {entry.ineligibility_reason || '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {canEdit && !entry.eligibility_override && (
                            <button
                              onClick={() => setOverrideEntry(entry)}
                              className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                            >
                              Request Eligibility
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Button (fixed bottom bar) */}
      {canEdit && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Budget: {formatCurrency(budgetArea.total_budget)} &middot;
            Allocated: {formatCurrency(budgetArea.total_allocated)} &middot;
            <span className={isOverBudget ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
              {' '}{isOverBudget ? 'Over' : 'Under'}: {formatCurrency(Math.abs(difference))}
            </span>
          </div>
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-bifrost-violet hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      )}

      {/* Modals */}
      {overrideEntry && (
        <EligibilityOverrideModal
          entry={overrideEntry}
          onClose={() => setOverrideEntry(null)}
          onSubmit={handleRequestEligibility}
          submitting={submitting}
        />
      )}

      {showSubmitWarning && (
        <SubmitWarningModal
          overageAmount={Math.abs(difference)}
          onClose={() => setShowSubmitWarning(false)}
          onSubmit={(justification) => handleSubmit(justification)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
