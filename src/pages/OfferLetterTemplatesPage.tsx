import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Search, Copy, Trash2, Eye, FileDown, Save } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from '@/utils/api';
import TipTapEditor from '@/components/email-templates/TipTapEditor';

interface FillablePlaceholder {
  key: string;
  label: string;
  type: string;
  required: boolean;
  default_value: string | null;
  description: string | null;
  options: string[] | null;
}

interface OfferLetterTemplate {
  id: number;
  template_id: string;
  name: string;
  description: string | null;
  html_content: string;
  predefined_placeholders: string[];
  fillable_placeholders: FillablePlaceholder[];
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  last_modified_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const emptyFillable: FillablePlaceholder = {
  key: '',
  label: '',
  type: 'text',
  required: true,
  default_value: null,
  description: null,
  options: null,
};

export default function OfferLetterTemplatesPage() {
  const navigate = useNavigate();

  // Template list state
  const [templates, setTemplates] = useState<OfferLetterTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Editor state
  const [selectedTemplate, setSelectedTemplate] = useState<OfferLetterTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [fillablePlaceholders, setFillablePlaceholders] = useState<FillablePlaceholder[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'fillable'>('editor');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await apiGet<OfferLetterTemplate[]>('/recruiting/offer-letter-templates/');
      setTemplates(data);
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setSelectedTemplate(null);
    setIsCreating(true);
    setName('');
    setDescription('');
    setHtmlContent('');
    setFillablePlaceholders([]);
    setPreviewHtml('');
    setShowPreview(false);
    setError('');
    setSuccess('');
    setActiveTab('editor');
  }

  function selectTemplate(t: OfferLetterTemplate) {
    setSelectedTemplate(t);
    setIsCreating(false);
    setName(t.name);
    setDescription(t.description || '');
    setHtmlContent(t.html_content);
    setFillablePlaceholders(t.fillable_placeholders || []);
    setPreviewHtml('');
    setShowPreview(false);
    setError('');
    setSuccess('');
    setActiveTab('editor');
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        html_content: htmlContent,
        fillable_placeholders: fillablePlaceholders.filter(fp => fp.key.trim()),
      };

      if (isCreating) {
        const created = await apiPost<OfferLetterTemplate>('/recruiting/offer-letter-templates/', payload);
        setSelectedTemplate(created);
        setIsCreating(false);
        setSuccess('Template created');
      } else if (selectedTemplate) {
        const updated = await apiPut<OfferLetterTemplate>(
          `/recruiting/offer-letter-templates/${selectedTemplate.id}`,
          payload,
        );
        setSelectedTemplate(updated);
        setSuccess('Template saved');
      }
      await loadTemplates();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTemplate) return;
    if (!confirm(`Deactivate template "${selectedTemplate.name}"?`)) return;
    try {
      await apiDelete(`/recruiting/offer-letter-templates/${selectedTemplate.id}`);
      setSelectedTemplate(null);
      setSuccess('Template deactivated');
      await loadTemplates();
    } catch {
      setError('Failed to delete template');
    }
  }

  async function handleDuplicate() {
    if (!selectedTemplate) return;
    try {
      const copy = await apiPost<OfferLetterTemplate>(
        `/recruiting/offer-letter-templates/${selectedTemplate.id}/duplicate`,
        {},
      );
      await loadTemplates();
      selectTemplate(copy);
      setSuccess('Template duplicated');
    } catch {
      setError('Failed to duplicate template');
    }
  }

  async function handlePreview() {
    const templateId = selectedTemplate?.id;
    if (!templateId && !isCreating) return;

    // For existing templates, use the render endpoint
    if (templateId) {
      try {
        const result = await apiPost<{ html_content: string; missing_placeholders: string[] }>(
          '/recruiting/offer-letter-templates/render',
          { template_id: templateId, custom_values: {} },
        );
        setPreviewHtml(result.html_content);
        setShowPreview(true);
      } catch {
        setError('Failed to render preview');
      }
    } else {
      // For new unsaved templates, just show the raw content
      setPreviewHtml(htmlContent);
      setShowPreview(true);
    }
  }

  async function handlePreviewPdf() {
    if (!selectedTemplate) return;
    try {
      const response = await apiFetch('/recruiting/offer-letter-templates/render-pdf', {
        method: 'POST',
        body: JSON.stringify({ template_id: selectedTemplate.id, custom_values: {} }),
        headers: { 'Content-Type': 'application/json' },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setError('Failed to generate PDF preview');
    }
  }

  // Fillable placeholder management
  function addFillable() {
    setFillablePlaceholders(prev => [...prev, { ...emptyFillable }]);
  }

  function updateFillable(index: number, field: keyof FillablePlaceholder, value: unknown) {
    setFillablePlaceholders(prev => prev.map((fp, i) => i === index ? { ...fp, [field]: value } : fp));
  }

  function removeFillable(index: number) {
    setFillablePlaceholders(prev => prev.filter((_, i) => i !== index));
  }

  const filteredTemplates = templates.filter(
    t => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/recruiting')}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offer Letter Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage offer letter templates with dynamic placeholders
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="flex gap-6">
        {/* Template List Sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={startCreate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Template
              </button>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No templates found</div>
              ) : (
                filteredTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                      selectedTemplate?.id === t.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.template_id}
                      {t.is_default && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 min-w-0">
          {!selectedTemplate && !isCreating ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Select a template from the list or create a new one
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              {/* Template Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isCreating ? 'New Template' : `Edit: ${selectedTemplate?.template_id}`}
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedTemplate && (
                      <>
                        <button
                          onClick={handleDuplicate}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleDelete}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Standard Offer Letter"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief description of this template"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'editor'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Template Content
                  </button>
                  <button
                    onClick={() => setActiveTab('fillable')}
                    className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'fillable'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Fillable Fields ({fillablePlaceholders.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'editor' && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Use the "Insert Placeholder" dropdown to add dynamic fields. Offer placeholders
                      (e.g. {'{{offer.salary}}'}) auto-fill from the offer. Custom placeholders are filled manually when sending.
                    </p>
                    <TipTapEditor
                      content={htmlContent}
                      onChange={setHtmlContent}
                      customPlaceholders={fillablePlaceholders
                        .filter(fp => fp.key.trim())
                        .map(fp => ({ key: fp.key, label: fp.label || fp.key }))}
                      placeholder="Write your offer letter template content here..."
                      showOfferPlaceholders
                    />
                  </div>
                )}

                {activeTab === 'fillable' && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Define custom fields that will be filled in each time this template is used.
                      Use {'{{custom.<key>}}'} in the template content to reference these fields.
                    </p>
                    {fillablePlaceholders.map((fp, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Key *
                            </label>
                            <input
                              type="text"
                              value={fp.key}
                              onChange={e => updateFillable(index, 'key', e.target.value)}
                              placeholder="e.g. vacation_days"
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Label *
                            </label>
                            <input
                              type="text"
                              value={fp.label}
                              onChange={e => updateFillable(index, 'label', e.target.value)}
                              placeholder="e.g. Vacation Days"
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Default Value
                            </label>
                            <input
                              type="text"
                              value={fp.default_value || ''}
                              onChange={e => updateFillable(index, 'default_value', e.target.value || null)}
                              placeholder="Optional"
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeFillable(index)}
                          className="mt-5 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addFillable}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Custom Field
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : isCreating ? 'Create Template' : 'Save Changes'}
                </button>
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview HTML
                </button>
                {selectedTemplate && (
                  <button
                    onClick={handlePreviewPdf}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Preview PDF
                  </button>
                )}
              </div>

              {/* Preview Panel */}
              {showPreview && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rendered Preview
                    </h3>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Close Preview
                    </button>
                  </div>
                  <div
                    className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
