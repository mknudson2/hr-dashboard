import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Award, FileText, Plus, Edit2, Trash2, Check, X, BarChart3, CheckSquare, Calendar } from 'lucide-react';
import {
  getCompensationDashboard,
  getBonuses,
  getCompensationReviews,
  createBonus,
  createCompensationReview,
  updateBonus,
  updateCompensationReview,
  deleteBonus,
  deleteCompensationReview,
} from '../services/compensationService';
import { getEmployees } from '../services/employeeService';
import CompensationAnalysis from '../components/compensation/CompensationAnalysis';
import WageIncreasesTab from '../components/compensation/WageIncreasesTab';
import AnnualIncreaseTab from '../components/compensation/AnnualIncreaseTab';
import BonusConditionsModal from '../components/BonusConditionsModal';

type TabType = 'dashboard' | 'bonuses' | 'reviews' | 'wage-increases' | 'annual-increase' | 'analytics';

interface CompensationDashboardData {
  total_bonuses_paid_ytd?: number;
  pending_bonuses?: number;
  active_equity_grants?: number;
  total_shares_granted?: number;
  pending_reviews?: number;
  avg_salary_increase_pct?: number;
}

interface BonusRecord {
  id: number;
  employee_id: string;
  employee_name?: string;
  bonus_type: string;
  amount: number;
  target_amount?: number;
  payment_date?: string;
  fiscal_year: number;
  quarter?: string;
  status: string;
  notes?: string;
  approved_by?: string;
  approved_date?: string;
  is_conditional?: boolean;
}

interface CompensationReviewRecord {
  id: number;
  employee_id: string;
  review_type: string;
  status: string;
  reviewer?: string;
  review_date?: string;
}

interface CompensationEmployee {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  wage?: number;
  wage_type?: string;
}

