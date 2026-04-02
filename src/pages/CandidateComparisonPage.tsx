import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Star, Award, Briefcase, Clock, Brain, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp, Loader2, UserCheck, X,
} from 'lucide-react';

const BASE_URL = '';

interface ComparisonCandidate {
  id: number;
  application_id: string;
  applicant: {
    name: string;
    email: string;
    current_title: string | null;
    current_employer: string | null;
    years_of_experience: number | null;
  };
  status: string;
  overall_rating: number | null;
  scorecard_count: number;
  recommendation_counts: Record<string, number>;
  is_favorite: boolean;
  submitted_at: string | null;
  resume_analysis?: {
    overall_score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    threshold_label: string;
  } | null;
  scorecard_analysis?: {
    summary: string;
    overall_recommendation: string;
    confidence_level: string;
  } | null;
  scorecards?: {
    interviewer_name: string;
    overall_rating: number;
    recommendation: string;
    strengths: string;
    concerns: string;
  }[];
}

interface AIComparisonResult {
  ranked_candidates: {
    name: string;
    rank: number;
    fit_score: number;
    key_strengths: string[];
    key_concerns: string[];
  }[];
  comparative_analysis: string;
  recommendation: string;
}

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  Screening: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  Interview: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  Offer: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  Hired: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
  Rejected: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
};

