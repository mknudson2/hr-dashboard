import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, Globe, Lock
} from 'lucide-react';

const BASE_URL = '';

interface Posting {
  id: number;
  posting_id: string;
  title: string;
  channel: string;
  status: string;
  slug: string;
  application_count: number;
  published_at: string | null;
}

interface RequisitionDetail {
  id: number;
  requisition_id: string;
  title: string;
  department: string | null;
  team: string | null;
  cost_center: string | null;
  location: string | null;
  remote_type: string;
  employment_type: string | null;
  position_type: string;
  salary_min: number | null;
  salary_max: number | null;
  wage_type: string | null;
  show_salary_on_posting: boolean;
  openings: number;
  filled_count: number;
  status: string;
  is_internal_only: boolean;
  description: string | null;
  requirements: string | null;
  preferred_qualifications: string | null;
  responsibilities: string | null;
  benefits_summary: string | null;
  target_start_date: string | null;
  target_fill_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  postings: Posting[];
  application_count: number;
}

interface Application {
  id: number;
  application_id: string;
  applicant: { id: number; name: string; email: string };
  status: string;
  source: string;
  overall_rating: number | null;
  is_favorite: boolean;
  is_internal_transfer: boolean;
  submitted_at: string | null;
  created_at: string | null;
}

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showPostingModal, setShowPostingModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadRequisition();
      loadApplications();
    }
  }, [id]);

  const loadRequisition = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${id}`, { credentials: 'include' });
      if (res.ok) {
        setRequisition(await res.json());
      }
    } catch (error) {
      console.error('Failed to load requisition:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${id}/applications`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const changeStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadRequisition();
      }
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  const createPosting = async (postingData: { channel: string; is_internal: boolean }) => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/postings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisition_id: Number(id),
          channel: postingData.channel,
          is_internal: postingData.is_internal,
        }),
      });
      if (res.ok) {
        setShowPostingModal(false);
        loadRequisition();
      }
    } catch (error) {
      console.error('Failed to create posting:', error);
    }
  };

  const publishPosting = async (postingId: number) => {
    try {
      await fetch(`${BASE_URL}/recruiting/postings/${postingId}/publish`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Published' }),
      });
      loadRequisition();
    } catch (error) {
      console.error('Failed to publish posting:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">Requisition not found.</div>
    );
  }

  const statusColors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    Open: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'On Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    Filled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  const appStatusColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    Screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    Interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    Offer: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    Hired: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    Withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'postings', label: `Postings (${requisition.postings.length})` },
    { id: 'applications', label: `Applications (${requisition.application_count})` },
  ];

  // Determine available status transitions
  const nextStatuses: Record<string, string[]> = {
    'Draft': ['Pending Approval', 'Cancelled'],
    'Pending Approval': ['Approved', 'Draft', 'Cancelled'],
    'Approved': ['Open', 'On Hold', 'Cancelled'],
    'Open': ['On Hold', 'Filled', 'Cancelled'],
    'On Hold': ['Open', 'Cancelled'],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/recruiting/requisitions')} className="mt-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{requisition.title}</h1>
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[requisition.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                {requisition.status}
              </span>
              {requisition.is_internal_only && (
                <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <Lock className="w-3 h-3" /> Internal Only
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {requisition.requisition_id} &middot; {requisition.department || 'No Department'} &middot; {requisition.location || 'No Location'}
              {requisition.remote_type !== 'On-site' && ` (${requisition.remote_type})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/recruiting/requisitions/${requisition.id}/lifecycle`)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            View Lifecycle
          </button>
          {nextStatuses[requisition.status]?.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {s === 'Cancelled' ? 'Cancel' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Position Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Employment Type</p>
                <p className="font-medium text-gray-900 dark:text-white">{requisition.employment_type || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Position Type</p>
                <p className="font-medium text-gray-900 dark:text-white">{requisition.position_type}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Openings</p>
                <p className="font-medium text-gray-900 dark:text-white">{requisition.filled_count} / {requisition.openings} filled</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Wage Type</p>
                <p className="font-medium text-gray-900 dark:text-white">{requisition.wage_type || '—'}</p>
              </div>
              {(requisition.salary_min || requisition.salary_max) && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Salary Range</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {requisition.salary_min ? `$${requisition.salary_min.toLocaleString()}` : '—'} - {requisition.salary_max ? `$${requisition.salary_max.toLocaleString()}` : '—'}
                    {requisition.show_salary_on_posting ? ' (visible on posting)' : ' (hidden)'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500 dark:text-gray-400">Target Start Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{requisition.target_start_date || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Target Fill Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{requisition.target_fill_date || '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Description</h3>
            {requisition.description ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requisition.description}</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description provided</p>
            )}
            {requisition.requirements && (
              <>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mt-4">Requirements</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requisition.requirements}</p>
              </>
            )}
            {requisition.responsibilities && (
              <>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mt-4">Responsibilities</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requisition.responsibilities}</p>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'postings' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPostingModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Create Posting
            </button>
          </div>
          {requisition.postings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              No postings yet. Create one to start receiving applications.
            </div>
          ) : (
            <div className="grid gap-4">
              {requisition.postings.map(posting => (
                <div key={posting.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {posting.channel === 'internal' ? (
                      <Lock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Globe className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{posting.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {posting.posting_id} &middot; {posting.channel} &middot; {posting.application_count} application{posting.application_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      posting.status === 'Published' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                      posting.status === 'Draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      posting.status === 'Closed' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                    }`}>
                      {posting.status}
                    </span>
                    {posting.status === 'Draft' && (
                      <button
                        onClick={() => publishPosting(posting.id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {applications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No applications yet.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {applications.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {app.applicant.name}
                          {app.is_internal_transfer && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">Internal</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{app.applicant.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${appStatusColors[app.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{app.source || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {app.overall_rating ? `${app.overall_rating}/5` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Posting Modal */}
      {showPostingModal && (
        <CreatePostingModal
          onClose={() => setShowPostingModal(false)}
          onCreate={createPosting}
        />
      )}
    </div>
  );
}

function CreatePostingModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { channel: string; is_internal: boolean }) => void;
}) {
  const [channel, setChannel] = useState('portal');
  const [isInternal, setIsInternal] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create Job Posting</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="portal">Applicant Portal</option>
              <option value="internal">Internal (Employees Only)</option>
              <option value="careers_page">Careers Page</option>
              <option value="indeed">Indeed</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isInternal || channel === 'internal'}
              onChange={e => setIsInternal(e.target.checked)}
              disabled={channel === 'internal'}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Internal posting (employees only)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
          <button
            onClick={() => onCreate({ channel, is_internal: isInternal || channel === 'internal' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Create Posting
          </button>
        </div>
      </div>
    </div>
  );
}
