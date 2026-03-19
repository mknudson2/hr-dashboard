import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Edit, Plus, Eye, Users, FileText, Globe, Lock, Upload, UserPlus, Star, Trash2
} from 'lucide-react';
import LifecycleTracker, { type LifecycleStage } from '@/components/recruiting/LifecycleTracker';
import StageDetailPanel from '@/components/recruiting/StageDetailPanel';
import ComplianceTipsPanel from '@/components/recruiting/ComplianceTipsPanel';

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
  posting_channels: string[] | null;
  skills_tags: string[] | null;
  hiring_manager_name: string | null;
  recruiter_name: string | null;
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
  resume_analysis_score: number | null;
  resume_analysis_label: string | null;
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
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<LifecycleStage | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showAddApplicantModal, setShowAddApplicantModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadRequisition();
      loadApplications();
      loadLifecycle();
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

  const handleRemoveApplication = async (appId: number, appName: string) => {
    if (!confirm(`Remove application from ${appName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${appId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setApplications(prev => prev.filter(a => a.id !== appId));
      }
    } catch (error) {
      console.error('Failed to remove application:', error);
    }
  };

  const loadLifecycle = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/lifecycle/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLifecycleStages(data.stages || []);
        const active = (data.stages || []).find((s: LifecycleStage) => s.status === 'active');
        if (active && !selectedStage) {
          setSelectedStage(active);
        }
      }
    } catch {
      // Lifecycle might not exist yet
    }
  };

  const reloadAll = () => {
    loadRequisition();
    loadLifecycle();
  };

  const handleAdvance = async (stageId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/lifecycle/${id}/stages/${stageId}/advance`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) reloadAll();
    } catch { /* silent */ }
  };

  const handleSkip = async (stageId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/lifecycle/${id}/stages/${stageId}/skip`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Skipped by HR' }),
      });
      if (res.ok) reloadAll();
    } catch { /* silent */ }
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
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {nextStatuses[requisition.status]?.map(s => (
            <button
              key={s}
              onClick={() => {
                if (s === 'Approved') {
                  setShowApproveModal(true);
                } else {
                  changeStatus(s);
                }
              }}
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

      {/* Lifecycle Tracker */}
      {lifecycleStages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <LifecycleTracker
            stages={lifecycleStages}
            activeStageId={selectedStage?.id}
            onStageClick={(stage) => {
              setSelectedStage(stage);
              fetch(`${BASE_URL}/recruiting/lifecycle/${id}/stages/${stage.id}/mark-viewed`, {
                method: 'POST', credentials: 'include',
              }).then(() => loadLifecycle()).catch(() => {});
            }}
            readOnly={false}
            onAdvance={handleAdvance}
            onSkip={handleSkip}
          />
        </div>
      )}

      {/* Stage Detail Panel — notes, documents, actions */}
      {selectedStage && id && (
        <StageDetailPanel
          stage={selectedStage}
          requisitionId={parseInt(id)}
          readOnly={false}
          onStageUpdated={reloadAll}
        />
      )}

      {/* Content + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddApplicantModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4" /> Add Applicant
                </button>
              </div>
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
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">AI Score</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {applications.map(app => (
                        <tr key={app.id} onClick={() => navigate(`/recruiting/applications/${app.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                {app.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />}
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
                            {app.overall_rating ? `${Math.round((app.overall_rating / 5) * 100)}%` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {app.resume_analysis_label ? (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                app.resume_analysis_label === 'Promising'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}>
                                {app.resume_analysis_label}
                                {app.resume_analysis_score != null && ` (${Math.round(app.resume_analysis_score)})`}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveApplication(app.id, app.applicant.name); }}
                              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              title="Remove application"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stakeholders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" />
              Stakeholders
            </h3>
            <div className="space-y-2 text-sm">
              {requisition.hiring_manager_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Hiring Manager</span>
                  <span className="text-gray-700 dark:text-gray-300">{requisition.hiring_manager_name}</span>
                </div>
              )}
              {requisition.recruiter_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Recruiter</span>
                  <span className="text-gray-700 dark:text-gray-300">{requisition.recruiter_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Posting Channels */}
          {requisition.posting_channels && requisition.posting_channels.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" />
                Posting Channels
              </h3>
              <div className="flex flex-wrap gap-2">
                {requisition.posting_channels.map(ch => (
                  <span key={ch} className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium capitalize">
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {requisition.skills_tags && requisition.skills_tags.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {requisition.skills_tags.map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Tips / Best Practices */}
          <ComplianceTipsPanel />
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowApproveModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Approve Requisition</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Would you like to open this position for recruitment now, or approve it to be opened later?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await changeStatus('Approved');
                  await changeStatus('Open');
                  setShowApproveModal(false);
                }}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Approve & Open Now
              </button>
              <button
                onClick={async () => {
                  await changeStatus('Approved');
                  setShowApproveModal(false);
                }}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Approve — Open Later
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Posting Modal */}
      {showPostingModal && (
        <CreatePostingModal
          onClose={() => setShowPostingModal(false)}
          onCreate={createPosting}
        />
      )}

      {/* Add Applicant Modal */}
      {showAddApplicantModal && (
        <AddApplicantModal
          reqId={Number(id)}
          onClose={() => setShowAddApplicantModal(false)}
          onCreated={() => {
            setShowAddApplicantModal(false);
            loadApplications();
            loadRequisition();
          }}
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

function AddApplicantModal({ reqId, onClose, onCreated }: {
  reqId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceHighlight, setSourceHighlight] = useState(0);
  const sourceRef = useRef<HTMLDivElement>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const SOURCE_OPTIONS = ['Referral', 'Indeed', 'Applicant Pool', 'LinkedIn', 'Paylocity'];
  const filteredSources = SOURCE_OPTIONS.filter(s =>
    s.toLowerCase().includes(sourceFilter.toLowerCase())
  );
  const sourceExactMatch = SOURCE_OPTIONS.some(s => s.toLowerCase() === sourceFilter.toLowerCase().trim());

  useEffect(() => { setSourceHighlight(0); }, [sourceFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node)) {
        setSourceOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('first_name', firstName.trim());
    formData.append('last_name', lastName.trim());
    formData.append('email', email.trim());
    if (phone.trim()) formData.append('phone', phone.trim());
    formData.append('source', source);
    if (coverLetter.trim()) formData.append('cover_letter', coverLetter.trim());
    if (resumeFile) formData.append('resume', resumeFile);

    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${reqId}/applications`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json().catch(() => ({ detail: 'Failed to create application' }));
        setError(data.detail || 'Failed to create application');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Add Applicant
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="John" />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Doe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(808) 555-1234" />
            </div>
          </div>

          <div className="relative" ref={sourceRef}>
            <label className={labelClass}>Source</label>
            {source ? (
              <span className={`${inputClass} flex items-center justify-between`}>
                {source}
                <button type="button" onClick={() => { setSource(''); setSourceFilter(''); }}>
                  <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</span>
                </button>
              </span>
            ) : (
              <>
                <input
                  type="text"
                  value={sourceFilter}
                  onChange={e => { setSourceFilter(e.target.value); setSourceOpen(true); }}
                  onFocus={() => setSourceOpen(true)}
                  onKeyDown={e => {
                    const hasCreate = sourceFilter.trim() && !sourceExactMatch;
                    const total = filteredSources.length + (hasCreate ? 1 : 0);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSourceHighlight(h => (h + 1) % total);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSourceHighlight(h => (h - 1 + total) % total);
                    } else if (e.key === 'Enter' && total > 0) {
                      e.preventDefault();
                      if (sourceHighlight < filteredSources.length) {
                        setSource(filteredSources[sourceHighlight]);
                      } else if (hasCreate) {
                        setSource(sourceFilter.trim());
                      }
                      setSourceOpen(false);
                      setSourceFilter('');
                    } else if (e.key === 'Escape') {
                      setSourceOpen(false);
                    }
                  }}
                  className={inputClass}
                  placeholder="Select or type a source..."
                />
                {sourceOpen && (filteredSources.length > 0 || (sourceFilter.trim() && !sourceExactMatch)) && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-100 dark:bg-gray-800/95 border border-gray-300 dark:border-gray-500 rounded-lg shadow-lg max-h-48 overflow-y-auto backdrop-blur-sm">
                    {filteredSources.map((s, i) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSource(s); setSourceOpen(false); setSourceFilter(''); }}
                        className={`w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-100 ${i === sourceHighlight ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      >
                        {s}
                      </button>
                    ))}
                    {sourceFilter.trim() && !sourceExactMatch && (
                      <button
                        type="button"
                        onClick={() => { setSource(sourceFilter.trim()); setSourceOpen(false); setSourceFilter(''); }}
                        className={`w-full text-left px-3 py-2 text-sm text-blue-700 dark:text-blue-300 font-medium border-t border-gray-300 dark:border-gray-600 flex items-center gap-1 ${sourceHighlight === filteredSources.length ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Use custom source "{sourceFilter.trim()}"
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className={labelClass}>Cover Letter</label>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              className={`${inputClass} h-24 resize-none`}
              placeholder="Optional cover letter or notes..."
            />
          </div>

          <div>
            <label className={labelClass}>Resume</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              {resumeFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <FileText className="w-4 h-4" />
                    {resumeFile.name}
                    <span className="text-gray-400">({(resumeFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => setResumeFile(null)} className="text-red-500 text-sm hover:text-red-700">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload resume</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setResumeFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? 'Creating...' : 'Add Applicant'}
          </button>
        </div>
      </div>
    </div>
  );
}
