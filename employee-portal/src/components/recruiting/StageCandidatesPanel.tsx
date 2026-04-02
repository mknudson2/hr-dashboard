import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPatch, apiPost } from '@/utils/api';
import { API_URL } from '@/config/api';
import {
  Users, ChevronDown, ChevronUp, Star, FileText, Download, Video, Phone,
  MapPin, CheckCircle, Clock, AlertCircle, ClipboardList, ExternalLink,
  User, Briefcase, ArrowRight, Eye,
} from 'lucide-react';
import ScorecardDrawer from './scorecard/ScorecardDrawer';

// --- Types ---

interface CandidateApplicant {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  current_title: string | null;
  current_employer: string | null;
  is_internal: boolean;
}

interface CandidateResumeAnalysis {
  overall_score: number | null;
  threshold_label: string | null;
  status: string;
}

interface CandidateInterview {
  id: number;
  interview_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  format: string;
  status: string;
  interviewers: { user_id: number; name: string; role: string }[] | null;
  video_link: string | null;
  stage_name: string | null;
}

interface CandidateScorecard {
  id: number;
  interviewer_name: string | null;
  interviewer_id: number;
  overall_rating: number | null;
  recommendation: string | null;
  status: string;
  submitted_at: string | null;
  stage_name: string | null;
}

interface CandidateDocument {
  id: number | null;
  document_type: string;
  label: string | null;
  file_upload_id: number | null;
  uploaded_at: string | null;
}

interface Candidate {
  application_id: number;
  application_id_str: string;
  status: string;
  applicant: CandidateApplicant;
  current_stage: { id: number; name: string } | null;
  overall_rating: number | null;
  is_favorite: boolean;
  resume_analysis: CandidateResumeAnalysis | null;
  interviews: CandidateInterview[];
  scorecards: CandidateScorecard[];
  documents: CandidateDocument[];
}

interface StageSummary {
  total_candidates: number;
  active_candidates: number;
  interviews_completed: number;
  interviews_total: number;
  scorecards_submitted: number;
  scorecards_total: number;
  all_complete: boolean;
}

interface CandidatesResponse {
  candidates: Candidate[];
  stage_summary: StageSummary;
}

// --- Props ---

interface StageCandidatesPanelProps {
  requisitionId: number;
  stageKey: string;
  stageId: number;
  stageLabel: string;
  onStageAdvanced: () => void;
}

