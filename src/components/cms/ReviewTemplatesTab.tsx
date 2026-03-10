import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Copy, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { API_URL } from '@/config/api';

interface Competency {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

interface TextField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  min_length: number;
}

interface RatingScale {
  min: number;
  max: number;
  labels: Record<string, string>;
}

interface ReviewTemplate {
  id: number;
  name: string;
  template_type: string;
  description: string | null;
  competencies: Competency[];
  questions: string[];
  rating_scale: RatingScale;
  text_fields: TextField[];
  is_active: boolean;
  is_default: boolean;
  include_self_review: boolean;
  include_goal_setting: boolean;
  include_development_plan: boolean;
  created_at: string | null;
  updated_at: string | null;
}

const TEMPLATE_TYPES = ['Annual', 'Quarterly', 'Probationary', '360'];

const DEFAULT_RATING_SCALE: RatingScale = {
  min: 1,
  max: 5,
  labels: { '1': 'Needs Improvement', '2': 'Below Expectations', '3': 'Meets Expectations', '4': 'Exceeds Expectations', '5': 'Outstanding' },
};

const EMPTY_COMPETENCY: Competency = { key: '', label: '', description: '', required: true };
const EMPTY_TEXT_FIELD: TextField = { key: '', label: '', placeholder: '', required: false, min_length: 0 };

