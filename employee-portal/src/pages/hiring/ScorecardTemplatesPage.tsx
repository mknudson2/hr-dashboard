import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ClipboardList, ArrowLeft } from 'lucide-react';

interface CriterionDef {
  name: string;
  description?: string;
  weight: number;
  rubric?: Record<string, string>;
}

interface SectionDef {
  name: string;
  weight: number;
  criteria: CriterionDef[];
}

interface TemplateItem {
  id: number;
  template_id: string;
  name: string;
  description?: string;
  template_type: string;
  sections: SectionDef[];
  recommendation_options: string[];
  red_flags?: string[];
  suggested_questions?: string[];
  is_active: boolean;
  created_at: string;
  is_editable: boolean;
}

const TYPE_BADGES: Record<string, string> = {
  hr: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  hm: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  tech_screen: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const TYPE_LABELS: Record<string, string> = {
  hr: 'HR Interview',
  hm: 'HM Interview',
  tech_screen: 'Tech Screen',
};

export default function ScorecardTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Editor state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [recommendationOptions, setRecommendationOptions] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setError(null);
      const data = await apiGet<TemplateItem[]>('/portal/hiring-manager/scorecard-templates');
      setTemplates(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setSections([{ name: 'General', weight: 1.0, criteria: [{ name: '', weight: 1.0 }] }]);
    setRecommendationOptions(['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire']);
    setRedFlags([]);
    setSuggestedQuestions([]);
    setShowEditor(true);
  };

  const openEdit = (t: TemplateItem) => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description || '');
    setSections(
      t.sections.length > 0
        ? t.sections
        : [{ name: 'General', weight: 1.0, criteria: [{ name: '', weight: 1.0 }] }]
    );
    setRecommendationOptions(
      t.recommendation_options.length > 0
        ? t.recommendation_options
        : ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire']
    );
    setRedFlags(t.red_flags || []);
    setSuggestedQuestions(t.suggested_questions || []);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      sections: sections.filter(s => s.criteria.some(c => c.name.trim())),
      recommendation_options: recommendationOptions.filter(o => o.trim()),
      red_flags: redFlags.filter(f => f.trim()),
      suggested_questions: suggestedQuestions.filter(q => q.trim()),
    };

    try {
      if (editingId) {
        await apiPut(`/portal/hiring-manager/scorecard-templates/${editingId}`, body);
      } else {
        await apiPost('/portal/hiring-manager/scorecard-templates', body);
      }
      setShowEditor(false);
      await loadTemplates();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this template?')) return;
    try {
      await apiDelete(`/portal/hiring-manager/scorecard-templates/${id}`);
      await loadTemplates();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Section / Criterion editors
  const addSection = () => {
    setSections(prev => [...prev, { name: '', weight: 0.25, criteria: [{ name: '', weight: 1.0 }] }]);
  };

  const updateSection = (idx: number, updates: Partial<SectionDef>) => {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)));
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx));
  };

  const addCriterion = (sectionIdx: number) => {
    setSections(prev =>
      prev.map((s, i) =>
        i === sectionIdx ? { ...s, criteria: [...s.criteria, { name: '', weight: 1.0 }] } : s
      )
    );
  };

  const updateCriterion = (sectionIdx: number, critIdx: number, updates: Partial<CriterionDef>) => {
    setSections(prev =>
      prev.map((s, si) =>
        si === sectionIdx
          ? {
              ...s,
              criteria: s.criteria.map((c, ci) => (ci === critIdx ? { ...c, ...updates } : c)),
            }
          : s
      )
    );
  };

  const removeCriterion = (sectionIdx: number, critIdx: number) => {
    setSections(prev =>
      prev.map((s, si) =>
        si === sectionIdx ? { ...s, criteria: s.criteria.filter((_, ci) => ci !== critIdx) } : s
      )
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/hiring/my-requisitions')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Hiring
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Scorecard Templates
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage interview evaluation templates for your requisitions
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Template List */}
      <div className="space-y-3">
        {templates.map(t => (
          <div
            key={t.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
              onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
            >
              <ClipboardList className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_BADGES[t.template_type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                  >
                    {TYPE_LABELS[t.template_type] || t.template_type}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{t.template_id}</span>
                </div>
                {t.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {t.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  {t.sections.length} section{t.sections.length !== 1 ? 's' : ''} &middot;{' '}
                  {t.sections.reduce((n, s) => n + s.criteria.length, 0)} criteria
                </span>
                {!t.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    Inactive
                  </span>
                )}
                {expandedId === t.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {expandedId === t.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
                {/* Template type (read-only display) */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Type:{' '}
                  <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${TYPE_BADGES[t.template_type] || 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABELS[t.template_type] || t.template_type}
                  </span>
                </div>

                {/* Sections */}
                {t.sections.map((section, si) => (
                  <div key={si}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {section.name}{' '}
                      <span className="text-xs text-gray-400">
                        ({Math.round(section.weight * 100)}%)
                      </span>
                    </p>
                    <ul className="ml-4 mt-1 space-y-0.5">
                      {section.criteria.map((c, ci) => (
                        <li key={ci} className="text-xs text-gray-500 dark:text-gray-400">
                          &bull; {c.name}{' '}
                          <span className="text-gray-400">
                            ({Math.round(c.weight * 100)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Recommendation Options */}
                {t.recommendation_options && t.recommendation_options.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recommendation Options
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {t.recommendation_options.map((opt, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red Flags */}
                {t.red_flags && t.red_flags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Red Flags</p>
                    <ul className="ml-4 mt-1 space-y-0.5">
                      {t.red_flags.map((f, i) => (
                        <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                          &bull; {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Questions */}
                {t.suggested_questions && t.suggested_questions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suggested Questions
                    </p>
                    <ul className="ml-4 mt-1 space-y-0.5">
                      {t.suggested_questions.map((q, i) => (
                        <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                          &bull; {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons: only show for editable templates */}
                {t.is_editable && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Deactivate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No Scorecard Templates Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create a template to standardize your interview evaluations.
            </p>
            <button
              onClick={openCreate}
              className="text-blue-600 hover:underline text-sm"
            >
              Create your first template
            </button>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingId ? 'Edit Template' : 'New Scorecard Template'}
            </h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Engineering Manager Interview"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type indicator (read-only for edit, hidden for create since forced to hm) */}
            {editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  HM Interview (Hiring Manager templates)
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of when this template should be used"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Sections</h3>
                <button
                  onClick={addSection}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Section
                </button>
              </div>

              {sections.map((section, si) => (
                <div
                  key={si}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex gap-3">
                    <input
                      value={section.name}
                      onChange={e => updateSection(si, { name: e.target.value })}
                      placeholder="Section name"
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">Weight:</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={section.weight}
                        onChange={e =>
                          updateSection(si, { weight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {sections.length > 1 && (
                      <button
                        onClick={() => removeSection(si)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Criteria in section */}
                  <div className="ml-4 space-y-2">
                    {section.criteria.map((c, ci) => (
                      <div key={ci} className="flex gap-2 items-center">
                        <input
                          value={c.name}
                          onChange={e => updateCriterion(si, ci, { name: e.target.value })}
                          placeholder="Criterion name"
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-400">Wt:</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            value={c.weight}
                            onChange={e =>
                              updateCriterion(si, ci, {
                                weight: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-14 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs dark:bg-gray-700 dark:text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        {section.criteria.length > 1 && (
                          <button
                            onClick={() => removeCriterion(si, ci)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addCriterion(si)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Criterion
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendation Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Recommendation Options
                </h3>
                <button
                  onClick={() => setRecommendationOptions(prev => [...prev, ''])}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {recommendationOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={opt}
                    onChange={e =>
                      setRecommendationOptions(prev =>
                        prev.map((o, oi) => (oi === i ? e.target.value : o))
                      )
                    }
                    placeholder="e.g., Strong Hire"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {recommendationOptions.length > 1 && (
                    <button
                      onClick={() =>
                        setRecommendationOptions(prev => prev.filter((_, oi) => oi !== i))
                      }
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Red Flags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Red Flags</h3>
                <button
                  onClick={() => setRedFlags(prev => [...prev, ''])}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {redFlags.map((flag, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={flag}
                    onChange={e =>
                      setRedFlags(prev => prev.map((f, fi) => (fi === i ? e.target.value : f)))
                    }
                    placeholder="Red flag description"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setRedFlags(prev => prev.filter((_, fi) => fi !== i))}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Suggested Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Suggested Questions
                </h3>
                <button
                  onClick={() => setSuggestedQuestions(prev => [...prev, ''])}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {suggestedQuestions.map((q, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={q}
                    onChange={e =>
                      setSuggestedQuestions(prev =>
                        prev.map((sq, qi) => (qi === i ? e.target.value : sq))
                      )
                    }
                    placeholder="Interview question"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() =>
                      setSuggestedQuestions(prev => prev.filter((_, qi) => qi !== i))
                    }
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
