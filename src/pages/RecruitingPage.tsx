import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase, Users, FileText, TrendingUp, Plus, Eye, Clock, BookOpen, FileSignature, ChevronDown, LayoutTemplate, ShieldCheck, Link2, CheckCircle, XCircle, UserPlus
} from 'lucide-react';

const BASE_URL = '';

interface DashboardData {
  open_requisitions: number;
  active_postings: number;
  total_applications: number;
  new_applications: number;
  applications_by_status: Record<string, number>;
  recent_requisitions: {
    id: number;
    requisition_id: string;
    title: string;
    department: string | null;
    status: string;
    application_count: number;
    created_at: string | null;
  }[];
}

interface TeamRequest {
  id: number;
  team_name: string;
  position_title: string | null;
  status: string;
  requested_by: string | null;
  review_notes: string | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export default function RecruitingPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
  const [teamRequestsLoading, setTeamRequestsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const teamRequestsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
    loadTeamRequests();
  }, []);

  // Auto-scroll to team requests section if tab=team-requests
  useEffect(() => {
    if (searchParams.get('tab') === 'team-requests' && teamRequestsRef.current) {
      teamRequestsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams, teamRequests]);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/dashboard`, { credentials: 'include' });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to load recruiting dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamRequests = async () => {
    setTeamRequestsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/team-requests?status=Pending`, { credentials: 'include' });
      if (res.ok) {
        const result = await res.json();
        setTeamRequests(result.team_requests || []);
      }
    } catch (error) {
      console.error('Failed to load team requests:', error);
    } finally {
      setTeamRequestsLoading(false);
    }
  };

  const handleTeamRequestAction = async (id: number, action: 'approve' | 'deny') => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/team-requests/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setTeamRequests(prev => prev.filter(tr => tr.id !== id));
      }
    } catch (error) {
      console.error(`Failed to ${action} team request:`, error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Open Requisitions', value: data?.open_requisitions ?? 0, icon: Briefcase, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', link: '/recruiting/requisitions?status=Open,Approved' },
    { label: 'Active Postings', value: data?.active_postings ?? 0, icon: Eye, color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    { label: 'Total Applications', value: data?.total_applications ?? 0, icon: FileText, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'New Applications', value: data?.new_applications ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  const statusColors: Record<string, string> = {
    // Application statuses (for pipeline overview)
    New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    Screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    Interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    Offer: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    Hired: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    Withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    // Requisition statuses
    Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    Open: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'On Hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    Filled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recruiting</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage job requisitions, postings, and applications</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTemplatesMenu(prev => !prev)}
              onBlur={() => setTimeout(() => setShowTemplatesMenu(false), 150)}
              className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LayoutTemplate className="w-4 h-4" />
              Templates
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showTemplatesMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => { navigate('/recruiting/pipelines'); setShowTemplatesMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  <Users className="w-4 h-4 text-indigo-500" />
                  Pipeline Templates
                </button>
                <button
                  onClick={() => { navigate('/recruiting/offer-letter-templates'); setShowTemplatesMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileSignature className="w-4 h-4 text-amber-500" />
                  Offer Letter Templates
                </button>
                <button
                  onClick={() => { navigate('/recruiting/integrations'); setShowTemplatesMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
                >
                  <Link2 className="w-4 h-4 text-teal-500" />
                  Integrations
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/recruiting/requisitions')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Requisition
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Wrapper = card.link ? 'button' : 'div';
          return (
            <Wrapper
              key={card.label}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-left${card.link ? ' cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' : ''}`}
              {...(card.link ? { onClick: () => navigate(card.link!) } : {})}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Pipeline Overview */}
      {data?.applications_by_status && Object.keys(data.applications_by_status).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline Overview</h2>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(data.applications_by_status).map(([status, count]) => (
              <div key={status} className={`px-3 py-2 rounded-lg text-sm font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                {status}: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Team Requests */}
      {teamRequests.length > 0 && (
        <div ref={teamRequestsRef} className="bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700/50">
          <div className="p-4 border-b border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 rounded-t-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Team Requests</h2>
            <span className="ml-auto text-sm text-amber-600 dark:text-amber-400 font-medium">{teamRequests.length} pending</span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {teamRequests.map(tr => (
              <div key={tr.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">"{tr.team_name}"</p>
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {tr.requested_by && <span>Requested by {tr.requested_by}</span>}
                    {tr.position_title && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span>for {tr.position_title}</span>
                      </>
                    )}
                    {tr.created_at && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span>{new Date(tr.created_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTeamRequestAction(tr.id, 'approve')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleTeamRequestAction(tr.id, 'deny')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Requisitions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Requisitions</h2>
          <button
            onClick={() => navigate('/recruiting/requisitions')}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View All Requisitions
          </button>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {data?.recent_requisitions?.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No requisitions yet. Click "New Requisition" to get started.
            </div>
          )}
          {data?.recent_requisitions?.map(req => (
            <div
              key={req.id}
              onClick={() => navigate(`/recruiting/requisitions/${req.id}`)}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{req.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{req.requisition_id}</span>
                  {req.department && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{req.department}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {req.application_count} applicant{req.application_count !== 1 ? 's' : ''}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[req.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {req.status}
                </span>
                {req.created_at && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          onClick={() => navigate('/recruiting/requisitions')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
        >
          <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Requisitions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage open positions</p>
        </button>
        <button
          onClick={() => navigate('/recruiting/job-descriptions')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
        >
          <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Job Descriptions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage the JD library</p>
        </button>
        <button
          onClick={() => navigate('/recruiting/offers')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
        >
          <FileSignature className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Offers</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all offers</p>
        </button>
        <button
          onClick={() => navigate('/screening')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Background Screening</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">TazWorks background checks</p>
        </button>
        <a
          href="http://localhost:5175/jobs"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors block cursor-pointer"
        >
          <Eye className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Applicant Portal</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Preview the public job board</p>
        </a>
        <button
          onClick={() => navigate('/recruiting/analytics')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
        >
          <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Analytics</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Recruiting metrics & EEO</p>
        </button>
      </div>
    </div>
  );
}
