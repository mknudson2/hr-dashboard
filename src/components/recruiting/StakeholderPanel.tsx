import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import { Users, Plus, UserPlus, Search, X, Shield, Pencil, Trash2 } from 'lucide-react';

// --- Types ---

interface Stakeholder {
  id: number | null;
  user_id: number | null;
  employee_id: string | null;
  user_name: string | null;
  role: string;
  access_level: string;
  assigned_by_name: string | null;
  assigned_at: string | null;
  is_primary?: boolean;
}

interface TeamMemberResult {
  employee_id: string;
  user_id: number | null;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
}

interface StakeholderPanelProps {
  requisitionId: number;
}

// --- Constants ---

const roleBadgeColors: Record<string, string> = {
  vp_svp: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  hiring_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  recruiter: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  interviewer: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  observer: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const roleLabels: Record<string, string> = {
  vp_svp: 'VP / SVP',
  hiring_manager: 'Hiring Manager',
  recruiter: 'Recruiter',
  interviewer: 'Interviewer',
  observer: 'Observer',
};

const accessLevelLabels: Record<string, string> = {
  full_access: 'Full Access',
  interview_and_pipeline_view: 'Interview + Pipeline View',
  pipeline_view_only: 'Pipeline View Only',
};

const roleDefaultAccessLevel: Record<string, string> = {
  vp_svp: 'full_access',
  interviewer: 'interview_and_pipeline_view',
  observer: 'pipeline_view_only',
};

const addableRoles = [
  { value: 'vp_svp', label: 'VP / SVP' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'observer', label: 'Observer' },
];

const allAccessLevels = [
  { value: 'full_access', label: 'Full Access' },
  { value: 'interview_and_pipeline_view', label: 'Interview + Pipeline View' },
  { value: 'pipeline_view_only', label: 'Pipeline View Only' },
];

// --- Component ---

export default function StakeholderPanel({ requisitionId }: StakeholderPanelProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMemberResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberResult | null>(null);
  const [selectedRole, setSelectedRole] = useState('interviewer');
  const [accessLevel, setAccessLevel] = useState('interview_and_pipeline_view');
  const [overrideAccess, setOverrideAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editAccess, setEditAccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadStakeholders();
  }, [requisitionId]);

  // Debounced search
  useEffect(() => {
    if (searchText.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await apiGet<{ employees: TeamMemberResult[] }>(
          `/recruiting/team-members?search=${encodeURIComponent(searchText)}`
        );
        const existingEmpIds = new Set(stakeholders.map(s => s.employee_id));
        setSearchResults(data.employees.filter(e => !existingEmpIds.has(e.employee_id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, stakeholders]);

  const loadStakeholders = async () => {
    try {
      setError('');
      const data = await apiGet<Stakeholder[]>(
        `/recruiting/requisitions/${requisitionId}/stakeholders`
      );
      setStakeholders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stakeholders');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setSearchText('');
    setSearchResults([]);
    setSelectedMember(null);
    setSelectedRole('interviewer');
    setAccessLevel(roleDefaultAccessLevel['interviewer']);
    setOverrideAccess(false);
    setSubmitError('');
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (!overrideAccess) {
      setAccessLevel(roleDefaultAccessLevel[role] || 'pipeline_view_only');
    }
  };

  const handleSubmit = async () => {
    if (!selectedMember) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      await apiPost(`/recruiting/requisitions/${requisitionId}/stakeholders`, {
        employee_id: selectedMember.employee_id,
        user_id: selectedMember.user_id,
        role: selectedRole,
        access_level: accessLevel,
      });
      setShowModal(false);
      await loadStakeholders();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add stakeholder');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (s: Stakeholder) => {
    setEditingId(s.id);
    setEditRole(s.role);
    setEditAccess(s.access_level);
  };

  const saveEdit = async (stakeholderId: number) => {
    try {
      setSaving(true);
      await apiPut(`/recruiting/requisitions/${requisitionId}/stakeholders/${stakeholderId}`, {
        role: editRole,
        access_level: editAccess,
      });
      setEditingId(null);
      await loadStakeholders();
    } catch {
      // keep editing
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stakeholderId: number) => {
    try {
      setDeletingId(stakeholderId);
      await apiDelete(`/recruiting/requisitions/${requisitionId}/stakeholders/${stakeholderId}`);
      await loadStakeholders();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Stakeholders ({stakeholders.length})
        </h4>
        <button
          onClick={openModal}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {stakeholders.length === 0 ? (
        <div className="py-4 text-center">
          <Users className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500 dark:text-gray-400">No stakeholders yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {stakeholders.map((s, idx) => (
            <div key={s.id ?? `primary-${idx}`} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {s.user_name || 'Unknown'}
                  </span>
                  {editingId !== null && editingId === s.id ? (
                    <select
                      value={editRole}
                      onChange={e => {
                        setEditRole(e.target.value);
                        setEditAccess(roleDefaultAccessLevel[e.target.value] || 'pipeline_view_only');
                      }}
                      className="text-xs border rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 dark:border-gray-600"
                    >
                      {addableRoles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeColors[s.role] || 'bg-gray-100 text-gray-600'}`}>
                      {roleLabels[s.role] || s.role}
                    </span>
                  )}
                </div>
                {editingId !== null && editingId === s.id ? (
                  <select
                    value={editAccess}
                    onChange={e => setEditAccess(e.target.value)}
                    className="text-xs border rounded px-1.5 py-0.5 mt-1 bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    {allAccessLevels.map(al => (
                      <option key={al.value} value={al.value}>{al.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {accessLevelLabels[s.access_level] || s.access_level}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {editingId !== null && editingId === s.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(s.id!)}
                      disabled={saving}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {s.id != null && (
                      <>
                        <button onClick={() => startEdit(s)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id!)}
                          disabled={deletingId === s.id}
                          className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Add Stakeholder
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
                {selectedMember ? (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </span>
                      <span className="text-xs text-blue-600/60 ml-2">{selectedMember.position}</span>
                    </div>
                    <button onClick={() => { setSelectedMember(null); setSearchText(''); }} className="p-0.5 text-blue-400 hover:text-blue-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(emp => (
                          <button
                            key={emp.employee_id}
                            onClick={() => { setSelectedMember(emp); setSearchText(''); setSearchResults([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            <span className="text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</span>
                            <span className="text-xs text-gray-500 ml-2">{emp.position}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={e => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  {addableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Access Level */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Level</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideAccess}
                      onChange={() => {
                        const next = !overrideAccess;
                        setOverrideAccess(next);
                        if (!next) setAccessLevel(roleDefaultAccessLevel[selectedRole] || 'pipeline_view_only');
                      }}
                      className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                    />
                    <span className="text-xs text-gray-500">Override</span>
                  </label>
                </div>
                {overrideAccess ? (
                  <select
                    value={accessLevel}
                    onChange={e => setAccessLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  >
                    {allAccessLevels.map(al => (
                      <option key={al.value} value={al.value}>{al.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border text-sm text-gray-700 dark:text-gray-300">
                    {accessLevelLabels[accessLevel]}
                    <span className="ml-2 text-xs text-gray-400">(default for {roleLabels[selectedRole]})</span>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{submitError}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!selectedMember || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Adding...' : 'Add Stakeholder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
