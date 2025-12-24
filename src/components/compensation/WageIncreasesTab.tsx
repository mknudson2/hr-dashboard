import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  BarChart3,
  DollarSign,
  Calendar,
  Users,
  Target,
  Filter,
  Download,
  Eye,
  Check,
  X,
  ArrowRight,
  Lock,
} from 'lucide-react';
import {
  getWageIncreaseCycles,
  createWageIncreaseCycle,
  updateWageIncreaseCycle,
  deleteWageIncreaseCycle,
  getCycleAnalytics,
  getCycleReviews,
  approveCycle,
  transitionCycleStatus,
  closeCycle,
} from '../../services/compensationService';

interface WageIncreaseCycle {
  id: number;
  cycle_id: string;
  name: string;
  fiscal_year: number;
  cycle_type: string;
  planning_start_date: string | null;
  planning_end_date: string | null;
  effective_date: string;
  total_budget: number;
  budget_used: number;
  budget_remaining: number;
  budget_percentage: number | null;
  budget_utilization: number;
  status: string;
  total_employees_eligible: number;
  total_employees_reviewed: number;
  total_employees_approved: number;
  completion_rate: number;
  approval_rate: number;
  min_increase_percentage: number | null;
  max_increase_percentage: number | null;
  target_increase_percentage: number | null;
  notes: string | null;
  guidelines: string | null;
  approved_by: string | null;
  approved_date: string | null;
  created_at: string;
  updated_at: string | null;
}

interface CycleAnalytics {
  cycle_id: string;
  cycle_name: string;
  fiscal_year: number;
  status: string;
  budget: {
    total_budget: number;
    budget_used: number;
    budget_remaining: number;
    budget_utilization_pct: number;
    projected_total: number;
    projected_remaining: number;
    budget_percentage: number;
  };
  completion: {
    total_employees_eligible: number;
    total_employees_reviewed: number;
    total_employees_approved: number;
    pending_reviews: number;
    rejected_reviews: number;
    completion_rate: number;
    approval_rate: number;
  };
  increase_statistics: {
    target_increase_pct: number;
    actual_avg_increase_pct: number;
    min_increase_pct: number;
    max_increase_pct: number;
    guideline_min: number;
    guideline_max: number;
  };
  department_breakdown: Record<string, {
    count: number;
    total_increase: number;
    avg_increase_pct: number;
  }>;
}

