import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import { Plus, Briefcase, Clock, Search, Copy, ClipboardList, CheckSquare } from 'lucide-react';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';

interface Requisition {
  id: number;
  requisition_id: string;
  title: string;
  department: string | null;
  team: string | null;
  status: string;
  urgency: string | null;
  posting_channels: string[] | null;
  request_source: string | null;
  created_at: string | null;
  updated_at: string | null;
  target_start_date: string | null;
  closed_at: string | null;
  close_reason: string | null;
  my_role: string | null;
}

interface RequisitionDetail {
  id: number;
  title: string;
  department: string | null;
  team: string | null;
  cost_center: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  position_supervisor: string | null;
  posting_channels: string[] | null;
  requires_early_tech_screen: boolean;
  target_salary: number | null;
  salary_min: number | null;
  salary_max: number | null;
  wage_type: string | null;
  skills_tags: string[] | null;
  urgency: string | null;
  description: string | null;
  requirements: string | null;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700',
  'Pending Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Open': 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-orange-100 text-orange-700',
  'Filled': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const urgencyColors: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Normal': 'bg-blue-100 text-blue-600',
  'High': 'bg-orange-100 text-orange-600',
  'Critical': 'bg-red-100 text-red-600',
};

const closedStatuses = ['Filled', 'Cancelled'];

const roleLabels: Record<string, string> = {
  hiring_manager: 'Hiring Manager',
  interviewer: 'Interviewer',
  observer: 'Observer',
  vp_svp: 'VP / SVP',
  stakeholder: 'Stakeholder',
};

const roleBadgeColors: Record<string, string> = {
  hiring_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  interviewer: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  observer: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  vp_svp: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  stakeholder: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

const closeReasonLabels: Record<string, string> = {
  filled: 'Filled',
  rescinded: 'Rescinded',
  cancelled: 'Cancelled',
  budget_cut: 'Budget Cut',
  position_eliminated: 'Position Eliminated',
  other: 'Other',
};

const closeReasonColors: Record<string, string> = {
  filled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rescinded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  budget_cut: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  position_eliminated: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function MyRequisitionsPage() {
  const navigate = useNavigate();
  const { features } = useEmployeeFeatures();
  const isHiringManager = features?.is_hiring_manager ?? false;
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closedFilter, setClosedFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ total: number; requisitions: Requisition[] }>(
        '/portal/hiring-manager/requisitions'
      );
      setRequisitions(data.requisitions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  };

  const handleReuse = async (e: React.MouseEvent, reqId: number) => {
    e.stopPropagation();
    try {
      const detail = await apiGet<RequisitionDetail>(
        `/portal/hiring-manager/requisitions/${reqId}`
      );
      navigate('/hiring/new-request', { state: { cloneFrom: detail } });
    } catch {
      // Fall back to navigating without clone data
      navigate('/hiring/new-request');
    }
  };

  // Compute the set of roles the user has across all requisitions
  const availableRoles = [...new Set(requisitions.map(r => r.my_role).filter(Boolean))] as string[];

  const roleFiltered = roleFilter
    ? requisitions.filter(r => r.my_role === roleFilter)
    : requisitions;

  const activeReqs = roleFiltered.filter(r => !closedStatuses.includes(r.status));
  const closedReqs = roleFiltered.filter(r => closedStatuses.includes(r.status));

  const filteredClosedReqs = closedFilter
    ? closedReqs.filter(r => {
        const search = closedFilter.toLowerCase();
        return (
          r.title.toLowerCase().includes(search) ||
          r.requisition_id.toLowerCase().includes(search) ||
          (r.department && r.department.toLowerCase().includes(search)) ||
          (r.team && r.team.toLowerCase().includes(search)) ||
          r.status.toLowerCase().includes(search) ||
          (r.close_reason && (closeReasonLabels[r.close_reason] || r.close_reason).toLowerCase().includes(search))
        );
      })
    : closedReqs;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderReqCard = (req: Requisition, showReuse: boolean) => (
    <div
      key={req.id}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <button
          onClick={() => navigate(`/hiring/requisitions/${req.id}`)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-gray-400">{req.requisition_id}</span>
            {req.close_reason ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${closeReasonColors[req.close_reason] || 'bg-gray-100 text-gray-600'}`}>
                {closeReasonLabels[req.close_reason] || req.close_reason}
              </span>
            ) : (
              <>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || 'bg-gray-100 text-gray-700'}`}>
                  {req.status}
                </span>
                {req.urgency && req.urgency !== 'Normal' && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[req.urgency] || ''}`}>
                    {req.urgency}
                  </span>
                )}
              </>
            )}
            {req.my_role && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${roleBadgeColors[req.my_role] || 'bg-gray-100 text-gray-600'}`}>
                {roleLabels[req.my_role] || req.my_role}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {req.title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {req.department && <span>{req.department}</span>}
            {req.team && <span>/ {req.team}</span>}
            {req.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Posted {new Date(req.created_at).toLocaleDateString()}
              </span>
            )}
            {req.closed_at && (
              <span className="text-gray-400">
                Closed {new Date(req.closed_at).toLocaleDateString()}
              </span>
            )}
            {!req.closed_at && req.updated_at && closedStatuses.includes(req.status) && (
              <span className="text-gray-400">
                Closed {new Date(req.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2 ml-3">
          {req.posting_channels && req.posting_channels.length > 0 && (
            <div className="flex gap-1">
              {req.posting_channels.map(ch => (
                <span key={ch} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs capitalize">
                  {ch}
                </span>
              ))}
            </div>
          )}
          {showReuse && isHiringManager && (
            <button
              onClick={(e) => handleReuse(e, req.id)}
              title="Reuse as new request"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hiring
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isHiringManager
              ? 'Track the status of your position requests'
              : 'Follow the hiring progress for positions you\'re involved in'}
          </p>
        </div>
        {isHiringManager && (
          <button
            onClick={() => navigate('/hiring/new-request')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}
      </div>

      {/* Quick Navigation */}
      {isHiringManager && (
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/hiring/scorecard-templates')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Scorecard Templates
          </button>
          <button
            onClick={() => navigate('/hiring/approvals')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            Pending Approvals
          </button>
        </div>
      )}

      {/* Role Filter */}
      {availableRoles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">My Role:</span>
          <button
            onClick={() => setRoleFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !roleFilter
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({requisitions.length})
          </button>
          {availableRoles.map(role => {
            const count = requisitions.filter(r => r.my_role === role).length;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  roleFilter === role
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {roleLabels[role] || role} ({count})
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Active Requisitions */}
      {activeReqs.length === 0 && closedReqs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Requisitions Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isHiringManager
              ? 'Submit your first position request to get started.'
              : 'You\'ll see requisitions here when you\'re added as a stakeholder.'}
          </p>
          {isHiringManager && (
            <button
              onClick={() => navigate('/hiring/new-request')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Request New Position
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active */}
          {activeReqs.length > 0 && (
            <div className="space-y-3">
              {activeReqs.map(req => renderReqCard(req, false))}
            </div>
          )}
          {activeReqs.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No active requisitions</p>
            </div>
          )}

          {/* Closed / Past Postings */}
          {closedReqs.length > 0 && (
            <div className="space-y-3 mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Past Postings</h2>
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={closedFilter}
                    onChange={e => setClosedFilter(e.target.value)}
                    placeholder="Filter past postings..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {filteredClosedReqs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No matching past postings</p>
              ) : (
                filteredClosedReqs.map(req => renderReqCard(req, true))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