const recommendationOrder = ['Strong Hire', 'Hire', 'Lean Hire', 'Lean No Hire', 'No Hire'];
const recColors: Record<string, string> = {
  'Strong Hire': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  'Hire': 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'Lean Hire': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  'Lean No Hire': 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'No Hire': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const aiRecColors: Record<string, string> = {
  'Strong Hire': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  'Hire': 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'Lean Hire': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  'Lean No Hire': 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'No Hire': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const confidenceColors: Record<string, string> = {
  High: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  Medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  Low: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
};

function ResumeScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">Resume Score</span>
        <span className="font-medium text-gray-900 dark:text-white">{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TruncatedText({ text, maxLength = 120 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLength) {
    return <p className="text-xs text-gray-600 dark:text-gray-400">{text}</p>;
  }
  return (
    <div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {expanded ? text : `${text.slice(0, maxLength)}...`}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 mt-0.5"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

export default function CandidateComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reqId } = useParams<{ reqId: string }>();

  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [requisitionTitle, setRequisitionTitle] = useState<string | null>(null);

  // AI comparison state
  const [aiComparing, setAiComparing] = useState(false);
  const [aiResult, setAiResult] = useState<AIComparisonResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Selection modal state
  const [selectionCandidate, setSelectionCandidate] = useState<ComparisonCandidate | null>(null);
  const [rejectOthers, setRejectOthers] = useState(true);
  const [rationale, setRationale] = useState('');
  const [selectionSubmitting, setSelectionSubmitting] = useState(false);
  const [selectionSuccess, setSelectionSuccess] = useState<string | null>(null);

  // Expandable scorecard state per candidate
  const [expandedScorecards, setExpandedScorecards] = useState<Record<number, boolean>>({});

  const ids = searchParams.get('ids') || '';
  const effectiveReqId = reqId || searchParams.get('requisitionId');

  useEffect(() => {
    if (effectiveReqId) {
      loadSelectionSummary(effectiveReqId);
    } else if (ids) {
      loadComparison();
    } else {
      setLoading(false);
    }
  }, [ids, effectiveReqId]);

  const loadComparison = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/compare?ids=${ids}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Failed to load comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectionSummary = async (reqIdValue: string) => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${reqIdValue}/selection-summary`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates);
        setRequisitionTitle(data.requisition_title || null);
      }
    } catch (error) {
      console.error('Failed to load selection summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAICompare = async () => {
    if (!effectiveReqId) return;
    setAiComparing(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${effectiveReqId}/ai-comparison`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'AI comparison failed' }));
        throw new Error(err.detail || 'AI comparison failed');
      }
      const data = await res.json();
      setAiResult(data);
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : 'AI comparison failed');
    } finally {
      setAiComparing(false);
    }
  };

  const handleSelectionConfirm = async () => {
    if (!selectionCandidate || !effectiveReqId) return;
    setSelectionSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${effectiveReqId}/selection-decision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_application_id: selectionCandidate.id,
          rationale: rationale || null,
          reject_others: rejectOthers,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Selection failed' }));
        throw new Error(err.detail || 'Selection failed');
      }
      setSelectionSuccess(selectionCandidate.applicant.name);
      setSelectionCandidate(null);
      setRationale('');
      setRejectOthers(true);
      // Navigate to offer builder after a brief delay
      setTimeout(() => {
        navigate(`/recruiting/offers/new?applicationId=${selectionCandidate.id}`);
      }, 1500);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Selection failed');
    } finally {
      setSelectionSubmitting(false);
    }
  };

  const toggleScorecards = (candidateId: number) => {
    setExpandedScorecards(prev => ({ ...prev, [candidateId]: !prev[candidateId] }));
  };

  if (!ids && !effectiveReqId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No candidate IDs provided for comparison.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Use ?ids=1,2,3 or ?requisitionId=X to compare candidates.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-96 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No candidates found for the given IDs.</p>
      </div>
    );
  }

  // Find highest rating for highlighting
  const maxRating = Math.max(...candidates.map(c => c.overall_rating || 0));

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Candidate Comparison
            {requisitionTitle && (
              <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                &mdash; {requisitionTitle}
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comparing {candidates.length} candidate(s) side by side</p>
        </div>

        {/* AI Compare Button - requisition mode only */}
        {effectiveReqId && (
          <button
            onClick={handleAICompare}
            disabled={aiComparing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {aiComparing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            {aiComparing ? 'Comparing...' : 'AI Compare'}
          </button>
        )}
      </div>

      {/* Selection Success Banner */}
      {selectionSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {selectionSuccess} has been selected. Redirecting to offer builder...
            </p>
          </div>
        </div>
      )}

      {/* AI Comparison Results Panel */}
      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{aiError}</p>
          </div>
        </div>
      )}

      {aiResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">AI Candidate Comparison</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Ranked Candidates */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Ranked Candidates</h3>
              <div className="space-y-2">
                {aiResult.ranked_candidates
                  .sort((a, b) => a.rank - b.rank)
                  .map(rc => (
                    <div key={rc.name} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">
                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-bold">
                        {rc.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{rc.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            rc.fit_score >= 75 ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                            : rc.fit_score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                          }`}>
                            Fit: {rc.fit_score}
                          </span>
                        </div>
                        {rc.key_strengths.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rc.key_strengths.map((s, i) => (
                              <span key={i} className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {rc.key_concerns.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rc.key_concerns.map((c, i) => (
                              <span key={i} className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Comparative Analysis */}
            {aiResult.comparative_analysis && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Comparative Analysis</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg whitespace-pre-wrap">
                  {aiResult.comparative_analysis}
                </p>
              </div>
            )}

            {/* Recommendation */}
            {aiResult.recommendation && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recommendation</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3 rounded-lg">
                  {aiResult.recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {candidates.map(candidate => {
            const isTopRated = candidate.overall_rating === maxRating && maxRating > 0;
            const scExpanded = expandedScorecards[candidate.id] || false;

            return (
              <div
                key={candidate.id}
                className={`w-80 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden ${
                  isTopRated ? 'ring-2 ring-green-400' : ''
                }`}
              >
                {/* Header */}
                <div className={`p-4 ${isTopRated ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{candidate.applicant.name}</h3>
                    {candidate.is_favorite && <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{candidate.applicant.email}</p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[candidate.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                      {candidate.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                  {/* Overall Rating */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award className={`w-5 h-5 ${isTopRated ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className={`text-3xl font-bold ${isTopRated ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {candidate.overall_rating ? candidate.overall_rating.toFixed(1) : '--'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">/5</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {candidate.scorecard_count} scorecard(s)
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="space-y-2">
                    {candidate.applicant.current_title && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {candidate.applicant.current_title}
                        </span>
                      </div>
                    )}
                    {candidate.applicant.current_employer && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-5.5 truncate">
                        at {candidate.applicant.current_employer}
                      </p>
                    )}
                    {candidate.applicant.years_of_experience != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {candidate.applicant.years_of_experience} years experience
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Summary */}
                  {Object.keys(candidate.recommendation_counts).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recommendations</p>
                      <div className="space-y-1">
                        {recommendationOrder
                          .filter(rec => candidate.recommendation_counts[rec])
                          .map(rec => (
                            <div key={rec} className="flex items-center justify-between">
                              <span className={`text-xs px-2 py-0.5 rounded ${recColors[rec] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                {rec}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{candidate.recommendation_counts[rec]}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Resume Analysis Section */}
                  {candidate.resume_analysis && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Resume Analysis</p>
                      <ResumeScoreBar score={candidate.resume_analysis.overall_score} />
                      {candidate.resume_analysis.threshold_label && (
                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                          candidate.resume_analysis.threshold_label === 'Promising'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        }`}>
                          {candidate.resume_analysis.threshold_label}
                        </span>
                      )}
                      {candidate.resume_analysis.summary && (
                        <div className="mt-2">
                          <TruncatedText text={candidate.resume_analysis.summary} />
                        </div>
                      )}
                      {candidate.resume_analysis.strengths && candidate.resume_analysis.strengths.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {candidate.resume_analysis.strengths.slice(0, 3).map((s, i) => (
                            <div key={i} className="flex items-start gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {candidate.resume_analysis.weaknesses && candidate.resume_analysis.weaknesses.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {candidate.resume_analysis.weaknesses.slice(0, 2).map((w, i) => (
                            <div key={i} className="flex items-start gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scorecard Analysis Section */}
                  {candidate.scorecard_analysis && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">AI Scorecard Analysis</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {candidate.scorecard_analysis.overall_recommendation && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            aiRecColors[candidate.scorecard_analysis.overall_recommendation] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {candidate.scorecard_analysis.overall_recommendation}
                          </span>
                        )}
                        {candidate.scorecard_analysis.confidence_level && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            confidenceColors[candidate.scorecard_analysis.confidence_level] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {candidate.scorecard_analysis.confidence_level} confidence
                          </span>
                        )}
                      </div>
                      {candidate.scorecard_analysis.summary && (
                        <TruncatedText text={candidate.scorecard_analysis.summary} />
                      )}
                    </div>
                  )}

                  {/* Individual Scorecards (Expandable) */}
                  {candidate.scorecards && candidate.scorecards.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <button
                        onClick={() => toggleScorecards(candidate.id)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 w-full"
                      >
                        {scExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Scorecards ({candidate.scorecards.length})
                      </button>
                      {scExpanded && (
                        <div className="mt-2 space-y-2">
                          {candidate.scorecards.map((sc, idx) => (
                            <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{sc.interviewer_name}</span>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">{sc.overall_rating}/5</span>
                              </div>
                              {sc.recommendation && (
                                <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${
                                  recColors[sc.recommendation] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {sc.recommendation}
                                </span>
                              )}
                              {sc.strengths && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-green-600 dark:text-green-400">+</span> {sc.strengths}
                                </p>
                              )}
                              {sc.concerns && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-amber-600 dark:text-amber-400">-</span> {sc.concerns}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Applied Date */}
                  {candidate.submitted_at && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                      Applied {new Date(candidate.submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <button
                    onClick={() => navigate(`/recruiting/applications/${candidate.id}`)}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium py-1"
                  >
                    View Full Profile
                  </button>
                  {effectiveReqId && (
                    <button
                      onClick={() => setSelectionCandidate(candidate)}
                      className="w-full flex items-center justify-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      Select This Candidate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection Confirmation Modal */}
      {selectionCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectionCandidate(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Selection</h2>
              <button onClick={() => setSelectionCandidate(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select <span className="font-semibold text-gray-900 dark:text-white">{selectionCandidate.applicant.name}</span>
              {requisitionTitle && (
                <> for <span className="font-semibold text-gray-900 dark:text-white">{requisitionTitle}</span></>
              )}
              ? This will advance them to the Offer stage.
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rejectOthers}
                  onChange={e => setRejectOthers(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Reject other candidates</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rationale (optional)
                </label>
                <textarea
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  rows={3}
                  placeholder="Why was this candidate selected?"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectionCandidate(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectionConfirm}
                disabled={selectionSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
              >
                {selectionSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                {selectionSubmitting ? 'Selecting...' : 'Confirm Selection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
