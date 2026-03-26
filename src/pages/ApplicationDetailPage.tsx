import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Star, Mail, Phone, Linkedin, Globe, Building,
  MapPin, Clock, FileText, MessageSquare, Calendar, ClipboardList,
  XCircle, ChevronRight, ExternalLink, Plus, CalendarCheck, Link2,
  Video, Users, Check, FileSignature
} from 'lucide-react';
import ResumeAnalysisPanel from '../components/recruiting/ResumeAnalysisPanel';
import UserSearchSelect from '../components/UserSearchSelect';
import AvailabilityGrid from '../components/AvailabilityGrid';

const BASE_URL = '';

interface StageCompletion {
  stage_id: number;
  scorecards_total: number;
  scorecards_submitted: number;
  scorecards_complete: boolean;
  interviews_total: number;
  interviews_completed: number;
  interviews_complete: boolean;
  all_complete: boolean;
}

interface PipelineStageInfo {
  id: number;
  name: string;
  stage_type: string;
  order_index: number;
  is_required: boolean;
  scorecard_template: Record<string, unknown> | null;
  days_sla: number | null;
  lifecycle_stage_key: string | null;
  completion: StageCompletion;
}

interface ApplicationDetail {
  id: number;
  application_id: string;
  status: string;
  applicant: {
    id: number;
    applicant_id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    linkedin_url: string | null;
    portfolio_url: string | null;
    current_employer: string | null;
    current_title: string | null;
    years_of_experience: number | null;
    is_internal: boolean;
    source: string;
  };
  requisition: {
    id: number;
    requisition_id: string;
    title: string;
    department: string | null;
    location: string | null;
  } | null;
  posting: {
    id: number;
    title: string;
    channel: string;
  } | null;
  current_stage: {
    id: number;
    name: string;
    stage_type: string;
  } | null;
  pipeline_stages: PipelineStageInfo[];
  cover_letter: string | null;
  source: string | null;
  overall_rating: number | null;
  is_favorite: boolean;
  is_internal_transfer: boolean;
  rejection_reason: string | null;
  rejection_notes: string | null;
  disposition_stage_id: number | null;
  disposition_stage: { id: number; name: string } | null;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
  submitted_at: string | null;
  created_at: string | null;
  activities: {
    id: number;
    activity_type: string;
    description: string;
    is_internal: boolean;
    created_at: string | null;
    performed_by: string | null;
  }[];
  scorecards: {
    id: number;
    stage: { id: number; name: string } | null;
    interviewer: { id: number; name: string } | null;
    overall_rating: number | null;
    recommendation: string | null;
    strengths: string | null;
    concerns: string | null;
    status: string;
    submitted_at: string | null;
  }[];
  interviews: {
    id: number;
    interview_id: string;
    stage: { id: number; name: string } | null;
    scheduled_at: string | null;
    duration_minutes: number;
    format: string;
    location: string | null;
    video_link: string | null;
    interviewers: { user_id: number; name: string; role: string }[] | null;
    status: string;
    calendar_event_id: string | null;
    calendar_provider: string | null;
    meeting_link_auto: boolean;
    ics_sent: boolean;
  }[];
  hiring_team: { user_id: number; full_name: string; email: string; role: string }[];
  stage_history: {
    id: number;
    stage: { id: number; name: string } | null;
    entered_at: string | null;
    exited_at: string | null;
    outcome: string | null;
    moved_by: string | null;
    notes: string | null;
  }[];
}

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Offer: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Hired: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const recommendationColors: Record<string, string> = {
  'Strong Hire': 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30',
  'Hire': 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/30',
  'Lean Hire': 'text-yellow-700 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-900/30',
  'Lean No Hire': 'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/30',
  'No Hire': 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30',
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'timeline' | 'scorecards' | 'interviews'>('profile');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  // Inline interview scheduling state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [timeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [interviewers, setInterviewers] = useState<{ user_id: number; name: string; email: string; role: string }[]>([]);
  const [autoCreateScorecard, setAutoCreateScorecard] = useState(true);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => { loadApplication(); }, [id]);

  const loadApplication = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${id}`, { credentials: 'include' });
      if (res.ok) setApp(await res.json());
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-populate interviewers from hiring team
  useEffect(() => {
    if (app?.hiring_team && app.hiring_team.length > 0 && interviewers.length === 0) {
      setInterviewers(
        app.hiring_team.map((member, idx) => ({
          user_id: member.user_id,
          name: member.full_name,
          email: member.email,
          role: idx === 0 ? 'lead' : 'interviewer',
        }))
      );
    }
  }, [app?.hiring_team]);

  // Check calendar connection
  useEffect(() => {
    const checkCalendar = async () => {
      try {
        const res = await fetch(`${BASE_URL}/calendar/connection`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setCalendarConnected(data.connected);
        }
      } catch { /* ignore */ }
    };
    checkCalendar();
  }, []);

  // Existing offer for this application
  const [existingOffer, setExistingOffer] = useState<{
    id: number; offer_id: string; status: string; position_title: string;
    salary: number | null; start_date: string | null; sent_at: string | null;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOffer = async () => {
      try {
        const res = await fetch(`${BASE_URL}/recruiting/offers?application_id=${id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.offers && data.offers.length > 0) {
            const o = data.offers[0];
            setExistingOffer({ id: o.id, offer_id: o.offer_id, status: o.status, position_title: o.position_title, salary: o.salary, start_date: o.sent_at, sent_at: o.sent_at });
          }
        }
      } catch { /* ignore */ }
    };
    fetchOffer();
  }, [id]);

  const handleScheduleInterview = async () => {
    if (!scheduledDate || !scheduledTime) return;
    setScheduleSubmitting(true);
    setScheduleError('');

    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    const stageId = app?.current_stage?.id || app?.pipeline_stages?.[0]?.id || null;

    try {
      const res = await fetch(`${BASE_URL}/recruiting/interviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: Number(id),
          stage_id: stageId,
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          time_zone: timeZone,
          format: 'Video',
          interviewers: interviewers.length > 0
            ? interviewers.map(i => ({ user_id: i.user_id, name: i.name, role: i.role }))
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to schedule interview');
      }

      if (autoCreateScorecard && interviewers.length > 0) {
        for (const int of interviewers) {
          if (int.user_id > 0) {
            await fetch(`${BASE_URL}/recruiting/scorecards`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                application_id: Number(id),
                stage_id: stageId,
                interviewer_id: int.user_id,
              }),
            });
          }
        }
      }

      setScheduleSuccess(true);
      setScheduledDate('');
      setScheduledTime('');
      setDuration(60);
      loadApplication();
      setTimeout(() => setScheduleSuccess(false), 3000);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const advanceStage = async (stageId: number) => {
    // If advancing to an offer-type stage, redirect to offer builder
    // The pipeline will be advanced automatically when the offer is sent
    const targetStage = app?.pipeline_stages.find(s => s.id === stageId);
    if (targetStage?.stage_type === 'offer') {
      navigate(`/recruiting/offers/new?applicationId=${id}`);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${id}/stage`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId }),
      });
      if (res.ok) loadApplication();
    } catch (error) {
      console.error('Stage advance failed:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${id}/favorite`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) loadApplication();
    } catch (error) {
      console.error('Toggle favorite failed:', error);
    }
  };

  const createScorecard = async () => {
    // Use current stage, or first pipeline stage if available
    const stageId = app?.current_stage?.id || app?.pipeline_stages?.[0]?.id || null;
    try {
      const res = await fetch(`${BASE_URL}/recruiting/scorecards`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: Number(id),
          stage_id: stageId,
          interviewer_id: 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/recruiting/scorecards/${data.id}`);
      } else {
        loadApplication();
      }
    } catch (error) {
      console.error('Failed to create scorecard:', error);
    }
  };

  const rejectApp = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${id}/reject`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason, notes: rejectNotes }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        loadApplication();
      }
    } catch (error) {
      console.error('Reject failed:', error);
    }
  };

  const withdrawApp = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${id}/withdraw`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason, notes: withdrawNotes }),
      });
      if (res.ok) {
        setShowWithdrawModal(false);
        loadApplication();
      }
    } catch (error) {
      console.error('Withdraw failed:', error);
    }
  };

  // Stage-specific rejection reasons
  const getStageReasons = (): string[] => {
    const stageType = app?.current_stage?.stage_type || '';
    const stageReasons: Record<string, string[]> = {
      application_review: ['Not Qualified', 'Incomplete Application', 'Position Filled', 'Duplicate Application'],
      interview: ['Failed Interview', 'Communication Concerns', 'Culture Fit', 'No Show', 'Salary Mismatch'],
      assessment: ['Did Not Pass Assessment', 'Insufficient Score', 'Incomplete Assessment'],
      offer: ['Declined Offer', 'Salary Negotiation Failed', 'Position Rescinded'],
      offer_accepted: ['Background Check Failed', 'Failed to Start'],
    };
    return stageReasons[stageType] || ['Not Qualified', 'Position Filled', 'Other'];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Application not found.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 dark:text-blue-400 mt-2">Go back</button>
      </div>
    );
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: FileText },
    { key: 'timeline' as const, label: 'Timeline', icon: Clock },
    { key: 'scorecards' as const, label: `Scorecards (${app.scorecards.length})`, icon: ClipboardList },
    { key: 'interviews' as const, label: `Interviews (${app.interviews.length})`, icon: Calendar },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <button onClick={() => navigate(app.requisition ? `/recruiting/requisitions/${app.requisition.id}` : '/recruiting')} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{app.applicant.name}</h1>
            <button onClick={toggleFavorite} className={app.is_favorite ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'}>
              <Star className="w-5 h-5" fill={app.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[app.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
              {app.status}
            </span>
            {app.is_internal_transfer && (
              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">Internal Transfer</span>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {app.requisition?.title} {app.requisition?.department && `- ${app.requisition.department}`}
          </p>
        </div>
        <div className="flex gap-2">
          {app.status !== 'Rejected' && app.status !== 'Hired' && app.status !== 'Withdrawn' && (
            <>
              {existingOffer ? (
                <button
                  onClick={() => navigate(`/recruiting/offers/${existingOffer.id}`)}
                  className="flex items-center gap-1 px-3 py-2 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-lg text-sm hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <FileSignature className="w-4 h-4" /> View Offer
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/recruiting/offers/new?applicationId=${app.id}`)}
                  className="flex items-center gap-1 px-3 py-2 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-lg text-sm hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <FileSignature className="w-4 h-4" /> Create Offer
                </button>
              )}
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex items-center gap-1 px-3 py-2 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-lg text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <XCircle className="w-4 h-4" /> Withdraw
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-1 px-3 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pipeline Progress */}
      {app.pipeline_stages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Pipeline Progress</h3>
          <div className="flex items-center gap-1 overflow-x-auto">
            {app.pipeline_stages.map((stage, idx) => {
              const isCurrent = app.current_stage?.id === stage.id;
              const isPast = app.stage_history.some(h => h.stage?.id === stage.id && h.exited_at);
              const isDisposition = app.disposition_stage_id === stage.id;
              const isRejected = isDisposition && app.status === 'Rejected';
              const isWithdrawn = isDisposition && app.status === 'Withdrawn';
              const dispositionIdx = app.disposition_stage_id
                ? app.pipeline_stages.findIndex(s => s.id === app.disposition_stage_id)
                : -1;
              const isAfterDisposition = dispositionIdx >= 0 && idx > dispositionIdx;
              const isTerminal = app.status === 'Rejected' || app.status === 'Withdrawn';
              const isNext = !isTerminal && !isCurrent && !isPast && app.pipeline_stages.findIndex(s => s.id === app.current_stage?.id) < idx;

              return (
                <div key={stage.id} className="flex items-center">
                  {idx > 0 && (
                    <div className={`w-6 h-0.5 ${
                      isRejected ? 'bg-red-300 dark:bg-red-700' :
                      isWithdrawn ? 'bg-amber-300 dark:bg-amber-700' :
                      isAfterDisposition ? 'bg-gray-200 dark:bg-gray-700' :
                      isPast ? 'bg-green-400' :
                      isCurrent ? 'bg-blue-400' :
                      'bg-gray-200 dark:bg-gray-600'
                    }`} />
                  )}
                  <button
                    onClick={() => isNext && advanceStage(stage.id)}
                    disabled={!isNext}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      isRejected
                        ? 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300'
                        : isWithdrawn
                        ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300'
                        : isAfterDisposition
                        ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500'
                        : isCurrent
                        ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                        : isPast
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                        : isNext
                        ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 cursor-pointer'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-400'
                    }`}
                    title={
                      isRejected ? `Rejected: ${app.rejection_reason || 'No reason given'}` :
                      isWithdrawn ? `Withdrawn: ${app.withdrawn_reason || 'No reason given'}` :
                      isNext ? `Advance to ${stage.name}` : undefined
                    }
                  >
                    {(isRejected || isWithdrawn) && <XCircle className="w-3 h-3 inline mr-1" />}
                    {stage.name}
                    {isNext && <ChevronRight className="w-3 h-3 inline ml-1" />}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Disposition banner */}
          {(app.status === 'Rejected' || app.status === 'Withdrawn') && app.disposition_stage && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
              app.status === 'Rejected'
                ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                : 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
            }`}>
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {app.status === 'Rejected' ? 'Rejected' : 'Withdrawn'} at <strong>{app.disposition_stage.name}</strong>
                {app.status === 'Rejected' && app.rejection_reason ? `: ${app.rejection_reason}` : ''}
                {app.status === 'Withdrawn' && app.withdrawn_reason ? `: ${app.withdrawn_reason}` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Contact Info Quick Bar */}
      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
        {app.applicant.email && (
          <a href={`mailto:${app.applicant.email}`} className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
            <Mail className="w-3.5 h-3.5" /> {app.applicant.email}
          </a>
        )}
        {app.applicant.phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> {app.applicant.phone}
          </span>
        )}
        {app.applicant.linkedin_url && (
          <a href={app.applicant.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn
          </a>
        )}
        {app.applicant.portfolio_url && (
          <a href={app.applicant.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
            <Globe className="w-3.5 h-3.5" /> Portfolio
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* AI Resume Analysis — full width above profile grid */}
          <ResumeAnalysisPanel applicationId={app.id} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Applicant Profile</h3>
            <div className="space-y-2 text-sm">
              {app.applicant.current_title && (
                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {app.applicant.current_title}{app.applicant.current_employer && ` at ${app.applicant.current_employer}`}
                </p>
              )}
              {app.applicant.years_of_experience != null && (
                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {app.applicant.years_of_experience} years experience
                </p>
              )}
              {app.requisition?.location && (
                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Applied for: {app.requisition.location}
                </p>
              )}
              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                Source: {app.source || app.applicant.source || 'Unknown'}
              </p>
            </div>
          </div>

          {app.cover_letter && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cover Letter</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{app.cover_letter}</p>
            </div>
          )}

          {app.overall_rating && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Overall Rating</h3>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{app.overall_rating.toFixed(1)}</span>
                <span className="text-gray-400 dark:text-gray-500">/5.0</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average across {app.scorecards.filter(s => s.status === 'Submitted').length} scorecard(s)</p>
            </div>
          )}

          {existingOffer && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-green-600 dark:text-green-400" />
                Offer Letter
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    existingOffer.status === 'Accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                    existingOffer.status === 'Sent' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                    existingOffer.status === 'Approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                    existingOffer.status === 'Declined' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {existingOffer.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Position</span>
                  <span className="text-gray-700 dark:text-gray-300">{existingOffer.position_title}</span>
                </div>
                {existingOffer.salary && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Salary</span>
                    <span className="text-gray-700 dark:text-gray-300">${existingOffer.salary.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/recruiting/offers/${existingOffer.id}`)}
                className="mt-3 w-full text-center text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
              >
                Open Offer →
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>
          {app.activities.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {app.activities.map(act => (
                <div key={act.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{act.description}</p>
                    <div className="flex gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {act.performed_by && <span>{act.performed_by}</span>}
                      {act.created_at && <span>{new Date(act.created_at).toLocaleString()}</span>}
                      {act.is_internal && <span className="text-amber-500">Internal</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scorecards' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={createScorecard}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Scorecard
            </button>
          </div>
          {app.scorecards.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No scorecards assigned yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "Add Scorecard" to create one for the current stage.</p>
            </div>
          ) : (
            app.scorecards.map(sc => (
              <div
                key={sc.id}
                onClick={() => navigate(`/recruiting/scorecards/${sc.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{sc.stage?.name || 'Scorecard'}</span>
                      {sc.interviewer?.name && <span className="text-xs text-gray-400 dark:text-gray-500">- {sc.interviewer.name}</span>}
                    </div>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                      sc.status === 'Submitted' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                      sc.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {sc.status}
                    </span>
                  </div>
                  {sc.overall_rating && (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{sc.overall_rating.toFixed(1)}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">/5</span>
                    </div>
                  )}
                </div>
                {sc.recommendation && (
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded font-medium ${recommendationColors[sc.recommendation] || 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {sc.recommendation}
                  </span>
                )}
                {sc.strengths && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2"><strong>Strengths:</strong> {sc.strengths}</p>}
                {sc.concerns && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1"><strong>Concerns:</strong> {sc.concerns}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'interviews' && (
        <div className="space-y-6">
          {/* Two-column scheduling layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 1/3: Compact Scheduling Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Schedule Interview
                </h3>

                {scheduleError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                    {scheduleError}
                  </div>
                )}

                {scheduleSuccess && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Check className="w-4 h-4" /> Interview scheduled successfully!
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time *</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                {/* Format badge — hardcoded Video/Teams */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">Microsoft Teams (auto-generated)</span>
                </div>

                {/* Interviewers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Interviewers
                  </label>
                  <UserSearchSelect
                    selected={interviewers}
                    onChange={setInterviewers}
                    placeholder="Add or remove interviewers..."
                  />
                </div>

                {/* Auto-create scorecards */}
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={autoCreateScorecard}
                    onChange={e => setAutoCreateScorecard(e.target.checked)}
                    className="rounded"
                  />
                  Auto-create scorecards
                </label>

                {/* Submit */}
                <button
                  onClick={handleScheduleInterview}
                  disabled={scheduleSubmitting || !scheduledDate || !scheduledTime}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  {scheduleSubmitting ? 'Scheduling...' : 'Schedule Interview'}
                </button>
              </div>
            </div>

            {/* Right 2/3: Availability Grid */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Team Availability
                  {scheduledDate && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      — {new Date(scheduledDate + 'T00:00').toLocaleDateString(undefined, {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </span>
                  )}
                </h3>

                {!scheduledDate ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select a date to view team availability</p>
                  </div>
                ) : interviewers.filter(i => i.email).length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add interviewers to view their availability</p>
                  </div>
                ) : !calendarConnected ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Connect your calendar in Settings to view availability</p>
                  </div>
                ) : (
                  <AvailabilityGrid
                    emails={interviewers.filter(i => i.email).map(i => i.email)}
                    names={interviewers.filter(i => i.email).map(i => i.name)}
                    date={scheduledDate}
                    timeZone={timeZone}
                    onSlotClick={(time) => setScheduledTime(time)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Existing Interviews */}
          {app.interviews.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Scheduled Interviews</h3>
              {app.interviews.map(iv => (
                <div key={iv.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{iv.stage?.name || 'Interview'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          iv.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                          iv.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          iv.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                        }`}>
                          {iv.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {iv.scheduled_at && new Date(iv.scheduled_at).toLocaleString()}
                        {iv.duration_minutes && ` (${iv.duration_minutes} min)`}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{iv.format}</span>
                    </div>
                  </div>
                  {iv.video_link && (
                    <a href={iv.video_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mt-2 hover:text-blue-800 dark:hover:text-blue-300">
                      <ExternalLink className="w-3.5 h-3.5" /> Join Video
                      {iv.meeting_link_auto && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(auto-generated)</span>
                      )}
                    </a>
                  )}
                  {iv.interviewers && iv.interviewers.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {iv.interviewers.map((int, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {int.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {(iv.calendar_event_id || iv.ics_sent) && (
                    <div className="mt-2 flex gap-2">
                      {iv.calendar_event_id && (
                        <span className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                          <CalendarCheck className="w-3 h-3" />
                          {iv.calendar_provider === 'microsoft' ? 'Outlook' : iv.calendar_provider === 'google' ? 'Google' : 'Calendar'} synced
                        </span>
                      )}
                      {iv.ics_sent && (
                        <span className="flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                          <Mail className="w-3 h-3" />
                          .ics sent
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Application</h2>
            {app.current_stage && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current stage: <strong>{app.current_stage.name}</strong>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <select
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select reason...</option>
                {getStageReasons().map(reason => (
                  <option key={reason}>{reason}</option>
                ))}
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={rejectApp} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Withdraw Application</h2>
            {app.current_stage && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current stage: <strong>{app.current_stage.name}</strong>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <select
                value={withdrawReason}
                onChange={e => setWithdrawReason(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select reason...</option>
                <option>Accepted Another Offer</option>
                <option>No Longer Interested</option>
                <option>Relocation</option>
                <option>Personal Reasons</option>
                <option>Salary Expectations</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
              <textarea
                value={withdrawNotes}
                onChange={e => setWithdrawNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowWithdrawModal(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={withdrawApp} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Withdraw Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