// --- Helpers ---

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Offer: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Hired: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const interviewStatusColors: Record<string, string> = {
  Scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'No Show': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const scorecardStatusColors: Record<string, string> = {
  Pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Submitted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const recommendationColors: Record<string, string> = {
  'Strong Hire': 'text-green-700 dark:text-green-400',
  'Hire': 'text-green-600 dark:text-green-400',
  'Strong Advance': 'text-green-700 dark:text-green-400',
  'Advance': 'text-green-600 dark:text-green-400',
  'Lean Hire': 'text-yellow-600 dark:text-yellow-400',
  'Hold / Discuss': 'text-yellow-600 dark:text-yellow-400',
  'Lean No Hire': 'text-orange-600 dark:text-orange-400',
  'No Hire': 'text-red-600 dark:text-red-400',
  'Do Not Advance': 'text-red-600 dark:text-red-400',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatIcon(format: string) {
  if (format === 'Video') return <Video className="w-3.5 h-3.5" />;
  if (format === 'Phone') return <Phone className="w-3.5 h-3.5" />;
  return <MapPin className="w-3.5 h-3.5" />;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 75) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-200 dark:bg-gray-700';
  if (score >= 75) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

// --- Component ---

export default function StageCandidatesPanel({
  requisitionId, stageKey, stageId, stageLabel, onStageAdvanced,
}: StageCandidatesPanelProps) {
  const { user } = useAuth();
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const [viewScorecardId, setViewScorecardId] = useState<number | null>(null);

  useEffect(() => { loadCandidates(); }, [requisitionId, stageKey]);

  const loadCandidates = async () => {
    try {
      setError('');
      const resp = await apiGet<CandidatesResponse>(
        `/portal/hiring-manager/requisitions/${requisitionId}/candidates?stage_key=${stageKey}`
      );
      setData(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (appId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const markInterviewComplete = async (interviewId: number) => {
    setActionLoading(interviewId);
    try {
      await apiPatch(`/portal/hiring-manager/interviews/${interviewId}/complete`);
      await loadCandidates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark complete');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdvanceStage = async () => {
    setAdvancing(true);
    try {
      await apiPost(`/portal/hiring-manager/requisitions/${requisitionId}/complete-stage`, {
        stage_id: stageId,
        notes: advanceNotes || undefined,
      });
      setShowAdvanceModal(false);
      onStageAdvanced();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to advance stage');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data || data.candidates.length === 0) {
    return (
      <div className="py-6 text-center">
        <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No candidates for this requisition yet.</p>
      </div>
    );
  }

  const { candidates, stage_summary: summary } = data;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Users className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Candidates</h3>
        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
          {summary.total_candidates}
        </span>
      </div>

      {/* Summary Bar */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-500" />
          <span className="text-gray-600 dark:text-gray-300">
            Interviews: <span className="font-medium text-gray-900 dark:text-white">{summary.interviews_completed}/{summary.interviews_total}</span>
          </span>
          {summary.interviews_total > 0 && (
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(summary.interviews_completed / summary.interviews_total) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-purple-500" />
          <span className="text-gray-600 dark:text-gray-300">
            Scorecards: <span className="font-medium text-gray-900 dark:text-white">{summary.scorecards_submitted}/{summary.scorecards_total}</span>
          </span>
          {summary.scorecards_total > 0 && (
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${(summary.scorecards_submitted / summary.scorecards_total) * 100}%` }}
              />
            </div>
          )}
        </div>
        {summary.all_complete && (
          <span className="ml-auto flex items-center gap-1 text-green-700 dark:text-green-400 font-medium text-xs bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> Ready to Advance
          </span>
        )}
      </div>

      {/* Candidate Cards */}
      <div className="space-y-2">
        {candidates.map(c => (
          <CandidateCard
            key={c.application_id}
            candidate={c}
            expanded={expandedIds.has(c.application_id)}
            onToggle={() => toggleExpand(c.application_id)}
            currentUserId={user?.id ?? 0}
            onMarkComplete={markInterviewComplete}
            actionLoading={actionLoading}
            onViewScorecard={setViewScorecardId}
          />
        ))}
      </div>

      {/* Advance Stage */}
      {summary.all_complete && (
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            Complete {stageLabel} & Advance <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdvanceModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Complete {stageLabel}?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              All interviews and scorecards are complete. This will mark the stage as finished and advance the hiring process.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
              <textarea
                value={advanceNotes}
                onChange={e => setAdvanceNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 h-20 resize-none"
                placeholder="Any notes about this stage completion..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdvanceStage}
                disabled={advancing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {advancing ? 'Advancing...' : 'Complete & Advance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard Drawer */}
      <ScorecardDrawer
        scorecardId={viewScorecardId}
        onClose={() => setViewScorecardId(null)}
      />
    </div>
  );
}

// --- Candidate Card ---

function CandidateCard({
  candidate: c,
  expanded,
  onToggle,
  currentUserId,
  onMarkComplete,
  actionLoading,
  onViewScorecard,
}: {
  candidate: Candidate;
  expanded: boolean;
  onToggle: () => void;
  currentUserId: number;
  onMarkComplete: (id: number) => void;
  actionLoading: number | null;
  onViewScorecard: (id: number) => void;
}) {
  const ra = c.resume_analysis;
  const raScore = ra?.status?.toLowerCase() === 'completed' ? ra.overall_score : null;

  // Summary: pick first interview status and first scorecard status
  const ivSummary = c.interviews.length > 0
    ? c.interviews.every(iv => iv.status === 'Completed') ? 'Completed'
      : c.interviews.some(iv => iv.status === 'Scheduled' || iv.status === 'Confirmed') ? 'Scheduled'
      : c.interviews[0].status
    : 'None';

  const topScorecard = c.scorecards.find(sc => sc.status === 'Submitted');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Collapsed Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.applicant.name}</span>
            {c.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />}
            {c.applicant.is_internal && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">Internal</span>
            )}
            {c.status === 'Withdrawn' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors.Withdrawn}`}>Withdrawn</span>
            )}
          </div>
          {c.applicant.current_title && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.applicant.current_title}{c.applicant.current_employer ? ` at ${c.applicant.current_employer}` : ''}</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {raScore !== null && (
            <span className={`text-xs font-medium ${scoreColor(raScore)}`} title="Resume Score">
              {Math.round(raScore)}
            </span>
          )}
          {ivSummary !== 'None' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${interviewStatusColors[ivSummary] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {ivSummary}
            </span>
          )}
          {topScorecard && (
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {topScorecard.overall_rating?.toFixed(1)}/5
            </span>
          )}
          {topScorecard?.recommendation && (
            <span className={`text-[10px] font-medium ${recommendationColors[topScorecard.recommendation] || 'text-gray-500'}`}>
              {topScorecard.recommendation}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
          {/* Interviews */}
          {c.interviews.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Interviews</h4>
              <div className="space-y-2">
                {c.interviews.map(iv => (
                  <div key={iv.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {formatIcon(iv.format)}
                        <span className="text-sm text-gray-900 dark:text-white font-medium">{iv.format}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{iv.duration_minutes} min</span>
                        {iv.stage_name && (
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{iv.stage_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${interviewStatusColors[iv.status] || ''}`}>
                          {iv.status}
                        </span>
                        {(iv.status === 'Scheduled' || iv.status === 'Confirmed') && (
                          <button
                            onClick={() => onMarkComplete(iv.id)}
                            disabled={actionLoading === iv.id}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/60 disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {actionLoading === iv.id ? 'Saving...' : 'Mark Complete'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span><Clock className="w-3 h-3 inline mr-0.5" />{formatDateTime(iv.scheduled_at)}</span>
                      {iv.interviewers && iv.interviewers.length > 0 && (
                        <span>{iv.interviewers.map(i => i.name).join(', ')}</span>
                      )}
                    </div>
                    {iv.video_link && iv.status !== 'Completed' && iv.status !== 'Cancelled' && (
                      <a href={iv.video_link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Join Meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.interviews.length === 0 && (
            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> No interviews scheduled for this stage
            </div>
          )}

          {/* Scorecards */}
          {(c.scorecards.length > 0 || (ra && ra.status === 'completed' && raScore !== null)) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Scorecards</h4>
              <div className="space-y-2">
                {/* AI Resume Analysis */}
                {ra && ra.status === 'completed' && raScore !== null && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm text-gray-900 dark:text-white">AI Resume Analysis</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          AI
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${scoreColor(raScore)}`}>{Math.round(raScore)}/100</span>
                        {ra.threshold_label && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            ra.threshold_label === 'Promising' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                          }`}>
                            {ra.threshold_label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${scoreBgColor(raScore)}`} style={{ width: `${raScore}%` }} />
                    </div>
                  </div>
                )}
                {c.scorecards.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => onViewScorecard(sc.id)}
                    className="w-full text-left bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-sm text-gray-900 dark:text-white">{sc.interviewer_name || 'Unassigned'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${scorecardStatusColors[sc.status] || ''}`}>
                          {sc.status}
                        </span>
                        {sc.stage_name && (
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{sc.stage_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {sc.status === 'Submitted' && sc.overall_rating && (
                          <>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{sc.overall_rating.toFixed(1)}/5</span>
                            {sc.recommendation && (
                              <span className={`text-xs font-medium ${recommendationColors[sc.recommendation] || 'text-gray-500'}`}>
                                {sc.recommendation}
                              </span>
                            )}
                          </>
                        )}
                        {(sc.status === 'Pending' || sc.status === 'In Progress') && sc.interviewer_id === currentUserId && (
                          <a
                            href={`/recruiting/scorecards/${sc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/60 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Complete Scorecard
                          </a>
                        )}
                        {(sc.status === 'Pending' || sc.status === 'In Progress') && sc.interviewer_id !== currentUserId && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            Awaiting {sc.interviewer_name?.split(' ')[0]}&apos;s scorecard
                          </span>
                        )}
                        <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                      </div>
                    </div>
                    {sc.submitted_at && (
                      <p className="text-[10px] text-gray-400 mt-1">Submitted {formatDate(sc.submitted_at)}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {c.documents.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Documents</h4>
              <div className="space-y-1.5">
                {c.documents.map((doc, idx) => (
                  <div key={doc.file_upload_id || idx} className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{doc.label || doc.document_type}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{doc.document_type}</span>
                    </div>
                    {doc.file_upload_id && (
                      <a
                        href={`${API_URL}/portal/hiring-manager/applicant-documents/${doc.file_upload_id}/download`}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Rating */}
          {c.overall_rating && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Overall Rating:</span>
              <span className="font-bold text-gray-900 dark:text-white">{c.overall_rating.toFixed(1)}/5.0</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
