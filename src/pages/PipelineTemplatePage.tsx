import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, GripVertical, Edit2, Check, X, Star, ChevronLeft } from 'lucide-react';

const BASE_URL = '';

interface PipelineStage {
  id?: number;
  name: string;
  stage_type: string;
  order_index: number;
  is_required: boolean;
  auto_advance: boolean;
  scorecard_template: Record<string, unknown> | null;
  days_sla: number | null;
}

interface PipelineTemplate {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  stage_count: number;
  stages: PipelineStage[];
  created_at: string | null;
}

const STAGE_TYPES = [
  { value: 'application_review', label: 'Application Review' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'reference_check', label: 'Reference Check' },
  { value: 'offer', label: 'Offer' },
  { value: 'custom', label: 'Custom' },
];

export default function PipelineTemplatePage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Create/Edit form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDefault, setFormDefault] = useState(false);
  const [formStages, setFormStages] = useState<PipelineStage[]>([]);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/pipeline-templates`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedDefault = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/pipeline-templates/seed-default`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) loadTemplates();
    } catch (error) {
      console.error('Seed failed:', error);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormDefault(false);
    setFormStages([]);
    setShowCreate(false);
    setEditingId(null);
  };

  const startEdit = (t: PipelineTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormDesc(t.description || '');
    setFormDefault(t.is_default);
    setFormStages(t.stages.map(s => ({ ...s })));
    setShowCreate(false);
  };

  const addStage = () => {
    setFormStages([
      ...formStages,
      {
        name: '',
        stage_type: 'custom',
        order_index: formStages.length + 1,
        is_required: true,
        auto_advance: false,
        scorecard_template: null,
        days_sla: null,
      },
    ]);
  };

  const removeStage = (index: number) => {
    const updated = formStages.filter((_, i) => i !== index);
    setFormStages(updated.map((s, i) => ({ ...s, order_index: i + 1 })));
  };

  const updateStage = (index: number, field: string, value: unknown) => {
    const updated = [...formStages];
    (updated[index] as Record<string, unknown>)[field] = value;
    setFormStages(updated);
  };

  const saveTemplate = async () => {
    const body = {
      name: formName,
      description: formDesc || null,
      is_default: formDefault,
      stages: formStages,
    };

    try {
      const url = editingId
        ? `${BASE_URL}/recruiting/pipeline-templates/${editingId}`
        : `${BASE_URL}/recruiting/pipeline-templates`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetForm();
        loadTemplates();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('Delete this pipeline template?')) return;
    try {
      const res = await fetch(`${BASE_URL}/recruiting/pipeline-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) loadTemplates();
      else {
        const data = await res.json();
        alert(data.detail || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const isEditing = editingId !== null || showCreate;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/recruiting')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Recruiting
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure hiring pipeline stages and scorecards</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <button
              onClick={seedDefault}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Seed Default Pipeline
            </button>
          )}
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingId ? 'Edit Template' : 'Create Pipeline Template'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Standard Hiring Pipeline"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input
                type="text"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={formDefault}
              onChange={e => setFormDefault(e.target.checked)}
              className="rounded"
            />
            Set as default pipeline
          </label>

          {/* Stages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-gray-900 dark:text-white">Stages</h3>
              <button onClick={addStage} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Stage
              </button>
            </div>

            {formStages.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                No stages yet. Click "Add Stage" to create your pipeline.
              </p>
            )}

            <div className="space-y-2">
              {formStages.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-400 dark:text-gray-500 w-6">{stage.order_index}.</span>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={e => updateStage(idx, 'name', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="Stage name"
                  />
                  <select
                    value={stage.stage_type}
                    onChange={e => updateStage(idx, 'stage_type', e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-white"
                  >
                    {STAGE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={stage.days_sla || ''}
                    onChange={e => updateStage(idx, 'days_sla', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="SLA"
                    title="Days SLA"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={stage.is_required}
                      onChange={e => updateStage(idx, 'is_required', e.target.checked)}
                      className="rounded"
                    />
                    Req
                  </label>
                  <button
                    onClick={() => removeStage(idx)}
                    className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={saveTemplate}
              disabled={!formName || formStages.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Save Changes' : 'Create Template'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="space-y-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                  {t.is_default && (
                    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" /> Default
                    </span>
                  )}
                  {!t.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                {t.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.description}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(t)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stage visualization */}
            <div className="flex items-center gap-1 overflow-x-auto py-2">
              {t.stages.map((stage, idx) => (
                <div key={stage.id || idx} className="flex items-center">
                  {idx > 0 && <div className="w-4 h-0.5 bg-gray-300 dark:bg-gray-600" />}
                  <div className="flex-shrink-0 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300">
                    {stage.name}
                    {stage.days_sla && <span className="text-blue-400 dark:text-blue-500 ml-1">({stage.days_sla}d)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {templates.length === 0 && !isEditing && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No pipeline templates yet.</p>
            <button
              onClick={seedDefault}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Seed the default Standard Hiring Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
