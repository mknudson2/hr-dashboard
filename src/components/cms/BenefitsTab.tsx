import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { API_URL } from '@/config/api';

interface Plan {
  id: number;
  name: string;
  type: string;
  description: string;
  coverage_details: string;
  employee_cost: string;
  employer_contribution: string;
  enrollment_info: string;
  sort_order: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  plans: Plan[];
}

interface BenefitsConfig {
  enrollment_open: boolean;
  start_date: string | null;
  end_date: string | null;
  contact_email: string;
  contact_phone: string;
}

export default function BenefitsTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<BenefitsConfig>({ enrollment_open: false, start_date: null, end_date: null, contact_email: '', contact_phone: '' });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Config editing
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState<BenefitsConfig>(config);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catMode, setCatMode] = useState<'create' | 'edit'>('create');
  const [catForm, setCatForm] = useState({ name: '', description: '', icon: 'heart' });
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  // Plan modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planMode, setPlanMode] = useState<'create' | 'edit'>('create');
  const [planForm, setPlanForm] = useState({ name: '', type: '', description: '', coverage_details: '', employee_cost: '', employer_contribution: '', enrollment_info: '', category_id: 0 });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [catRes, cfgRes] = await Promise.all([
        fetch(`${API_URL}/content-management/benefits/categories`, { credentials: 'include' }),
        fetch(`${API_URL}/content-management/benefits/config`, { credentials: 'include' }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData);
        setConfigForm(cfgData);
      }
    } catch (err) {
      console.error('Failed to load benefits data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Config handlers
  const handleSaveConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/content-management/benefits/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(configForm),
      });
      if (!res.ok) throw new Error('Failed to save');
      setConfig(configForm);
      setEditingConfig(false);
    } catch (err) {
      alert('Failed to save config');
    }
  };

  // Category handlers
  const openCreateCategory = () => {
    setCatMode('create');
    setCatForm({ name: '', description: '', icon: 'heart' });
    setShowCatModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setCatMode('edit');
    setCatForm({ name: cat.name, description: cat.description, icon: cat.icon });
    setEditingCatId(cat.id);
    setShowCatModal(true);
  };

  const handleCatSubmit = async () => {
    try {
      if (catMode === 'create') {
        await fetch(`${API_URL}/content-management/benefits/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...catForm, sort_order: categories.length + 1 }),
        });
      } else {
        await fetch(`${API_URL}/content-management/benefits/categories/${editingCatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(catForm),
        });
      }
      setShowCatModal(false);
      await fetchData();
    } catch (err) {
      alert('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category and all its plans?')) return;
    try {
      await fetch(`${API_URL}/content-management/benefits/categories/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchData();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  // Plan handlers
  const openCreatePlan = (categoryId: number) => {
    setPlanMode('create');
    setPlanForm({ name: '', type: '', description: '', coverage_details: '', employee_cost: '', employer_contribution: '', enrollment_info: '', category_id: categoryId });
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: Plan, categoryId: number) => {
    setPlanMode('edit');
    setPlanForm({
      name: plan.name, type: plan.type, description: plan.description,
      coverage_details: plan.coverage_details, employee_cost: plan.employee_cost,
      employer_contribution: plan.employer_contribution, enrollment_info: plan.enrollment_info,
      category_id: categoryId,
    });
    setEditingPlanId(plan.id);
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async () => {
    try {
      if (planMode === 'create') {
        await fetch(`${API_URL}/content-management/benefits/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(planForm),
        });
      } else {
        const { category_id, ...updateData } = planForm;
        await fetch(`${API_URL}/content-management/benefits/plans/${editingPlanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });
      }
      setShowPlanModal(false);
      await fetchData();
    } catch (err) {
      alert('Failed to save plan');
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await fetch(`${API_URL}/content-management/benefits/plans/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchData();
    } catch (err) {
      alert('Failed to delete plan');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Config card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Enrollment & Contact Settings</h3>
          </div>
          {!editingConfig && (
            <button onClick={() => setEditingConfig(true)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
          )}
        </div>
        {editingConfig ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={configForm.enrollment_open} onChange={e => setConfigForm({ ...configForm, enrollment_open: e.target.checked })} className="rounded" />
                Open Enrollment Active
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input type="date" value={configForm.start_date || ''} onChange={e => setConfigForm({ ...configForm, start_date: e.target.value || null })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input type="date" value={configForm.end_date || ''} onChange={e => setConfigForm({ ...configForm, end_date: e.target.value || null })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email</label>
                <input type="email" value={configForm.contact_email} onChange={e => setConfigForm({ ...configForm, contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Phone</label>
                <input type="text" value={configForm.contact_phone} onChange={e => setConfigForm({ ...configForm, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setEditingConfig(false); setConfigForm(config); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleSaveConfig} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Enrollment</span>
              <p className={`font-medium ${config.enrollment_open ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>
                {config.enrollment_open ? 'Open' : 'Closed'}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Period</span>
              <p className="text-gray-700 dark:text-gray-300">{config.start_date && config.end_date ? `${config.start_date} - ${config.end_date}` : 'Not set'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <p className="text-gray-700 dark:text-gray-300">{config.contact_email || 'Not set'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Phone</span>
              <p className="text-gray-700 dark:text-gray-300">{config.contact_phone || 'Not set'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Benefit Categories</h3>
        <button onClick={openCreateCategory} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No benefit categories yet.</p>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center p-4 cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                {expanded.has(cat.id) ? <ChevronDown className="w-5 h-5 text-gray-400 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-400 mr-2" />}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{cat.name}</h4>
                  <p className="text-sm text-gray-500">{cat.description} &middot; {cat.plans.length} plan(s)</p>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openCreatePlan(cat.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Add Plan">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditCategory(cat)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit Category">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Delete Category">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expanded.has(cat.id) && cat.plans.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Plan Name</th>
                        <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                        <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Employee Cost</th>
                        <th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.plans.map(plan => (
                        <tr key={plan.id} className="border-t border-gray-100 dark:border-gray-700/50">
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{plan.name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{plan.type}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{plan.employee_cost}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => openEditPlan(plan, cat.id)} className="p-1 text-gray-500 hover:text-yellow-600" title="Edit Plan">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeletePlan(plan.id)} className="p-1 text-gray-500 hover:text-red-600 ml-1" title="Delete Plan">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {catMode === 'create' ? 'Add' : 'Edit'} Category
            </h3>
            <div className="space-y-3">
              <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Category name" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" autoFocus />
              <input type="text" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <select value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="heart">Heart</option>
                <option value="piggybank">Piggy Bank</option>
                <option value="umbrella">Umbrella</option>
                <option value="shield">Shield</option>
                <option value="star">Star</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleCatSubmit} disabled={!catForm.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{catMode === 'create' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {planMode === 'create' ? 'Add' : 'Edit'} Plan
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Name</label>
                <input type="text" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <input type="text" value={planForm.type} onChange={e => setPlanForm({ ...planForm, type: e.target.value })} placeholder="e.g., Medical, Dental, Retirement" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coverage Details</label>
                <textarea value={planForm.coverage_details} onChange={e => setPlanForm({ ...planForm, coverage_details: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee Cost</label>
                <input type="text" value={planForm.employee_cost} onChange={e => setPlanForm({ ...planForm, employee_cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employer Contribution</label>
                <input type="text" value={planForm.employer_contribution} onChange={e => setPlanForm({ ...planForm, employer_contribution: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enrollment Info</label>
                <textarea value={planForm.enrollment_info} onChange={e => setPlanForm({ ...planForm, enrollment_info: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handlePlanSubmit} disabled={!planForm.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{planMode === 'create' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
