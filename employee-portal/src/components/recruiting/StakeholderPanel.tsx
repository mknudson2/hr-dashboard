import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { Users, Plus, UserPlus, Search, X, Shield } from 'lucide-react';

// --- Types ---

interface Stakeholder {
  id: number;
  user_id: number;
  user_name: string;
  role: string;
  access_level: string;
  assigned_by_name: string | null;
  assigned_at: string | null;
  is_active: boolean;
}

interface Employee {
  id: number;
  name: string;
}

interface FieldOptions {
  departments: unknown[];
  cost_centers: unknown[];
  teams: unknown[];
  employees: Employee[];
}

interface StakeholderPanelProps {
  requisitionId: number;
}

// --- Constants ---

const roleBadgeColors: Record<string, string> = {
  vp_svp: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  hiring_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  interviewer: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  observer: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const roleLabels: Record<string, string> = {
  vp_svp: 'VP / SVP',
  hiring_manager: 'Hiring Manager',
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

// --- Helpers ---

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Component ---

export default function StakeholderPanel({ requisitionId }: StakeholderPanelProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRole, setSelectedRole] = useState('interviewer');
  const [accessLevel, setAccessLevel] = useState('interview_and_pipeline_view');
  const [overrideAccess, setOverrideAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    loadStakeholders();
  }, [requisitionId]);

  const loadStakeholders = async () => {
    try {
      setError('');
      const data = await apiGet<Stakeholder[]>(
        `/portal/hiring-manager/requisitions/${requisitionId}/stakeholders`
      );
      setStakeholders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stakeholders');
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    setShowModal(true);
    setSearchText('');
    setSelectedEmployee(null);
    setSelectedRole('interviewer');
    setAccessLevel(roleDefaultAccessLevel['interviewer']);
    setOverrideAccess(false);
    setSubmitError('');

    if (employees.length === 0) {
      setEmployeesLoading(true);
      try {
        const data = await apiGet<FieldOptions>('/portal/hiring-manager/field-options');
        setEmployees(data.employees);
      } catch {
        // Silently fail — user can still close modal
      } finally {
        setEmployeesLoading(false);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSubmitError('');
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (!overrideAccess) {
      setAccessLevel(roleDefaultAccessLevel[role] || 'pipeline_view_only');
    }
  };

  const handleOverrideToggle = () => {
    const next = !overrideAccess;
    setOverrideAccess(next);
    if (!next) {
      setAccessLevel(roleDefaultAccessLevel[selectedRole] || 'pipeline_view_only');
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      await apiPost(`/portal/hiring-manager/requisitions/${requisitionId}/stakeholders`, {
        user_id: selectedEmployee.id,
        role: selectedRole,
        access_level: accessLevel,
      });
      closeModal();
      await loadStakeholders();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add stakeholder');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!searchText.trim()) return [];
    const query = searchText.toLowerCase();
    const existingUserIds = new Set(stakeholders.map(s => s.user_id));
    return employees
      .filter(e => e.name.toLowerCase().includes(query) && !existingUserIds.has(e.id))
      .slice(0, 10);
  }, [searchText, employees, stakeholders]);

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 text-center text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Stakeholders ({stakeholders.length})
        </h4>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Stakeholder
        </button>
      </div>

      {/* Table */}
      {stakeholders.length === 0 ? (
        <div className="py-6 text-center">
          <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No stakeholders assigned yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Access Level</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned By</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {stakeholders.map(s => (
                <tr key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                  <td className="py-2.5 pr-3 text-gray-900 dark:text-white font-medium">
                    {s.user_name}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[s.role] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {roleLabels[s.role] || s.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                    {accessLevelLabels[s.access_level] || s.access_level}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                    {s.assigned_by_name || '\u2014'}
                  </td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                    {formatDate(s.assigned_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Stakeholder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Add Stakeholder
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Employee Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee
                </label>
                {selectedEmployee ? (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {selectedEmployee.name}
                    </span>
                    <button
                      onClick={() => { setSelectedEmployee(null); setSearchText(''); }}
                      className="p-0.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                    >
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
                      placeholder={employeesLoading ? 'Loading employees...' : 'Search employees by name...'}
                      disabled={employeesLoading}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    {filteredEmployees.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmployees.map(emp => (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setSearchText('');
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            {emp.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchText.trim().length > 0 && filteredEmployees.length === 0 && !employeesLoading && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No matching employees found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={e => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {addableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Access Level */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Access Level
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideAccess}
                      onChange={handleOverrideToggle}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Override</span>
                  </label>
                </div>
                {overrideAccess ? (
                  <select
                    value={accessLevel}
                    onChange={e => setAccessLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {allAccessLevels.map(al => (
                      <option key={al.value} value={al.value}>{al.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">
                    {accessLevelLabels[accessLevel] || accessLevel}
                    <span className="ml-2 text-xs text-gray-400">(default for {roleLabels[selectedRole] || selectedRole})</span>
                  </div>
                )}
              </div>

              {/* Error */}
              {submitError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {submitError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedEmployee || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
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
