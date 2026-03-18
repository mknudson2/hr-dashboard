import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, CheckCircle, Archive, FileText, X, Pencil, ChevronRight, Save, Briefcase } from 'lucide-react';

interface JobDescription {
  id: number;
  position_title: string;
  description: string | null;
  requirements: string | null;
  preferred_qualifications: string | null;
  responsibilities: string | null;
  skills_tags: string[] | null;
  company_position: string | null;
  status: string;
  file_upload_id: number | null;
  created_by: number | null;
  approved_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

type JDDetail = JobDescription;

const BASE_URL = '';

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function JobDescriptionsPage() {
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Detail/Edit panel
  const [selectedJD, setSelectedJD] = useState<JDDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    position_title: '',
    description: '',
    requirements: '',
    preferred_qualifications: '',
    responsibilities: '',
    skills_tags: '',
    company_position: '',
  });

  // Company positions
  const [companyPositions, setCompanyPositions] = useState<string[]>([]);
  const [showPositionSelector, setShowPositionSelector] = useState(false);
  const [positionSearch, setPositionSearch] = useState('');
  const [editPositionOpen, setEditPositionOpen] = useState(false);
  const [editPositionSearch, setEditPositionSearch] = useState('');
  const [createPositionOpen, setCreatePositionOpen] = useState(false);
  const [createPositionSearch, setCreatePositionSearch] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newPreferred, setNewPreferred] = useState('');
  const [newResponsibilities, setNewResponsibilities] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newCompanyPosition, setNewCompanyPosition] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchJDs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`${BASE_URL}/recruiting/job-descriptions?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setJds(data.job_descriptions);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchJDs(); }, [fetchJDs]);

  useEffect(() => {
    fetch(`${BASE_URL}/recruiting/company-positions`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { positions: [] })
      .then(data => setCompanyPositions(data.positions || []))
      .catch(() => {});
  }, []);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setEditing(false);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/job-descriptions/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data: JDDetail = await res.json();
        setSelectedJD(data);
        setEditForm({
          position_title: data.position_title || '',
          description: data.description || '',
          requirements: data.requirements || '',
          preferred_qualifications: data.preferred_qualifications || '',
          responsibilities: data.responsibilities || '',
          skills_tags: data.skills_tags?.join(', ') || '',
          company_position: data.company_position || '',
        });
      }
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedJD) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/job-descriptions/${selectedJD.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          position_title: editForm.position_title,
          description: editForm.description || null,
          requirements: editForm.requirements || null,
          preferred_qualifications: editForm.preferred_qualifications || null,
          responsibilities: editForm.responsibilities || null,
          skills_tags: editForm.skills_tags ? editForm.skills_tags.split(',').map(s => s.trim()).filter(Boolean) : null,
          company_position: editForm.company_position || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        await openDetail(selectedJD.id);
        fetchJDs();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/job-descriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          position_title: newTitle,
          description: newDescription || null,
          requirements: newRequirements || null,
          preferred_qualifications: newPreferred || null,
          responsibilities: newResponsibilities || null,
          skills_tags: newSkills ? newSkills.split(',').map(s => s.trim()).filter(Boolean) : null,
          company_position: newCompanyPosition || null,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle(''); setNewDescription(''); setNewRequirements('');
        setNewPreferred(''); setNewResponsibilities(''); setNewSkills('');
        setNewCompanyPosition('');
        fetchJDs();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('position_title', uploadTitle);
      formData.append('file', uploadFile);
      const res = await fetch(`${BASE_URL}/recruiting/job-descriptions/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        setShowUploadModal(false);
        setUploadTitle(''); setUploadFile(null);
        fetchJDs();
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch(`${BASE_URL}/recruiting/job-descriptions/${id}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });
      fetchJDs();
      if (selectedJD?.id === id) openDetail(id);
    } catch {
      // silent
    }
  };

  const handleArchive = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch(`${BASE_URL}/recruiting/job-descriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'Archived' }),
      });
      fetchJDs();
      if (selectedJD?.id === id) openDetail(id);
    } catch {
      // silent
    }
  };

  const handlePositionUpdate = async (position: string | null) => {
    if (!selectedJD) return;
    try {
      const res = await fetch(`${BASE_URL}/recruiting/job-descriptions/${selectedJD.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ company_position: position }),
      });
      if (res.ok) {
        setShowPositionSelector(false);
        await openDetail(selectedJD.id);
        fetchJDs();
      }
    } catch {
      // silent
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
  const modalOverlay = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
  const modalBox = 'bg-white dark:bg-gray-700 rounded-lg p-6 w-full shadow-2xl border border-gray-200 dark:border-gray-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Description Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{total} job descriptions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Upload className="w-4 h-4" /> Upload JD
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New JD
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by position title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending Approval">Pending Approval</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : jds.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No job descriptions found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 no-glass rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Position Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Skills</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Company Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jds.map(jd => (
                <tr
                  key={jd.id}
                  onClick={() => openDetail(jd.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedJD?.id === jd.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{jd.position_title}</div>
                        {jd.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{jd.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {jd.skills_tags && jd.skills_tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {jd.skills_tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            {tag}
                          </span>
                        ))}
                        {jd.skills_tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{jd.skills_tags.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {jd.company_position || <span className="text-gray-400">&mdash;</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[jd.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                      {jd.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                    {jd.created_at ? new Date(jd.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {jd.status === 'Pending Approval' && (
                        <button
                          onClick={(e) => handleApprove(jd.id, e)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded hover:bg-green-100 dark:hover:bg-green-900/50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {jd.status !== 'Archived' && (
                        <button
                          onClick={(e) => handleArchive(jd.id, e)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail / Edit Panel */}
      {(selectedJD || detailLoading) && (
        <div className="bg-white dark:bg-gray-800 no-glass rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {detailLoading ? (
            <div className="p-6 animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : selectedJD && (
            <>
              {/* Detail Header */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedJD.position_title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[selectedJD.status] || ''}`}>
                        {selectedJD.status}
                      </span>
                      {selectedJD.created_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Created {new Date(selectedJD.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editForm.position_title.trim() || saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedJD(null); setEditing(false); }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Detail Body */}
              <div className="p-5 space-y-5">
                {editing ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Position Title *</label>
                      <input
                        value={editForm.position_title}
                        onChange={e => setEditForm(f => ({ ...f, position_title: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className={inputClass}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Requirements</label>
                        <textarea
                          value={editForm.requirements}
                          onChange={e => setEditForm(f => ({ ...f, requirements: e.target.value }))}
                          className={inputClass}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Preferred Qualifications</label>
                        <textarea
                          value={editForm.preferred_qualifications}
                          onChange={e => setEditForm(f => ({ ...f, preferred_qualifications: e.target.value }))}
                          className={inputClass}
                          rows={4}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Responsibilities</label>
                      <textarea
                        value={editForm.responsibilities}
                        onChange={e => setEditForm(f => ({ ...f, responsibilities: e.target.value }))}
                        className={inputClass}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Skills (comma-separated)</label>
                      <input
                        value={editForm.skills_tags}
                        onChange={e => setEditForm(f => ({ ...f, skills_tags: e.target.value }))}
                        className={inputClass}
                        placeholder="React, Python, AWS"
                      />
                    </div>
                    <div className="relative">
                      <label className={labelClass}>Company Position</label>
                      <div
                        onClick={() => { setEditPositionOpen(!editPositionOpen); setEditPositionSearch(''); setHighlightedIdx(-1); }}
                        className={`${inputClass} cursor-pointer flex items-center justify-between`}
                      >
                        <span className={editForm.company_position ? '' : 'text-gray-400'}>{editForm.company_position || '— No position —'}</span>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${editPositionOpen ? 'rotate-90' : ''}`} />
                      </div>
                      {editPositionOpen && (() => {
                        const filtered = companyPositions.filter(pos => pos.toLowerCase().includes(editPositionSearch.toLowerCase()));
                        const totalOptions = filtered.length + 1;
                        return (
                        <div className="absolute z-10 mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                value={editPositionSearch}
                                onChange={e => { setEditPositionSearch(e.target.value); setHighlightedIdx(-1); }}
                                onKeyDown={e => {
                                  if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, totalOptions - 1)); }
                                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, -1)); }
                                  else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = highlightedIdx < 0 ? '' : (filtered[highlightedIdx] || '');
                                    setEditForm(f => ({ ...f, company_position: val }));
                                    setEditPositionOpen(false); setHighlightedIdx(-1);
                                  }
                                  else if (e.key === 'Escape') { setEditPositionOpen(false); setHighlightedIdx(-1); }
                                }}
                                placeholder="Search positions..."
                                autoFocus
                                onClick={e => e.stopPropagation()}
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            <button
                              onClick={() => { setEditForm(f => ({ ...f, company_position: '' })); setEditPositionOpen(false); setHighlightedIdx(-1); }}
                              className={`w-full text-left px-3 py-2 text-sm italic ${highlightedIdx === -1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                              — No position —
                            </button>
                            {filtered.map((pos, idx) => (
                                <button
                                  key={pos}
                                  onClick={() => { setEditForm(f => ({ ...f, company_position: pos })); setEditPositionOpen(false); setHighlightedIdx(-1); }}
                                  className={`w-full text-left px-3 py-2 text-sm ${
                                    idx === highlightedIdx
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                      : pos === editForm.company_position
                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300'
                                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {pos}
                                </button>
                              ))}
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* View Mode — 2-column grid */
                  <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 400px' }}>
                    {/* Left: Description info */}
                    <div className="space-y-4">
                      {selectedJD.description && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Description</h3>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedJD.description}</p>
                        </div>
                      )}
                      {selectedJD.requirements && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Requirements</h3>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedJD.requirements}</p>
                        </div>
                      )}
                      {selectedJD.preferred_qualifications && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Preferred Qualifications</h3>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedJD.preferred_qualifications}</p>
                        </div>
                      )}
                      {selectedJD.responsibilities && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Responsibilities</h3>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedJD.responsibilities}</p>
                        </div>
                      )}
                      {selectedJD.skills_tags && selectedJD.skills_tags.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Skills</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedJD.skills_tags.map((tag, i) => (
                              <span key={i} className="px-2.5 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!selectedJD.description && !selectedJD.requirements && !selectedJD.preferred_qualifications && !selectedJD.responsibilities && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No content added yet. Click Edit to add details.</p>
                      )}
                    </div>

                    {/* Right: Company Position */}
                    <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        Company Position
                      </h3>
                      {showPositionSelector ? (() => {
                        const filtered = companyPositions.filter(pos => pos.toLowerCase().includes(positionSearch.toLowerCase()));
                        // options: index -1 = "no position", 0..N = filtered positions
                        const totalOptions = filtered.length + 1;
                        return (
                        <div className="space-y-1 relative">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              type="text"
                              value={positionSearch}
                              onChange={e => { setPositionSearch(e.target.value); setHighlightedIdx(-1); }}
                              onKeyDown={e => {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, totalOptions - 1)); }
                                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, -1)); }
                                else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (highlightedIdx < 0) { handlePositionUpdate(null); } else if (filtered[highlightedIdx]) { handlePositionUpdate(filtered[highlightedIdx]); }
                                  setPositionSearch(''); setHighlightedIdx(-1);
                                }
                                else if (e.key === 'Escape') { setShowPositionSelector(false); setPositionSearch(''); setHighlightedIdx(-1); }
                              }}
                              placeholder="Search positions..."
                              autoFocus
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                            <button
                              onClick={() => { handlePositionUpdate(null); setPositionSearch(''); setHighlightedIdx(-1); }}
                              className={`w-full text-left px-3 py-2 text-sm italic ${highlightedIdx === -1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                              — No position —
                            </button>
                            {filtered.map((pos, idx) => (
                                <button
                                  key={pos}
                                  onClick={() => { handlePositionUpdate(pos); setPositionSearch(''); setHighlightedIdx(-1); }}
                                  className={`w-full text-left px-3 py-2 text-sm ${
                                    idx === highlightedIdx
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                      : pos === selectedJD.company_position
                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300'
                                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {pos}
                                </button>
                              ))}
                          </div>
                          <button
                            onClick={() => { setShowPositionSelector(false); setPositionSearch(''); setHighlightedIdx(-1); }}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                        );
                      })() : selectedJD.company_position ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedJD.company_position}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowPositionSelector(true)}
                              className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            >
                              Reassign
                            </button>
                            <button
                              onClick={() => handlePositionUpdate(null)}
                              className="px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No position assigned</p>
                          <button
                            onClick={() => setShowPositionSelector(true)}
                            className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                          >
                            Assign Position
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className={modalOverlay}>
          <div className={`${modalBox} max-w-lg space-y-4 max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Job Description</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className={labelClass}>Position Title *</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className={inputClass} placeholder="e.g. Senior Software Engineer" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} className={inputClass} rows={3} />
            </div>
            <div>
              <label className={labelClass}>Requirements</label>
              <textarea value={newRequirements} onChange={e => setNewRequirements(e.target.value)} className={inputClass} rows={3} />
            </div>
            <div>
              <label className={labelClass}>Preferred Qualifications</label>
              <textarea value={newPreferred} onChange={e => setNewPreferred(e.target.value)} className={inputClass} rows={2} />
            </div>
            <div>
              <label className={labelClass}>Responsibilities</label>
              <textarea value={newResponsibilities} onChange={e => setNewResponsibilities(e.target.value)} className={inputClass} rows={2} />
            </div>
            <div>
              <label className={labelClass}>Skills (comma-separated)</label>
              <input value={newSkills} onChange={e => setNewSkills(e.target.value)} className={inputClass} placeholder="React, Python, AWS" />
            </div>
            <div className="relative">
              <label className={labelClass}>Company Position</label>
              <div
                onClick={() => { setCreatePositionOpen(!createPositionOpen); setCreatePositionSearch(''); setHighlightedIdx(-1); }}
                className={`${inputClass} cursor-pointer flex items-center justify-between`}
              >
                <span className={newCompanyPosition ? '' : 'text-gray-400'}>{newCompanyPosition || '— No position —'}</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${createPositionOpen ? 'rotate-90' : ''}`} />
              </div>
              {createPositionOpen && (() => {
                const filtered = companyPositions.filter(pos => pos.toLowerCase().includes(createPositionSearch.toLowerCase()));
                const totalOptions = filtered.length + 1;
                return (
                <div className="absolute z-10 mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={createPositionSearch}
                        onChange={e => { setCreatePositionSearch(e.target.value); setHighlightedIdx(-1); }}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, totalOptions - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, -1)); }
                          else if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = highlightedIdx < 0 ? '' : (filtered[highlightedIdx] || '');
                            setNewCompanyPosition(val);
                            setCreatePositionOpen(false); setHighlightedIdx(-1);
                          }
                          else if (e.key === 'Escape') { setCreatePositionOpen(false); setHighlightedIdx(-1); }
                        }}
                        placeholder="Search positions..."
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      onClick={() => { setNewCompanyPosition(''); setCreatePositionOpen(false); setHighlightedIdx(-1); }}
                      className={`w-full text-left px-3 py-2 text-sm italic ${highlightedIdx === -1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      — No position —
                    </button>
                    {filtered.map((pos, idx) => (
                        <button
                          key={pos}
                          onClick={() => { setNewCompanyPosition(pos); setCreatePositionOpen(false); setHighlightedIdx(-1); }}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            idx === highlightedIdx
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                              : pos === newCompanyPosition
                                ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300'
                                : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                  </div>
                </div>
                );
              })()}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className={modalOverlay}>
          <div className={`${modalBox} max-w-md space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Job Description</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className={labelClass}>Position Title *</label>
              <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className={inputClass} placeholder="e.g. Product Manager" />
            </div>
            <div>
              <label className={labelClass}>JD Document (PDF or DOCX) *</label>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={handleUpload}
                disabled={!uploadTitle.trim() || !uploadFile || uploading}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
