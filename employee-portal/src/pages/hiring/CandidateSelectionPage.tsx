import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import {
  ArrowLeft, Star, Award, Briefcase, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp, Loader2, UserCheck,
  X, DollarSign, Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparisonCandidate {
  application_id: number;
  applicant_name: string;
  applicant_email: string;
  status: string;
  overall_rating: number | null;
  scorecard_count: number;
  scorecards?: {
    interviewer_name: string;
    overall_rating: number;
    recommendation: string;
    strengths: string;
    concerns: string;
  }[];
  resume_analysis?: {
    overall_score: number;
    summary: string;
    threshold_label: string;
  } | null;
  scorecard_analysis?: {
    summary: string;
    overall_recommendation: string;
    confidence_level: string;
  } | null;
  is_favorite: boolean;
}

interface SelectionSummaryResponse {
  requisition_id: string;
  requisition_title: string;
  candidates: ComparisonCandidate[];
}

interface OfferForm {
  salary: string;
  wage_type: string;
  benefits_package: string;
  signing_bonus: string;
  start_date: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Color mappings
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Screening: 'bg-yellow-100 text-yellow-800',
  Interview: 'bg-purple-100 text-purple-800',
  Offer: 'bg-green-100 text-green-800',
  Hired: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
};

const recColors: Record<string, string> = {
  'Strong Hire': 'bg-green-100 text-green-800',
  'Hire': 'bg-green-50 text-green-700',
  'Lean Hire': 'bg-yellow-50 text-yellow-700',
  'Lean No Hire': 'bg-orange-50 text-orange-700',
  'No Hire': 'bg-red-50 text-red-700',
};

const confidenceColors: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ResumeScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Resume Score</span>
        <span className="font-medium text-gray-900">{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function TruncatedText({ text, maxLength = 120 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLength) {
    return <p className="text-xs text-gray-600">{text}</p>;
  }
  return (
    <div>
      <p className="text-xs text-gray-600">
        {expanded ? text : `${text.slice(0, maxLength)}...`}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CandidateSelectionPage() {
  const { reqId } = useParams<{ reqId: string }>();
  const navigate = useNavigate();

  // Data
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([]);
  const [requisitionTitle, setRequisitionTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection modal
  const [selectionCandidate, setSelectionCandidate] = useState<ComparisonCandidate | null>(null);
  const [rejectOthers, setRejectOthers] = useState(true);
  const [rationale, setRationale] = useState('');
  const [selectionSubmitting, setSelectionSubmitting] = useState(false);

  // Offer modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerApplicationId, setOfferApplicationId] = useState<number | null>(null);
  const [offerCandidateName, setOfferCandidateName] = useState('');
  const [offerForm, setOfferForm] = useState<OfferForm>({
    salary: '',
    wage_type: 'salary',
    benefits_package: 'Standard Full-Time',
    signing_bonus: '',
    start_date: '',
    notes: '',
  });
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  // Success banner
  const [selectionSuccess, setSelectionSuccess] = useState<string | null>(null);

  // Expandable scorecards
  const [expandedScorecards, setExpandedScorecards] = useState<Record<number, boolean>>({});

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (reqId) {
      loadSelectionSummary();
    } else {
      setLoading(false);
      setError('No requisition ID provided.');
    }
  }, [reqId]);

  const loadSelectionSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<SelectionSummaryResponse>(
        `/portal/hiring-manager/requisitions/${reqId}/selection-summary`,
      );
      setCandidates(data.candidates);
      setRequisitionTitle(data.requisition_title || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Selection handler
  // -------------------------------------------------------------------------

  const handleSelectionConfirm = async () => {
    if (!selectionCandidate || !reqId) return;
    setSelectionSubmitting(true);
    try {
      await apiPost(`/portal/hiring-manager/requisitions/${reqId}/selection-decision`, {
        selected_application_id: selectionCandidate.application_id,
        rationale: rationale || null,
        reject_others: rejectOthers,
      });
      const selectedName = selectionCandidate.applicant_name;
      const selectedAppId = selectionCandidate.application_id;
      setSelectionSuccess(selectedName);
      setSelectionCandidate(null);
      setRationale('');
      setRejectOthers(true);
      // Open offer initiation modal
      setOfferApplicationId(selectedAppId);
      setOfferCandidateName(selectedName);
      setShowOfferModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Selection failed');
    } finally {
      setSelectionSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Offer initiation handler
  // -------------------------------------------------------------------------

  const handleOfferSubmit = async () => {
    if (!offerApplicationId || !reqId) return;
    setOfferSubmitting(true);
    try {
      await apiPost(`/portal/hiring-manager/requisitions/${reqId}/initiate-offer`, {
        application_id: offerApplicationId,
        salary: offerForm.salary ? Number(offerForm.salary) : undefined,
        wage_type: offerForm.wage_type || undefined,
        benefits_package: offerForm.benefits_package || undefined,
        signing_bonus: offerForm.signing_bonus ? Number(offerForm.signing_bonus) : undefined,
        start_date: offerForm.start_date || undefined,
        notes: offerForm.notes || undefined,
      });
      setShowOfferModal(false);
      navigate(`/hiring/requisitions/${reqId}`, {
        state: { successMessage: `Offer initiated for ${offerCandidateName}` },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to initiate offer');
    } finally {
      setOfferSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Misc helpers
  // -------------------------------------------------------------------------

  const toggleScorecards = (applicationId: number) => {
    setExpandedScorecards(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId],
    }));
  };

  const updateOfferField = (field: keyof OfferForm, value: string) => {
    setOfferForm(prev => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------------------------
  // Render: loading / error / empty states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-80 h-96 bg-gray-200 rounded-xl flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => navigate(`/hiring/requisitions/${reqId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Requisition
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => navigate(`/hiring/requisitions/${reqId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Requisition
        </button>
        <div className="text-center py-12">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No candidates available for selection.</p>
        </div>
      </div>
    );
  }

  // Find highest rating for top-rated highlight
  const maxRating = Math.max(...candidates.map(c => c.overall_rating || 0));

  // -------------------------------------------------------------------------
  // Render: main view
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(`/hiring/requisitions/${reqId}`)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Requisition
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Candidate Selection
          {requisitionTitle && (
            <span className="text-lg font-normal text-gray-500 ml-2">
              &mdash; {requisitionTitle}
            </span>
          )}
        </h1>
        <p className="text-gray-500 mt-1">
          Comparing {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} side by side
        </p>
      </div>

      {/* Selection success banner */}
      {selectionSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">
            {selectionSuccess} has been selected. Preparing offer details...
          </p>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Comparison grid                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {candidates.map(candidate => {
            const isTopRated =
              candidate.overall_rating !== null &&
              candidate.overall_rating === maxRating &&
              maxRating > 0;
            const scExpanded = expandedScorecards[candidate.application_id] || false;

            return (
              <div
                key={candidate.application_id}
                className={`w-80 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${
                  isTopRated ? 'ring-2 ring-green-400' : ''
                }`}
              >
                {/* Card header */}
                <div className={`p-4 ${isTopRated ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {candidate.applicant_name}
                    </h3>
                    {candidate.is_favorite && (
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {candidate.applicant_email}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        statusColors[candidate.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {candidate.status}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-4 flex-1">
                  {/* Overall rating */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award
                        className={`w-5 h-5 ${
                          isTopRated ? 'text-green-500' : 'text-gray-400'
                        }`}
                      />
                      <span
                        className={`text-3xl font-bold ${
                          isTopRated ? 'text-green-600' : 'text-gray-700'
                        }`}
                      >
                        {candidate.overall_rating
                          ? candidate.overall_rating.toFixed(1)
                          : '--'}
                      </span>
                      <span className="text-gray-400 text-sm">/5</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {candidate.scorecard_count} scorecard{candidate.scorecard_count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Resume analysis */}
                  {candidate.resume_analysis && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Resume Analysis
                      </p>
                      <ResumeScoreBar score={candidate.resume_analysis.overall_score} />
                      {candidate.resume_analysis.threshold_label && (
                        <span
                          className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                            candidate.resume_analysis.threshold_label === 'Promising'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {candidate.resume_analysis.threshold_label}
                        </span>
                      )}
                      {candidate.resume_analysis.summary && (
                        <div className="mt-2">
                          <TruncatedText text={candidate.resume_analysis.summary} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scorecard analysis */}
                  {candidate.scorecard_analysis && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Scorecard Analysis
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {candidate.scorecard_analysis.overall_recommendation && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              recColors[candidate.scorecard_analysis.overall_recommendation] ||
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {candidate.scorecard_analysis.overall_recommendation}
                          </span>
                        )}
                        {candidate.scorecard_analysis.confidence_level && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              confidenceColors[candidate.scorecard_analysis.confidence_level] ||
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {candidate.scorecard_analysis.confidence_level} confidence
                          </span>
                        )}
                      </div>
                      {candidate.scorecard_analysis.summary && (
                        <TruncatedText text={candidate.scorecard_analysis.summary} />
                      )}
                    </div>
                  )}

                  {/* Individual scorecards (expandable) */}
                  {candidate.scorecards && candidate.scorecards.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <button
                        onClick={() => toggleScorecards(candidate.application_id)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 w-full"
                      >
                        {scExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                        Scorecards ({candidate.scorecards.length})
                      </button>
                      {scExpanded && (
                        <div className="mt-2 space-y-2">
                          {candidate.scorecards.map((sc, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 rounded-lg p-2.5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">
                                  {sc.interviewer_name}
                                </span>
                                <span className="text-xs font-medium text-gray-900">
                                  {sc.overall_rating}/5
                                </span>
                              </div>
                              {sc.recommendation && (
                                <span
                                  className={`inline-block text-xs px-1.5 py-0.5 rounded ${
                                    recColors[sc.recommendation] ||
                                    'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {sc.recommendation}
                                </span>
                              )}
                              {sc.strengths && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium text-green-600">+</span>{' '}
                                  {sc.strengths}
                                </p>
                              )}
                              {sc.concerns && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium text-amber-600">-</span>{' '}
                                  {sc.concerns}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card actions */}
                <div className="border-t border-gray-200 p-3">
                  <button
                    onClick={() => setSelectionCandidate(candidate)}
                    className="w-full flex items-center justify-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    Select This Candidate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Selection confirmation modal                                        */}
      {/* ----------------------------------------------------------------- */}
      {selectionCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectionCandidate(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Confirm Selection</h2>
              <button
                onClick={() => setSelectionCandidate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Select{' '}
              <span className="font-semibold text-gray-900">
                {selectionCandidate.applicant_name}
              </span>
              {requisitionTitle && (
                <>
                  {' '}
                  for{' '}
                  <span className="font-semibold text-gray-900">{requisitionTitle}</span>
                </>
              )}
              ? This will advance them to the Offer stage.
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rejectOthers}
                  onChange={e => setRejectOthers(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Reject other candidates</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rationale (optional)
                </label>
                <textarea
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  rows={3}
                  placeholder="Why was this candidate selected?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectionCandidate(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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

      {/* ----------------------------------------------------------------- */}
      {/* Offer initiation modal                                              */}
      {/* ----------------------------------------------------------------- */}
      {showOfferModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowOfferModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Initiate Offer</h2>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Prepare an offer for{' '}
              <span className="font-semibold text-gray-900">{offerCandidateName}</span>
              {requisitionTitle && (
                <>
                  {' '}
                  &mdash;{' '}
                  <span className="text-gray-500">{requisitionTitle}</span>
                </>
              )}
            </p>

            <div className="space-y-4">
              {/* Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-3.5 h-3.5 inline-block mr-1" />
                  Salary
                </label>
                <input
                  type="number"
                  value={offerForm.salary}
                  onChange={e => updateOfferField('salary', e.target.value)}
                  placeholder="e.g. 85000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Wage type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wage Type
                </label>
                <select
                  value={offerForm.wage_type}
                  onChange={e => updateOfferField('wage_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="salary">Salary</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>

              {/* Benefits package */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefits Package
                </label>
                <div className="space-y-2">
                  {['Standard Full-Time', 'Custom', 'N/A'].map(option => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="benefits_package"
                        value={option}
                        checked={offerForm.benefits_package === option}
                        onChange={e => updateOfferField('benefits_package', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Signing bonus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-3.5 h-3.5 inline-block mr-1" />
                  Signing Bonus
                </label>
                <input
                  type="number"
                  value={offerForm.signing_bonus}
                  onChange={e => updateOfferField('signing_bonus', e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline-block mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={offerForm.start_date}
                  onChange={e => updateOfferField('start_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={offerForm.notes}
                  onChange={e => updateOfferField('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes for the offer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOfferSubmit}
                disabled={offerSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
              >
                {offerSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Briefcase className="w-4 h-4" />
                )}
                {offerSubmitting ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