export default function ReviewTemplatesTab() {
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'scale' | 'competencies' | 'textfields'>('basic');

  // Form state
  const [form, setForm] = useState({
    name: '',
    template_type: 'Annual',
    description: '',
    is_active: true,
    is_default: false,
    include_self_review: true,
    include_goal_setting: true,
    include_development_plan: true,
  });
  const [ratingScale, setRatingScale] = useState<RatingScale>({ ...DEFAULT_RATING_SCALE });
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [textFields, setTextFields] = useState<TextField[]>([]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/content-management/review-templates`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      setTemplates(await res.json());
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const filtered = templates.filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || t.template_type === filterType;
    return matchesSearch && matchesType;
  });

  const openCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setForm({ name: '', template_type: 'Annual', description: '', is_active: true, is_default: false, include_self_review: true, include_goal_setting: true, include_development_plan: true });
    setRatingScale({ ...DEFAULT_RATING_SCALE });
    setCompetencies([]);
    setTextFields([]);
    setActiveSection('basic');
    setShowModal(true);
  };

  const openEdit = (t: ReviewTemplate) => {
    setModalMode('edit');
    setEditingId(t.id);
    setForm({
      name: t.name, template_type: t.template_type, description: t.description || '',
      is_active: t.is_active, is_default: t.is_default,
      include_self_review: t.include_self_review, include_goal_setting: t.include_goal_setting,
      include_development_plan: t.include_development_plan,
    });
    setRatingScale(t.rating_scale || { ...DEFAULT_RATING_SCALE });
    setCompetencies(t.competencies || []);
    setTextFields(t.text_fields || []);
    setActiveSection('basic');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const body = {
      ...form,
      competencies,
      text_fields: textFields,
      rating_scale: ratingScale,
    };
    try {
      if (modalMode === 'create') {
        await fetch(`${API_URL}/content-management/review-templates`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`${API_URL}/content-management/review-templates/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(body),
        });
      }
      setShowModal(false);
      await fetchTemplates();
    } catch {
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`${API_URL}/content-management/review-templates/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || 'Failed to delete');
        return;
      }
      await fetchTemplates();
    } catch {
      alert('Failed to delete template');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await fetch(`${API_URL}/content-management/review-templates/${id}/duplicate`, { method: 'POST', credentials: 'include' });
      await fetchTemplates();
    } catch {
      alert('Failed to duplicate template');
    }
  };

  // Competency helpers
  const addCompetency = () => {
    const key = `comp_${Date.now()}`;
    setCompetencies([...competencies, { ...EMPTY_COMPETENCY, key }]);
  };
  const updateCompetency = (idx: number, field: keyof Competency, value: string | boolean) => {
    const updated = [...competencies];
    (updated[idx] as any)[field] = value;
    if (field === 'label') updated[idx].key = (value as string).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setCompetencies(updated);
  };
  const removeCompetency = (idx: number) => setCompetencies(competencies.filter((_, i) => i !== idx));
  const moveCompetency = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= competencies.length) return;
    const updated = [...competencies];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setCompetencies(updated);
  };

  // Text field helpers
  const addTextField = () => {
    const key = `field_${Date.now()}`;
    setTextFields([...textFields, { ...EMPTY_TEXT_FIELD, key }]);
  };
  const updateTextField = (idx: number, field: keyof TextField, value: string | boolean | number) => {
    const updated = [...textFields];
    (updated[idx] as any)[field] = value;
    if (field === 'label') updated[idx].key = (value as string).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setTextFields(updated);
  };
  const removeTextField = (idx: number) => setTextFields(textFields.filter((_, i) => i !== idx));
  const moveTextField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= textFields.length) return;
    const updated = [...textFields];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setTextFields(updated);
  };

  // Rating scale helpers
  const updateScaleLabel = (key: string, label: string) => {
    setRatingScale({ ...ratingScale, labels: { ...ratingScale.labels, [key]: label } });
  };

  const handleScaleChange = (field: 'min' | 'max', value: number) => {
    const newScale = { ...ratingScale, [field]: value };
    // Rebuild labels for new range
    const labels: Record<string, string> = {};
    for (let i = newScale.min; i <= newScale.max; i++) {
      labels[String(i)] = ratingScale.labels[String(i)] || '';
    }
    setRatingScale({ ...newScale, labels });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">All Types</option>
            {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Add Template
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-28">Type</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-24">Ratings</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-24">Fields</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-20">Status</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">No templates found</td></tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="text-gray-900 dark:text-white font-medium">{t.name}</div>
                    {t.is_default && <span className="text-xs text-blue-600 dark:text-blue-400">Default</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{t.template_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.competencies.length}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.text_fields.length}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${t.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-gray-500 hover:text-yellow-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDuplicate(t.id)} className="p-1.5 text-gray-500 hover:text-blue-600 ml-1" title="Duplicate"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-500 hover:text-red-600 ml-1" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Create' : 'Edit'} Review Template
              </h3>
            </div>

            {/* Section tabs */}
            <div className="px-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="flex gap-1">
                {([
                  { key: 'basic', label: 'Basic Info' },
                  { key: 'scale', label: 'Rating Scale' },
                  { key: 'competencies', label: `Competencies (${competencies.length})` },
                  { key: 'textfields', label: `Text Fields (${textFields.length})` },
                ] as const).map(({ key, label }) => (
                  <button key={key} onClick={() => setActiveSection(key)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeSection === key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  >{label}</button>
                ))}
              </nav>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Basic Info */}
              {activeSection === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Performance Review" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                      <select value={form.template_type} onChange={e => setForm({ ...form, template_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" /> Active
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded" /> Default
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe when this template should be used..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Sections</p>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input type="checkbox" checked={form.include_self_review} onChange={e => setForm({ ...form, include_self_review: e.target.checked })} className="rounded" /> Self-Review
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input type="checkbox" checked={form.include_goal_setting} onChange={e => setForm({ ...form, include_goal_setting: e.target.checked })} className="rounded" /> Goal Setting
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input type="checkbox" checked={form.include_development_plan} onChange={e => setForm({ ...form, include_development_plan: e.target.checked })} className="rounded" /> Development Plan
                    </label>
                  </div>
                </div>
              )}

              {/* Rating Scale */}
              {activeSection === 'scale' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Value</label>
                      <input type="number" value={ratingScale.min} onChange={e => handleScaleChange('min', parseInt(e.target.value) || 1)} min={1} max={ratingScale.max - 1} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Value</label>
                      <input type="number" value={ratingScale.max} onChange={e => handleScaleChange('max', parseInt(e.target.value) || 5)} min={ratingScale.min + 1} max={10} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scale Labels</p>
                    {Array.from({ length: ratingScale.max - ratingScale.min + 1 }, (_, i) => ratingScale.min + i).map(val => (
                      <div key={val} className="flex items-center gap-3">
                        <span className="w-8 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{val}</span>
                        <input type="text" value={ratingScale.labels[String(val)] || ''} onChange={e => updateScaleLabel(String(val), e.target.value)} placeholder={`Label for ${val}`} className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competencies */}
              {activeSection === 'competencies' && (
                <div className="space-y-3">
                  {competencies.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No competencies defined yet. Add one below.</p>
                  )}
                  {competencies.map((comp, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input type="text" value={comp.label} onChange={e => updateCompetency(idx, 'label', e.target.value)} placeholder="Competency name" className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <input type="checkbox" checked={comp.required} onChange={e => updateCompetency(idx, 'required', e.target.checked)} className="rounded" /> Required
                        </label>
                        <button onClick={() => moveCompetency(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveCompetency(idx, 1)} disabled={idx === competencies.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                        <button onClick={() => removeCompetency(idx)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <input type="text" value={comp.description} onChange={e => updateCompetency(idx, 'description', e.target.value)} placeholder="Description (shown as tooltip)" className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      <p className="text-xs text-gray-400">Key: {comp.key || '(auto-generated from name)'}</p>
                    </div>
                  ))}
                  <button onClick={addCompetency} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-600 text-sm w-full justify-center">
                    <Plus className="w-4 h-4" /> Add Competency
                  </button>
                </div>
              )}

              {/* Text Fields */}
              {activeSection === 'textfields' && (
                <div className="space-y-3">
                  {textFields.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No text fields defined yet. Add one below.</p>
                  )}
                  {textFields.map((field, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input type="text" value={field.label} onChange={e => updateTextField(idx, 'label', e.target.value)} placeholder="Field label" className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <input type="checkbox" checked={field.required} onChange={e => updateTextField(idx, 'required', e.target.checked)} className="rounded" /> Required
                        </label>
                        <button onClick={() => moveTextField(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveTextField(idx, 1)} disabled={idx === textFields.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                        <button onClick={() => removeTextField(idx)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={field.placeholder} onChange={e => updateTextField(idx, 'placeholder', e.target.value)} placeholder="Placeholder text" className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 whitespace-nowrap">Min length:</label>
                          <input type="number" value={field.min_length} onChange={e => updateTextField(idx, 'min_length', parseInt(e.target.value) || 0)} min={0} className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Key: {field.key || '(auto-generated from label)'}</p>
                    </div>
                  ))}
                  <button onClick={addTextField} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-600 text-sm w-full justify-center">
                    <Plus className="w-4 h-4" /> Add Text Field
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {modalMode === 'create' ? 'Create Template' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
