import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Calendar,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Send,
  ArrowLeft,
  Search,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import {
  getAnnualCycles,
  createAnnualCycle,
  updateCycleSettings,
  recalculateCycle,
  getBudgetAreas,
  toggleAreaDashboard,
  getCycleEmployees,
  updateEmployeeIncrease,
  getLeadership,
  getSubmissions,
  approveSubmission,
  returnSubmission,
} from '../../services/annualIncreaseService';
import type {
  AnnualCycle,
  BudgetArea,
  EmployeeEntry,
  LeadershipEntry,
} from '../../services/annualIncreaseService';

const currentYear = new Date().getFullYear();

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// =============================================================================
// STATUS BADGE
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    returned: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[status] || colors.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// =============================================================================
// RETURN NOTES MODAL
// =============================================================================

function ReturnModal({
  areaLabel,
  onClose,
  onSubmit,
}: {
  areaLabel: string;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Return for Adjustments</h3>
          <p className="text-sm text-gray-500 mt-1">{areaLabel}</p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes / Reason for Return <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            rows={4}
            placeholder="Explain what adjustments are needed..."
          />
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(notes)}
            disabled={!notes.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            Return Sheet
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AnnualIncreaseTab() {
  // Cycle state
  const [cycle, setCycle] = useState<AnnualCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [initializing, setInitializing] = useState(false);

  // Settings
  const [lookbackDate, setLookbackDate] = useState('');
  const [wageMatrixExempt, setWageMatrixExempt] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Budget areas
  const [budgetAreas, setBudgetAreas] = useState<BudgetArea[]>([]);

  // Leadership
  const [leadership, setLeadership] = useState<LeadershipEntry[]>([]);
  const [leadershipExpanded, setLeadershipExpanded] = useState(false);

  // Employees
  const [employees, setEmployees] = useState<EmployeeEntry[]>([]);
  const [eligibleFilter, setEligibleFilter] = useState(true);
  const [areaFilter, setAreaFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState<BudgetArea[]>([]);
  const [showReturnModal, setShowReturnModal] = useState<BudgetArea | null>(null);

  // ==========================================================================
  // LOAD CYCLE
  // ==========================================================================

  const loadCycle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cycles = await getAnnualCycles(selectedYear);
      if (cycles.length > 0) {
        const c = cycles[0];
        setCycle(c);
        if (c.settings) {
          setLookbackDate(c.settings.lookback_date || '');
          setWageMatrixExempt(c.settings.wage_matrix_exempt);
        }
      } else {
        setCycle(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  // Load budget areas + leadership + submissions when cycle loads
  useEffect(() => {
    if (!cycle) return;
    const load = async () => {
      try {
        const [areas, leaders, subs] = await Promise.all([
          getBudgetAreas(cycle.id),
          getLeadership(cycle.id),
          getSubmissions(),
        ]);
        setBudgetAreas(areas);
        setLeadership(leaders);
        setSubmissions(subs);
      } catch (err: unknown) {
        if (err instanceof Error) console.error(err.message);
      }
    };
    load();
  }, [cycle]);

  // Load employees when cycle or filters change
  useEffect(() => {
    if (!cycle) return;
    const loadEmp = async () => {
      try {
        setLoadingEmployees(true);
        const data = await getCycleEmployees(cycle.id, {
          eligible: eligibleFilter,
          budget_area_id: areaFilter,
          search: searchQuery || undefined,
        });
        setEmployees(data);
      } catch (err: unknown) {
        if (err instanceof Error) console.error(err.message);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmp();
  }, [cycle, eligibleFilter, areaFilter, searchQuery]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleInitialize = async () => {
    try {
      setInitializing(true);
      const result = await createAnnualCycle(selectedYear);
      setCycle(result.cycle);
      if (result.cycle.settings) {
        setLookbackDate(result.cycle.settings.lookback_date || '');
        setWageMatrixExempt(result.cycle.settings.wage_matrix_exempt);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setInitializing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!cycle) return;
    try {
      await updateCycleSettings(cycle.id, {
        lookback_date: lookbackDate || undefined,
        wage_matrix_exempt: wageMatrixExempt,
      });
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleRecalculate = async () => {
    if (!cycle) return;
    try {
      setRecalculating(true);
      await handleSaveSettings();
      const updated = await recalculateCycle(cycle.id);
      setCycle(updated);
      // Reload areas and employees
      const areas = await getBudgetAreas(cycle.id);
      setBudgetAreas(areas);
      const emps = await getCycleEmployees(cycle.id, {
        eligible: eligibleFilter,
        budget_area_id: areaFilter,
        search: searchQuery || undefined,
      });
      setEmployees(emps);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleToggleDashboard = async (area: BudgetArea) => {
    if (!cycle) return;
    try {
      const updated = await toggleAreaDashboard(cycle.id, area.id, !area.is_dashboard_enabled);
      setBudgetAreas((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      // Reload leadership
      const leaders = await getLeadership(cycle.id);
      setLeadership(leaders);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleUpdatePercentage = async (entry: EmployeeEntry, pct: number) => {
    if (!cycle) return;
    try {
      const updated = await updateEmployeeIncrease(cycle.id, entry.id, pct);
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      // Refresh budget areas
      const areas = await getBudgetAreas(cycle.id);
      setBudgetAreas(areas);
      // Refresh cycle totals
      const updatedCycle = await getAnnualCycles(selectedYear);
      if (updatedCycle.length > 0) setCycle(updatedCycle[0]);
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
    }
  };

  const handleApproveSubmission = async (area: BudgetArea) => {
    try {
      await approveSubmission(area.id, 'HR Admin');
      const subs = await getSubmissions();
      setSubmissions(subs);
      if (cycle) {
        const areas = await getBudgetAreas(cycle.id);
        setBudgetAreas(areas);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleReturnSubmission = async (notes: string) => {
    if (!showReturnModal) return;
    try {
      await returnSubmission(showReturnModal.id, 'HR Admin', notes);
      setShowReturnModal(null);
      const subs = await getSubmissions();
      setSubmissions(subs);
      if (cycle) {
        const areas = await getBudgetAreas(cycle.id);
        setBudgetAreas(areas);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  // ==========================================================================
  // RENDER: NO CYCLE
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fiscal Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2 text-lg">
            No Annual Wage Increase cycle for {selectedYear}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Initialize a cycle to auto-populate eligible employees with a default 3% increase.
          </p>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <button
            onClick={handleInitialize}
            disabled={initializing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {initializing ? 'Initializing...' : `Initialize ${selectedYear} Annual Increase`}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: CYCLE EXISTS
  // ==========================================================================

  const totalBudget = cycle.total_budget || 0;
  const totalAllocated = cycle.budget_used || 0;
  const totalDifference = totalBudget - totalAllocated;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{cycle.name}</h2>
          <p className="text-sm text-gray-500">
            Cycle {cycle.cycle_id} &middot; Effective {cycle.effective_date} &middot; {cycle.total_employees_eligible} eligible employees
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Budget</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalBudget)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Allocated</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalAllocated)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalDifference >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              <DollarSign className={`w-5 h-5 ${totalDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Difference</p>
              <p className={`text-xl font-bold ${totalDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(totalDifference)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Bar (collapsible) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <button
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cycle Settings</span>
            <span className="text-xs text-gray-500">
              Lookback: {lookbackDate || 'Not set'} &middot; Wage Matrix Exempt: {wageMatrixExempt ? 'On' : 'Off'}
            </span>
          </div>
          {settingsExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {settingsExpanded && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lookback Date</label>
                <input
                  type="date"
                  value={lookbackDate}
                  onChange={(e) => setLookbackDate(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Wage Matrix Increases Exempt</label>
                <button
                  onClick={() => setWageMatrixExempt(!wageMatrixExempt)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wageMatrixExempt ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wageMatrixExempt ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Recalculating...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Budget Areas Overview Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Areas Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Area</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Eligible</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ineligible</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Budget</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Allocated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Difference</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dashboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {budgetAreas.map((area) => (
                <tr key={area.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {area.area_label}
                    {area.title_level && (
                      <span className="ml-2 text-xs text-gray-500 uppercase">{area.title_level}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{area.eligible_count}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{area.ineligible_count}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{formatCurrency(area.total_budget)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{formatCurrency(area.total_allocated)}</td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${area.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(area.difference)}
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={area.submission_status} /></td>
                  <td className="px-4 py-3 text-center">
                    {area.decision_maker_employee_id && (
                      <button
                        onClick={() => handleToggleDashboard(area)}
                        className={`p-1 rounded ${area.is_dashboard_enabled ? 'text-green-600 bg-green-100 dark:bg-green-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                        title={area.is_dashboard_enabled ? 'Dashboard enabled' : 'Enable dashboard'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {budgetAreas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No budget areas found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leadership Dashboard Selection (hierarchical) */}
      {leadership.length > 0 && (() => {
        const president = leadership.find((l) => l.title_level === 'president');
        const svps = leadership.filter((l) => l.title_level === 'svp');
        const vps = leadership.filter((l) => l.title_level === 'vp');

        // Check if a VP is disabled because its parent SVP is selected
        const isVpDisabledBySvp = (vp: LeadershipEntry) => {
          if (!vp.parent_employee_id) return false;
          const parentSvp = svps.find((s) => s.employee_id === vp.parent_employee_id);
          return parentSvp?.is_dashboard_enabled ?? false;
        };

        const handleSvpToggle = async (svp: LeadershipEntry) => {
          const area = budgetAreas.find((a) => a.decision_maker_employee_id === svp.employee_id);
          if (!area || !cycle) return;
          const enabling = !svp.is_dashboard_enabled;
          // Toggle SVP
          await toggleAreaDashboard(cycle.id, area.id, enabling);
          // If enabling SVP, disable all VPs under them
          if (enabling) {
            const childVps = vps.filter((v) => v.parent_employee_id === svp.employee_id && v.is_dashboard_enabled);
            for (const vp of childVps) {
              const vpArea = budgetAreas.find((a) => a.decision_maker_employee_id === vp.employee_id);
              if (vpArea) {
                await toggleAreaDashboard(cycle.id, vpArea.id, false);
              }
            }
          }
          // Reload
          const [areas, leaders] = await Promise.all([getBudgetAreas(cycle.id), getLeadership(cycle.id)]);
          setBudgetAreas(areas);
          setLeadership(leaders);
        };

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <button
              onClick={() => setLeadershipExpanded(!leadershipExpanded)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Leadership Dashboard Selection ({leadership.length})
                </span>
              </div>
              {leadershipExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {leadershipExpanded && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                {/* President */}
                {president && (
                  <div className="bg-[#2ABFBF]/10 dark:bg-[#2ABFBF]/5 border border-[#2ABFBF]/30 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={president.is_dashboard_enabled}
                        onChange={() => {
                          const area = budgetAreas.find((a) => a.decision_maker_employee_id === president.employee_id);
                          if (area) handleToggleDashboard(area);
                        }}
                        className="w-4 h-4 text-[#2ABFBF] rounded border-gray-300 dark:border-gray-600"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{president.name}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-[#2ABFBF]/20 text-[#2ABFBF] rounded-full font-medium">President</span>
                        <span className="ml-2 text-xs text-gray-500">{president.area_label}</span>
                      </div>
                    </label>

                    {/* SVP columns */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {svps.map((svp) => {
                        const childVps = vps.filter((v) => v.parent_employee_id === svp.employee_id);
                        return (
                          <div
                            key={svp.employee_id}
                            className="bg-[#E8B84B]/10 dark:bg-[#E8B84B]/5 border border-[#E8B84B]/30 rounded-lg p-3"
                          >
                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                              <input
                                type="checkbox"
                                checked={svp.is_dashboard_enabled}
                                onChange={() => handleSvpToggle(svp)}
                                className="w-4 h-4 text-[#E8B84B] rounded border-gray-300 dark:border-gray-600"
                              />
                              <div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{svp.name}</span>
                                <div className="text-[11px] text-gray-500">SVP, {svp.area_label}</div>
                              </div>
                            </label>

                            {/* VPs under this SVP */}
                            <div className="space-y-1.5 ml-1">
                              {childVps.map((vp) => {
                                const disabled = isVpDisabledBySvp(vp);
                                return (
                                  <label
                                    key={vp.employee_id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                      disabled
                                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-50 cursor-not-allowed'
                                        : 'border-[#6C3FA0]/30 bg-[#6C3FA0]/5 hover:bg-[#6C3FA0]/10 cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!disabled && vp.is_dashboard_enabled}
                                      disabled={disabled}
                                      onChange={() => {
                                        if (disabled) return;
                                        const area = budgetAreas.find((a) => a.decision_maker_employee_id === vp.employee_id);
                                        if (area) handleToggleDashboard(area);
                                      }}
                                      className="w-3.5 h-3.5 text-[#6C3FA0] rounded border-gray-300 dark:border-gray-600 disabled:opacity-40"
                                    />
                                    <div>
                                      <span className="text-xs font-medium text-gray-900 dark:text-white">{vp.name}</span>
                                      <div className="text-[10px] text-gray-500">VP, {vp.area_label}</div>
                                    </div>
                                  </label>
                                );
                              })}
                              {childVps.length === 0 && (
                                <p className="text-[10px] text-gray-400 italic px-2">No VPs</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* VPs with no SVP parent (orphaned) */}
                    {(() => {
                      const orphanVps = vps.filter((v) => !v.parent_employee_id || !svps.find((s) => s.employee_id === v.parent_employee_id));
                      if (orphanVps.length === 0) return null;
                      return (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {orphanVps.map((vp) => (
                            <label
                              key={vp.employee_id}
                              className="flex items-center gap-2 p-2 rounded-lg border border-[#6C3FA0]/30 bg-[#6C3FA0]/5 hover:bg-[#6C3FA0]/10 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={vp.is_dashboard_enabled}
                                onChange={() => {
                                  const area = budgetAreas.find((a) => a.decision_maker_employee_id === vp.employee_id);
                                  if (area) handleToggleDashboard(area);
                                }}
                                className="w-3.5 h-3.5 text-[#6C3FA0] rounded border-gray-300 dark:border-gray-600"
                              />
                              <div>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">{vp.name}</span>
                                <div className="text-[10px] text-gray-500">VP, {vp.area_label}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Employee Table Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Eligible / Ineligible toggle */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setEligibleFilter(true)}
            className={`px-4 py-2 text-sm font-medium ${
              eligibleFilter
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Eligible
          </button>
          <button
            onClick={() => setEligibleFilter(false)}
            className={`px-4 py-2 text-sm font-medium ${
              !eligibleFilter
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Ineligible
          </button>
        </div>

        {/* Budget Area filter */}
        <select
          value={areaFilter ?? ''}
          onChange={(e) => setAreaFilter(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">All Budget Areas</option>
          {budgetAreas.map((a) => (
            <option key={a.id} value={a.id}>{a.area_label}</option>
          ))}
        </select>

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
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Budget Area</th>
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
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingEmployees ? (
                <tr>
                  <td colSpan={eligibleFilter ? 11 : 8} className="px-3 py-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={eligibleFilter ? 11 : 8} className="px-3 py-8 text-center text-gray-500">
                    No {eligibleFilter ? 'eligible' : 'ineligible'} employees found
                  </td>
                </tr>
              ) : (
                employees.map((entry) => {
                  const areaName = budgetAreas.find((a) => a.id === entry.budget_area_id)?.area_label || '—';
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${entry.eligibility_override ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                    >
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.employee_name || entry.employee_id}
                        {entry.eligibility_override && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                            Override
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{areaName}</td>
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
                        <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {entry.ineligibility_reason || '—'}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submissions Section */}
      {submissions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submitted Sheets for Review</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {submissions.map((sub) => (
              <div key={sub.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.area_label}</p>
                  <p className="text-xs text-gray-500">
                    Budget: {formatCurrency(sub.total_budget)} &middot; Allocated: {formatCurrency(sub.total_allocated)} &middot; Diff: {formatCurrency(sub.difference)}
                  </p>
                  {sub.overage_justification && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Over budget: {sub.overage_justification}
                    </p>
                  )}
                  {sub.review_notes && (
                    <p className="text-xs text-gray-500 mt-1">Review notes: {sub.review_notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sub.submission_status} />
                  {sub.submission_status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleApproveSubmission(sub)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setShowReturnModal(sub)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
                      >
                        Return
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <ReturnModal
          areaLabel={showReturnModal.area_label}
          onClose={() => setShowReturnModal(null)}
          onSubmit={handleReturnSubmission}
        />
      )}
    </div>
  );
}