export default function WageIncreasesTab() {
  const [cycles, setCycles] = useState<WageIncreaseCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WageIncreaseCycle | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<WageIncreaseCycle | null>(null);
  const [analytics, setAnalytics] = useState<CycleAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalCycle, setApprovalCycle] = useState<WageIncreaseCycle | null>(null);

  // Filters
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  useEffect(() => {
    loadCycles();
  }, [fiscalYearFilter, statusFilter, typeFilter]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (fiscalYearFilter !== 'All') filters.fiscal_year = parseInt(fiscalYearFilter);
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (typeFilter !== 'All') filters.cycle_type = typeFilter;

      const data = await getWageIncreaseCycles(filters);
      setCycles(data.cycles || []);
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalytics = async (cycle: WageIncreaseCycle) => {
    try {
      setSelectedCycle(cycle);
      const data = await getCycleAnalytics(cycle.id);
      setAnalytics(data);
      setShowAnalytics(true);
    } catch (error) {
      console.error('Error loading analytics:', error);
      alert('Failed to load cycle analytics');
    }
  };

  const handleEdit = (cycle: WageIncreaseCycle) => {
    setEditing(cycle);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this wage increase cycle?')) return;
    try {
      await deleteWageIncreaseCycle(id);
      loadCycles();
    } catch (error: any) {
      console.error('Error deleting cycle:', error);
      alert(error.message || 'Failed to delete cycle');
    }
  };

  const handleApprove = (cycle: WageIncreaseCycle) => {
    setApprovalCycle(cycle);
    setShowApprovalModal(true);
  };

  const handleClose = async (cycle: WageIncreaseCycle) => {
    const closedBy = prompt('Enter your name to close this cycle:');
    if (!closedBy) return;

    const notes = prompt('Optional notes for closing:');

    try {
      await closeCycle(cycle.id, closedBy, notes || undefined);
      loadCycles();
      alert('Cycle successfully closed');
    } catch (error: any) {
      console.error('Error closing cycle:', error);
      alert(error.message || 'Failed to close cycle');
    }
  };

  const fiscalYears = Array.from(new Set([
    ...cycles.map(c => c.fiscal_year),
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ])).sort((a, b) => b - a);

  const statuses = ['Planning', 'Review', 'Approved', 'Implemented', 'Closed'];
  const types = ['Annual', 'Mid-Year', 'Promotion', 'Market Adjustment'];

  if (loading && cycles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading wage increase cycles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Wage Increase Cycle
        </button>

        <div className="flex flex-wrap gap-3">
          <select
            value={fiscalYearFilter}
            onChange={(e) => setFiscalYearFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="All">All Years</option>
            {fiscalYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="All">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="All">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cycles Grid */}
      {cycles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No wage increase cycles found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Create a new cycle to start planning salary increases
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cycles.map((cycle, index) => (
            <motion.div
              key={cycle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {cycle.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cycle.status === 'Planning' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                      cycle.status === 'Review' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                      cycle.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                      cycle.status === 'Implemented' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' :
                      'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                    }`}>
                      {cycle.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {cycle.cycle_id} • {cycle.cycle_type}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Approval/Workflow Buttons */}
                  {(cycle.status === 'Planning' || cycle.status === 'Review' || cycle.status === 'Approved') && (
                    <button
                      onClick={() => handleApprove(cycle)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title={
                        cycle.status === 'Planning' ? 'Move to Review' :
                        cycle.status === 'Review' ? 'Approve Cycle' :
                        'Implement Cycle'
                      }
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {cycle.status === 'Implemented' && (
                    <button
                      onClick={() => handleClose(cycle)}
                      className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Close Cycle"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleViewAnalytics(cycle)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="View Analytics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(cycle)}
                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cycle.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Budget</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${cycle.total_budget.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Target %</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {cycle.target_increase_percentage || 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Effective Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(cycle.effective_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Eligible</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {cycle.total_employees_eligible}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                {/* Budget Utilization */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Budget Used</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {cycle.budget_utilization}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 dark:bg-green-500 transition-all"
                      style={{ width: `${Math.min(cycle.budget_utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Completion Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Completion</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {cycle.completion_rate}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                      style={{ width: `${Math.min(cycle.completion_rate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              {cycle.guidelines && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {cycle.guidelines}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <CycleFormModal
          cycle={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditing(null);
            loadCycles();
          }}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && analytics && selectedCycle && (
        <AnalyticsModal
          cycle={selectedCycle}
          analytics={analytics}
          onClose={() => {
            setShowAnalytics(false);
            setAnalytics(null);
            setSelectedCycle(null);
          }}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && approvalCycle && (
        <ApprovalModal
          cycle={approvalCycle}
          onClose={() => {
            setShowApprovalModal(false);
            setApprovalCycle(null);
          }}
          onApprove={() => {
            setShowApprovalModal(false);
            setApprovalCycle(null);
            loadCycles();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// CYCLE FORM MODAL
// ============================================================================

function CycleFormModal({ cycle, onClose, onSave }: {
  cycle: WageIncreaseCycle | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: cycle?.name || '',
    fiscal_year: cycle?.fiscal_year || new Date().getFullYear(),
    cycle_type: cycle?.cycle_type || 'Annual',
    planning_start_date: cycle?.planning_start_date || '',
    planning_end_date: cycle?.planning_end_date || '',
    effective_date: cycle?.effective_date || '',
    total_budget: cycle?.total_budget || 0,
    budget_percentage: cycle?.budget_percentage || 0,
    status: cycle?.status || 'Planning',
    min_increase_percentage: cycle?.min_increase_percentage || 0,
    max_increase_percentage: cycle?.max_increase_percentage || 10,
    target_increase_percentage: cycle?.target_increase_percentage || 3,
    notes: cycle?.notes || '',
    guidelines: cycle?.guidelines || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        total_budget: parseFloat(formData.total_budget.toString()),
        budget_percentage: formData.budget_percentage ? parseFloat(formData.budget_percentage.toString()) : null,
        min_increase_percentage: formData.min_increase_percentage ? parseFloat(formData.min_increase_percentage.toString()) : null,
        max_increase_percentage: formData.max_increase_percentage ? parseFloat(formData.max_increase_percentage.toString()) : null,
        target_increase_percentage: formData.target_increase_percentage ? parseFloat(formData.target_increase_percentage.toString()) : null,
        planning_start_date: formData.planning_start_date || null,
        planning_end_date: formData.planning_end_date || null,
        notes: formData.notes || null,
        guidelines: formData.guidelines || null,
      };

      if (cycle) {
        await updateWageIncreaseCycle(cycle.id, payload);
      } else {
        await createWageIncreaseCycle(payload);
      }

      onSave();
    } catch (error) {
      console.error('Error saving cycle:', error);
      alert('Failed to save cycle');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {cycle ? 'Edit Wage Increase Cycle' : 'New Wage Increase Cycle'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cycle Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fiscal Year *
              </label>
              <input
                type="number"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cycle Type *
              </label>
              <select
                value={formData.cycle_type}
                onChange={(e) => setFormData({ ...formData, cycle_type: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                required
              >
                <option value="Annual">Annual</option>
                <option value="Mid-Year">Mid-Year</option>
                <option value="Promotion">Promotion</option>
                <option value="Market Adjustment">Market Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                required
              >
                <option value="Planning">Planning</option>
                <option value="Review">Review</option>
                <option value="Approved">Approved</option>
                <option value="Implemented">Implemented</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Effective Date *
              </label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                required
              />
            </div>
          </div>

          {/* Planning Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Planning Start Date
              </label>
              <input
                type="date"
                value={formData.planning_start_date}
                onChange={(e) => setFormData({ ...formData, planning_start_date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Planning End Date
              </label>
              <input
                type="date"
                value={formData.planning_end_date}
                onChange={(e) => setFormData({ ...formData, planning_end_date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>
          </div>

          {/* Budget Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Budget *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_budget}
                onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget % of Payroll
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.budget_percentage}
                onChange={(e) => setFormData({ ...formData, budget_percentage: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>
          </div>

          {/* Increase Guidelines */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Increase %
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.min_increase_percentage}
                onChange={(e) => setFormData({ ...formData, min_increase_percentage: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Increase %
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.target_increase_percentage}
                onChange={(e) => setFormData({ ...formData, target_increase_percentage: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Increase %
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.max_increase_percentage}
                onChange={(e) => setFormData({ ...formData, max_increase_percentage: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>
          </div>

          {/* Guidelines and Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Guidelines
            </label>
            <textarea
              value={formData.guidelines}
              onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              placeholder="Guidelines for managers..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {cycle ? 'Update Cycle' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================================
// ANALYTICS MODAL
// ============================================================================

function AnalyticsModal({ cycle, analytics, onClose }: {
  cycle: WageIncreaseCycle;
  analytics: CycleAnalytics;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.cycle_name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {analytics.cycle_id} • FY{analytics.fiscal_year} • {analytics.status}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Budget Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Budget Overview
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${analytics.budget.total_budget.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget Used</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${analytics.budget.budget_used.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.budget.budget_utilization_pct}% utilized
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${analytics.budget.budget_remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Completion Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Completion Progress
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Eligible</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.completion.total_employees_eligible}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reviewed</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.completion.total_employees_reviewed}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.completion.completion_rate}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {analytics.completion.total_employees_approved}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {analytics.completion.pending_reviews}
                </p>
              </div>
            </div>
          </div>

          {/* Increase Statistics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Increase Statistics
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Target</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.increase_statistics.target_increase_pct}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actual Avg</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.increase_statistics.actual_avg_increase_pct}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Minimum</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {analytics.increase_statistics.min_increase_pct}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Maximum</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {analytics.increase_statistics.max_increase_pct}%
                </p>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          {Object.keys(analytics.department_breakdown).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Department Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.department_breakdown).map(([dept, stats]) => (
                  <div
                    key={dept}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{dept}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.count} employees • ${stats.total_increase.toLocaleString()} total
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {stats.avg_increase_pct}%
                      </p>
                      <p className="text-xs text-gray-500">avg increase</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// APPROVAL MODAL
// ============================================================================

function ApprovalModal({ cycle, onClose, onApprove }: {
  cycle: WageIncreaseCycle;
  onClose: () => void;
  onApprove: () => void;
}) {
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const getNextStatus = (currentStatus: string) => {
    const transitions: Record<string, string> = {
      'Planning': 'Review',
      'Review': 'Approved',
      'Approved': 'Implemented',
    };
    return transitions[currentStatus] || currentStatus;
  };

  const getActionText = (currentStatus: string) => {
    const actions: Record<string, string> = {
      'Planning': 'Move to Review',
      'Review': 'Approve Cycle',
      'Approved': 'Mark as Implemented',
    };
    return actions[currentStatus] || 'Approve';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedBy.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      await approveCycle(cycle.id, approvedBy, notes || undefined);
      onApprove();
    } catch (error: any) {
      console.error('Error approving cycle:', error);
      alert(error.message || 'Failed to approve cycle');
      setLoading(false);
    }
  };

  const nextStatus = getNextStatus(cycle.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getActionText(cycle.status)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {cycle.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status Transition Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  {cycle.status}
                </span>
                <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  {nextStatus}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              This will transition the cycle to <strong>{nextStatus}</strong> status
            </p>
          </div>

          {/* Approved By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              placeholder="Enter your name"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
              placeholder="Add any notes about this approval..."
            />
          </div>

          {/* Cycle Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Fiscal Year</span>
              <span className="font-medium text-gray-900 dark:text-white">{cycle.fiscal_year}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Budget</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ${cycle.total_budget.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Effective Date</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(cycle.effective_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {getActionText(cycle.status)}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