export default function CompensationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<CompensationDashboardData | null>(null);

  // Bonuses data
  const [bonuses, setBonuses] = useState<BonusRecord[]>([]);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [editingBonus, setEditingBonus] = useState<BonusRecord | null>(null);

  // Reviews data
  const [reviews, setReviews] = useState<CompensationReviewRecord[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<CompensationReviewRecord | null>(null);

  // Analytics data
  const [employees, setEmployees] = useState<CompensationEmployee[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dashboard') {
        const data = await getCompensationDashboard();
        setDashboardData(data);
      } else if (activeTab === 'bonuses') {
        const data = await getBonuses();
        setBonuses(data.bonuses || []);
      } else if (activeTab === 'reviews') {
        const data = await getCompensationReviews();
        setReviews(data.reviews || []);
      } else if (activeTab === 'analytics') {
        const data = await getEmployees();
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: DollarSign },
    { id: 'bonuses', label: 'Bonuses', icon: Award },
    { id: 'reviews', label: 'Reviews', icon: FileText },
    { id: 'wage-increases', label: 'Wage Increases', icon: TrendingUp },
    { id: 'annual-increase', label: 'Annual Increase', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (loading && !dashboardData && !bonuses.length && !reviews.length) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading compensation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Compensation Management
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage salaries, bonuses, and compensation reviews
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && dashboardData && (
          <DashboardTab data={dashboardData} />
        )}

        {activeTab === 'bonuses' && (
          <BonusesTab
            bonuses={bonuses}
            showForm={showBonusForm}
            setShowForm={setShowBonusForm}
            editing={editingBonus}
            setEditing={setEditingBonus}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewsTab
            reviews={reviews}
            showForm={showReviewForm}
            setShowForm={setShowReviewForm}
            editing={editingReview}
            setEditing={setEditingReview}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'wage-increases' && (
          <WageIncreasesTab />
        )}

        {activeTab === 'annual-increase' && (
          <AnnualIncreaseTab />
        )}

        {activeTab === 'analytics' && employees.length > 0 && (
          <CompensationAnalysis employees={employees} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

function DashboardTab({ data }: { data: CompensationDashboardData }) {
  const stats = [
    {
      label: 'Total Bonuses Paid YTD',
      value: `$${data.total_bonuses_paid_ytd?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Pending Bonuses',
      value: data.pending_bonuses || 0,
      icon: Award,
      color: 'yellow',
    },
    {
      label: 'Pending Reviews',
      value: data.pending_reviews || 0,
      icon: FileText,
      color: 'orange',
    },
    {
      label: 'Avg Salary Increase %',
      value: `${data.avg_salary_increase_pct || 0}%`,
      icon: TrendingUp,
      color: 'indigo',
    },
  ];

  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// BONUSES TAB
// ============================================================================

interface BonusesTabProps {
  bonuses: BonusRecord[];
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editing: BonusRecord | null;
  setEditing: (bonus: BonusRecord | null) => void;
  onRefresh: () => void;
}

function BonusesTab({ bonuses, showForm, setShowForm, editing, setEditing, onRefresh }: BonusesTabProps) {
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<BonusRecord | null>(null);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [markPaidBonusId, setMarkPaidBonusId] = useState<number | null>(null);
  const [markPaidNotes, setMarkPaidNotes] = useState('');

  const handleMarkPaid = async () => {
    if (markPaidBonusId === null) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateBonus(markPaidBonusId, {
        status: 'Paid',
        approved_date: today,
        ...(markPaidNotes.trim() ? { notes: markPaidNotes.trim() } : {}),
      });
      setShowMarkPaidModal(false);
      setMarkPaidBonusId(null);
      setMarkPaidNotes('');
      onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark bonus as paid';
      console.error('Error marking bonus as paid:', message);
      alert(message);
    }
  };

  const [formData, setFormData] = useState({
    employee_id: '',
    bonus_type: 'Performance',
    amount: '',
    target_amount: '',
    payment_date: '',
    fiscal_year: new Date().getFullYear(),
    quarter: '',
    status: 'Pending',
    notes: '',
    approved_by: '',
    approved_date: '',
    is_conditional: false,
  });

  useEffect(() => {
    if (editing) {
      setFormData({
        employee_id: editing.employee_id || '',
        bonus_type: editing.bonus_type || 'Performance',
        amount: editing.amount || '',
        target_amount: editing.target_amount || '',
        payment_date: editing.payment_date || '',
        fiscal_year: editing.fiscal_year || new Date().getFullYear(),
        quarter: editing.quarter || '',
        status: editing.status || 'Pending',
        notes: editing.notes || '',
        approved_by: editing.approved_by || '',
        approved_date: editing.approved_date || '',
        is_conditional: editing.is_conditional || false,
      });
      setShowForm(true);
    }
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        target_amount: formData.target_amount ? parseFloat(formData.target_amount) : null,
        quarter: formData.quarter ? parseInt(formData.quarter) : null,
        approved_date: formData.approved_date || null,
      };

      if (editing) {
        await updateBonus(editing.id, payload);
      } else {
        await createBonus(payload);
      }

      setShowForm(false);
      setEditing(null);
      setFormData({
        employee_id: '',
        bonus_type: 'Performance',
        amount: '',
        target_amount: '',
        payment_date: '',
        fiscal_year: new Date().getFullYear(),
        quarter: '',
        status: 'Pending',
        notes: '',
        approved_by: '',
        approved_date: '',
        is_conditional: false,
      });
      onRefresh();
    } catch (error) {
      console.error('Error saving bonus:', error);
      alert(error instanceof Error ? error.message : 'Failed to save bonus');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bonus?')) return;
    try {
      await deleteBonus(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting bonus:', error);
      alert('Failed to delete bonus');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Bonus
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editing ? 'Edit Bonus' : 'Add New Bonus'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bonus Type *
              </label>
              <select
                value={formData.bonus_type}
                onChange={(e) => setFormData({ ...formData, bonus_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="Annual">Annual</option>
                <option value="Performance">Performance</option>
                <option value="Signing">Signing</option>
                <option value="Retention">Retention</option>
                <option value="Commission">Commission</option>
                <option value="Spot">Spot</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quarter (1-4)
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={formData.quarter}
                onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_conditional}
                  onChange={(e) => setFormData({ ...formData, is_conditional: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conditional Bonus (has requirements/checklist)
                </span>
              </label>
              {formData.is_conditional && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  After creating the bonus, you can add conditions/checklist items that must be met.
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editing ? 'Update' : 'Create'} Bonus
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Conditions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {bonuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No bonuses found
                  </td>
                </tr>
              ) : (
                bonuses.map((bonus) => (
                  <tr key={bonus.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {bonus.employee_name || bonus.employee_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {bonus.bonus_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${bonus.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {bonus.payment_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          bonus.status === 'Paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : bonus.status === 'Approved'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : bonus.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {bonus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {bonus.is_conditional ? (
                        <button
                          onClick={() => {
                            setSelectedBonus(bonus);
                            setShowConditionsModal(true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span className="text-xs font-medium">
                            {bonus.conditions_completed || 0}/{bonus.conditions_total || 0}
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {bonus.status !== 'Paid' && (
                          <button
                            onClick={() => {
                              setMarkPaidBonusId(bonus.id);
                              setMarkPaidNotes('');
                              setShowMarkPaidModal(true);
                            }}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Mark as Given"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(bonus)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bonus.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonus Conditions Modal */}
      {selectedBonus && (
        <BonusConditionsModal
          isOpen={showConditionsModal}
          onClose={() => {
            setShowConditionsModal(false);
            setSelectedBonus(null);
            onRefresh(); // Refresh to get updated condition counts
          }}
          bonusId={selectedBonus.id}
          employeeName={selectedBonus.employee_name || selectedBonus.employee_id}
          bonusType={selectedBonus.bonus_type}
          bonusAmount={selectedBonus.amount}
        />
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Mark Bonus as Given
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString()}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={markPaidNotes}
                  onChange={(e) => setMarkPaidNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    setMarkPaidBonusId(null);
                    setMarkPaidNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REVIEWS TAB (Placeholder - similar structure to Bonuses)
// ============================================================================

interface ReviewsTabProps {
  reviews: CompensationReviewRecord[];
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editing: CompensationReviewRecord | null;
  setEditing: (review: CompensationReviewRecord | null) => void;
  onRefresh: () => void;
}

function ReviewsTab({ reviews, showForm, setShowForm, editing, setEditing, onRefresh }: ReviewsTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <p className="text-gray-600 dark:text-gray-400">
        Compensation reviews management - {reviews.length} reviews found
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
        (Form and table similar to Bonuses tab)
      </p>
    </div>
  );
}
