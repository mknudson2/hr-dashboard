import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Users, Clock, Building, Globe, Zap, Lock, Plus, FileText,
} from 'lucide-react';
import LifecycleTracker, { type LifecycleStage } from '@/components/recruiting/LifecycleTracker';
import StageDetailPanel from '@/components/recruiting/StageDetailPanel';
import ComplianceTipsPanel from '@/components/recruiting/ComplianceTipsPanel';

// --- Interfaces ---

interface LifecycleData {
  requisition_id: number;
  requisition_title: string;
  requisition_status: string;
  stages: LifecycleStage[];
}

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

interface RequisitionInfo {
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
  urgency: string | null;
  posting_channels: string[] | null;
  skills_tags: string[] | null;
  request_source: string | null;
  preferred_salary: number | null;
  position_supervisor: string | null;
  visibility_user_ids: number[] | null;
  created_at: string | null;
  updated_at: string | null;
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
  submitted_at: string | null;
  created_at: string | null;
}

// --- Constants ---

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Open: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'On Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Filled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const urgencyColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Normal: 'bg-blue-100 text-blue-600',
  High: 'bg-orange-100 text-orange-600',
  Critical: 'bg-red-100 text-red-600',
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

const nextStatuses: Record<string, string[]> = {
  'Draft': ['Pending Approval', 'Cancelled'],
  'Pending Approval': ['Approved', 'Draft', 'Cancelled'],
  'Approved': ['Open', 'On Hold', 'Cancelled'],
  'Open': ['On Hold', 'Filled', 'Cancelled'],
  'On Hold': ['Open', 'Cancelled'],
};

// --- Component ---

export default function RequisitionLifecyclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lifecycleData, setLifecycleData] = useState<LifecycleData | null>(null);
  const [requisition, setRequisition] = useState<RequisitionInfo | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStage, setSelectedStage] = useState<LifecycleStage | null>(null);
  const [activeTab, setActiveTab] = useState<'stage' | 'details' | 'postings' | 'applications'>('stage');
  const [loading, setLoading] = useState(true);
  const [showPostingModal, setShowPostingModal] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [lcRes, reqRes, appRes] = await Promise.all([
        fetch(`/recruiting/lifecycle/${id}`, { credentials: 'include' }),
        fetch(`/recruiting/requisitions/${id}`, { credentials: 'include' }),
        fetch(`/recruiting/requisitions/${id}/applications`, { credentials: 'include' }),
      ]);

      if (lcRes.ok) {
        const lcData = await lcRes.json();
        setLifecycleData(lcData);
        const active = lcData.stages.find((s: LifecycleStage) => s.status === 'active');
        if (active && !selectedStage) setSelectedStage(active);
      }

      if (reqRes.ok) {
        setRequisition(await reqRes.json());
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        setApplications(appData.applications || []);
      }
    } catch (err) {
      console.error('Failed to load requisition:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Lifecycle actions ---

  const handleAdvance = async (stageId: number) => {
    try {
      const res = await fetch(`/recruiting/lifecycle/${id}/stages/${stageId}/advance`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) fetchAll();
    } catch { /* silent */ }
  };

  const handleSkip = async (stageId: number) => {
    try {
      const res = await fetch(`/recruiting/lifecycle/${id}/stages/${stageId}/skip`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Skipped by HR' }),
      });
      if (res.ok) fetchAll();
    } catch { /* silent */ }
  };

  const handleEarlyTechScreen = async () => {
    try {
      const res = await fetch(`/recruiting/lifecycle/${id}/early-tech-screen`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to trigger early tech screen');
      }
    } catch { /* silent */ }
  };

  // --- Requisition actions ---

  const changeStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/recruiting/requisitions/${id}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchAll();
    } catch { /* silent */ }
  };

  const createPosting = async (postingData: { channel: string; is_internal: boolean }) => {
    try {
      const res = await fetch(`/recruiting/postings`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisition_id: Number(id), ...postingData }),
      });
      if (res.ok) { setShowPostingModal(false); fetchAll(); }
    } catch { /* silent */ }
  };

  const publishPosting = async (postingId: number) => {
    try {
      await fetch(`/recruiting/postings/${postingId}/publish`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Published' }),
      });
      fetchAll();
    } catch { /* silent */ }
  };

  // --- Loading / Not Found ---

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!requisition) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Requisition not found.</div>;
  }

  // --- Tabs ---

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'stage', label: 'Stage Details' },
    { id: 'details', label: 'Position Info' },
    { id: 'postings', label: `Postings (${requisition.postings?.length ?? 0})` },
    { id: 'applications', label: `Applications (${requisition.application_count ?? 0})` },
  ];

  // --- Render ---

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/recruiting/requisitions')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{requisition.requisition_id}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[requisition.status] || 'bg-gray-100 text-gray-700'}`}>
                {requisition.status}
              </span>
              {requisition.urgency && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[requisition.urgency] || ''}`}>
                  {requisition.urgency}
                </span>
              )}
              {requisition.request_source === 'employee_portal' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  Portal Request
                </span>
              )}
              {requisition.is_internal_only && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <Lock className="w-3 h-3" /> Internal
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{requisition.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {requisition.department && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {requisition.department}{requisition.team && ` / ${requisition.team}`}
                </span>
              )}
              {requisition.location && (
                <span>{requisition.location}{requisition.remote_type !== 'On-site' && ` (${requisition.remote_type})`}</span>
              )}
              {requisition.created_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Created {new Date(requisition.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Lifecycle Tracker — always visible */}
      {lifecycleData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recruiting Lifecycle
            </h2>
            {lifecycleData.stages.some(s => s.stage_key === 'tech_screen' && s.status === 'pending') && (
              <button
                onClick={handleEarlyTechScreen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                title="Skip ahead to Tech Screen"
              >
                <Zap className="w-3.5 h-3.5" />
                Early Tech Screen
              </button>
            )}
          </div>
          <LifecycleTracker
            stages={lifecycleData.stages}
            activeStageId={selectedStage?.id}
            onStageClick={(stage) => { setSelectedStage(stage); setActiveTab('stage'); }}
            readOnly={false}
            onAdvance={handleAdvance}
            onSkip={handleSkip}
          />
        </div>
      )}

      {/* Content area: tabs + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
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

          {/* Stage Detail */}
          {activeTab === 'stage' && selectedStage && id && (
            <StageDetailPanel
              stage={selectedStage}
              requisitionId={parseInt(id)}
              readOnly={false}
              onStageUpdated={fetchAll}
            />
          )}
          {activeTab === 'stage' && !selectedStage && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              Click a stage above to view its details, notes, and documents.
            </div>
          )}

          {/* Position Info */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Position Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {requisition.department && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium text-gray-900 dark:text-white">{requisition.department}</p>
                    </div>
                  )}
                  {requisition.team && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Team</p>
                      <p className="font-medium text-gray-900 dark:text-white">{requisition.team}</p>
                    </div>
                  )}
                  {requisition.cost_center && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Cost Center</p>
                      <p className="font-medium text-gray-900 dark:text-white">{requisition.cost_center}</p>
                    </div>
                  )}
                  {requisition.position_supervisor && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Intended Supervisor</p>
                      <p className="font-medium text-gray-900 dark:text-white">{requisition.position_supervisor}</p>
                    </div>
                  )}
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
                  {requisition.preferred_salary && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        {requisition.wage_type === 'Hourly' ? 'Preferred Rate' : 'Preferred Salary'}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${requisition.preferred_salary.toLocaleString()}{requisition.wage_type === 'Hourly' ? '/hr' : ''}
                      </p>
                    </div>
                  )}
                  {(requisition.salary_min || requisition.salary_max) && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        {requisition.wage_type === 'Hourly' ? 'Rate Range' : 'Salary Range'}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {requisition.salary_min ? `$${requisition.salary_min.toLocaleString()}` : '—'} - {requisition.salary_max ? `$${requisition.salary_max.toLocaleString()}` : '—'}{requisition.wage_type === 'Hourly' ? '/hr' : ''}
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

                {/* Skills Tags */}
                {requisition.skills_tags && requisition.skills_tags.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {requisition.skills_tags.map(skill => (
                        <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(requisition.description || requisition.requirements || requisition.responsibilities) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                  {requisition.description && (
                    <>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Description</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requisition.description}</p>
                    </>
                  )}
                  {requisition.requirements && (
                    <>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Requirements</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requisition.requirements}</p>
                    </>
                  )}
                  {requisition.responsibilities && (
                    <>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Responsibilities</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requisition.responsibilities}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Postings */}
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
              {(!requisition.postings || requisition.postings.length === 0) ? (
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

          {/* Applications */}
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
              {requisition.visibility_user_ids && requisition.visibility_user_ids.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">{requisition.visibility_user_ids.length} additional stakeholders</span>
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

          {/* Compliance Tips */}
          <ComplianceTipsPanel />
        </div>
      </div>

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

// --- Create Posting Modal ---

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
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Cancel
          </button>
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
