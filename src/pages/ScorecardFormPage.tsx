import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Check, Info, ChevronDown, ChevronUp, AlertTriangle, MessageSquare, Target } from 'lucide-react';

const BASE_URL = '';

interface RubricMap {
  [key: string]: string;
}

interface CriterionTemplate {
  name: string;
  weight: number;
  rubric?: RubricMap;
  suggested_questions?: string[];
  value_description?: string;
}

interface SectionTemplate {
  name: string;
  weight: number;
  description?: string;
  criteria: CriterionTemplate[];
}

interface RecommendationThreshold {
  min: number;
  max: number;
  label: string;
  action: string;
}

interface ScorecardTemplate {
  title?: string;
  description?: string;
  vision?: string;
  mission?: string;
  sections?: SectionTemplate[];
  criteria?: CriterionTemplate[];
  red_flags?: string[];
  recommendation_thresholds?: RecommendationThreshold[];
}

interface ScorecardData {
  id: number;
  application_id: number;
  applicant_name: string | null;
  stage: { id: number; name: string } | null;
  interviewer: { id: number; name: string } | null;
  overall_rating: number | null;
  recommendation: string | null;
  criteria_ratings: { criteria: string; rating: number | null; notes: string }[] | null;
  strengths: string | null;
  concerns: string | null;
  additional_notes: string | null;
  status: string;
  submitted_at: string | null;
  due_date: string | null;
  scorecard_template: ScorecardTemplate | null;
}

// Standard recommendations for flat (non-sections) templates
const STANDARD_RECOMMENDATIONS = [
  { value: 'Strong Hire', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' },
  { value: 'Hire', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
  { value: 'Lean Hire', color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' },
  { value: 'Lean No Hire', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
  { value: 'No Hire', color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' },
];

const THRESHOLD_COLORS: Record<string, string> = {
  'Strong Advance': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
  'Advance': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  'Hold / Discuss': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  'Do Not Advance': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
};

export default function ScorecardFormPage() {
  const { scorecardId } = useParams<{ scorecardId: string }>();
  const navigate = useNavigate();
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [overallRating, setOverallRating] = useState<number>(0);
  const [recommendation, setRecommendation] = useState('');
  const [criteriaRatings, setCriteriaRatings] = useState<{ criteria: string; rating: number | null; notes: string }[]>([]);
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [expandedRubrics, setExpandedRubrics] = useState<Record<number, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [redFlagsChecked, setRedFlagsChecked] = useState<Record<number, boolean>>({});

  const template = scorecard?.scorecard_template;
  const hasSections = !!(template?.sections && template.sections.length > 0);

  // Flatten all criteria from sections for lookup
  const allCriteria = useMemo(() => {
    if (!template) return [];
    if (template.sections) {
      return template.sections.flatMap(s => s.criteria);
    }
    return template.criteria || [];
  }, [template]);

  // Get rubric for a criterion by name
  const getRubric = (criterionName: string): RubricMap | undefined => {
    return allCriteria.find(c => c.name === criterionName)?.rubric;
  };

  // Get criterion template by name
  const getCriterion = (criterionName: string): CriterionTemplate | undefined => {
    return allCriteria.find(c => c.name === criterionName);
  };

  const toggleRubricExpand = (idx: number) => {
    setExpandedRubrics(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleQuestionsExpand = (idx: number) => {
    setExpandedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Compute weighted composite score
  const compositeScore = useMemo(() => {
    if (!hasSections || criteriaRatings.length === 0) return null;
    let totalWeight = 0;
    let weightedSum = 0;
    let allRated = true;

    for (const cr of criteriaRatings) {
      const criterion = getCriterion(cr.criteria);
      if (!criterion) continue;
      if (cr.rating === null) {
        allRated = false;
        continue;
      }
      weightedSum += cr.rating * criterion.weight;
      totalWeight += criterion.weight;
    }

    if (totalWeight === 0) return null;
    // Composite = weighted sum (weights should sum to 1.0, so max = 5.0)
    const score = weightedSum;
    return { score: Math.round(score * 100) / 100, allRated };
  }, [criteriaRatings, hasSections, allCriteria]);

  // Section scores
  const sectionScores = useMemo(() => {
    if (!hasSections || !template?.sections) return {};
    const scores: Record<string, { avg: number; count: number; total: number }> = {};

    for (const section of template.sections) {
      let sum = 0;
      let rated = 0;
      for (const criterion of section.criteria) {
        const cr = criteriaRatings.find(r => r.criteria === criterion.name);
        if (cr?.rating) {
          sum += cr.rating;
          rated++;
        }
      }
      scores[section.name] = {
        avg: rated > 0 ? Math.round((sum / rated) * 100) / 100 : 0,
        count: rated,
        total: section.criteria.length,
      };
    }
    return scores;
  }, [criteriaRatings, template, hasSections]);

  // Auto-suggest recommendation from thresholds
  const suggestedRecommendation = useMemo(() => {
    if (!compositeScore?.score || !template?.recommendation_thresholds) return null;
    const score = compositeScore.score;
    return template.recommendation_thresholds.find(
      t => score >= t.min && score <= t.max
    ) || null;
  }, [compositeScore, template]);

  // Auto-set overall rating and recommendation when composite changes
  useEffect(() => {
    if (hasSections && compositeScore?.score) {
      setOverallRating(compositeScore.score);
      if (suggestedRecommendation && !recommendation) {
        setRecommendation(suggestedRecommendation.label);
      }
    }
  }, [compositeScore, suggestedRecommendation, hasSections]);

  useEffect(() => { loadScorecard(); }, [scorecardId]);

  const loadScorecard = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/scorecards/${scorecardId}`, { credentials: 'include' });
      if (res.ok) {
        const data: ScorecardData = await res.json();
        setScorecard(data);

        if (data.overall_rating) setOverallRating(data.overall_rating);
        if (data.recommendation) setRecommendation(data.recommendation);
        if (data.strengths) setStrengths(data.strengths);
        if (data.concerns) setConcerns(data.concerns);
        if (data.additional_notes) setAdditionalNotes(data.additional_notes);

        // Initialize criteria ratings — handle both sections and flat criteria
        if (data.criteria_ratings && data.criteria_ratings.length > 0) {
          setCriteriaRatings(data.criteria_ratings);
        } else {
          const tmpl = data.scorecard_template;
          let criteriaList: CriterionTemplate[] = [];
          if (tmpl?.sections) {
            criteriaList = tmpl.sections.flatMap(s => s.criteria);
          } else if (tmpl?.criteria) {
            criteriaList = tmpl.criteria;
          }
          if (criteriaList.length > 0) {
            setCriteriaRatings(
              criteriaList.map(c => ({ criteria: c.name, rating: null, notes: '' }))
            );
          }
        }

        if (data.status === 'Submitted') setSubmitted(true);
      }
    } catch (error) {
      console.error('Failed to load scorecard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!recommendation || overallRating === 0) return;
    setSubmitting(true);

    // Prepend red flag notes to concerns
    let finalConcerns = concerns;
    const flaggedItems = template?.red_flags?.filter((_, i) => redFlagsChecked[i]) || [];
    if (flaggedItems.length > 0) {
      const flagText = 'RED FLAGS OBSERVED:\n' + flaggedItems.map(f => `- ${f}`).join('\n');
      finalConcerns = flagText + (concerns ? '\n\n' + concerns : '');
    }

    try {
      const res = await fetch(`${BASE_URL}/recruiting/scorecards/${scorecardId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_rating: overallRating,
          recommendation,
          criteria_ratings: criteriaRatings.length > 0 ? criteriaRatings : null,
          strengths: strengths || null,
          concerns: finalConcerns || null,
          additional_notes: additionalNotes || null,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateCriteriaRating = (index: number, rating: number | null) => {
    const updated = [...criteriaRatings];
    updated[index] = { ...updated[index], rating };
    setCriteriaRatings(updated);
  };

  const updateCriteriaNotes = (index: number, notes: string) => {
    const updated = [...criteriaRatings];
    updated[index] = { ...updated[index], notes };
    setCriteriaRatings(updated);
  };

  // Get flat index of a criterion within the overall criteriaRatings array
  const getCriterionIndex = (criterionName: string): number => {
    return criteriaRatings.findIndex(cr => cr.criteria === criterionName);
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

  if (!scorecard) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Scorecard not found.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Scorecard Submitted</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Thank you for your feedback on {scorecard.applicant_name}.</p>
        <button
          onClick={() => navigate(`/recruiting/applications/${scorecard.application_id}`)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Application
        </button>
      </div>
    );
  }

  // ──────────────── Render a single criterion ────────────────
  const renderCriterion = (criterionName: string, globalIdx: number) => {
    const cr = criteriaRatings[globalIdx];
    if (!cr) return null;
    const criterion = getCriterion(criterionName);
    const rubric = criterion?.rubric;
    const hasRubric = rubric && Object.keys(rubric).length > 0;
    const isExpanded = expandedRubrics[globalIdx];
    const isQuestionsExpanded = expandedQuestions[globalIdx];

    return (
      <div key={globalIdx} className="space-y-2 py-4 border-b dark:border-gray-700 last:border-b-0">
        <div className="flex items-start justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {cr.criteria}
            </label>
            {criterion?.value_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{criterion.value_description}</p>
            )}
          </div>
          {criterion?.weight && (
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
              {Math.round(criterion.weight * 100)}%
            </span>
          )}
        </div>

        {/* Suggested questions */}
        {criterion?.suggested_questions && criterion.suggested_questions.length > 0 && (
          <>
            <button
              onClick={() => toggleQuestionsExpand(globalIdx)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {isQuestionsExpanded ? 'Hide' : 'Suggested'} questions
              {isQuestionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {isQuestionsExpanded && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 space-y-1">
                {criterion.suggested_questions.map((q, qi) => (
                  <p key={qi} className="text-xs text-blue-800 dark:text-blue-300 flex gap-2">
                    <span className="text-blue-400">•</span> {q}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {/* Rating buttons */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(rating => (
            <div key={rating} className="relative group">
              <button
                onClick={() => updateCriteriaRating(globalIdx, rating)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  cr.rating === rating
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-700 dark:text-gray-300'
                }`}
              >
                {rating}
              </button>
              {hasRubric && rubric[String(rating)] && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="font-semibold mb-0.5">Rating {rating}</div>
                  {rubric[String(rating)]}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selected rubric description */}
        {hasRubric && cr.rating && rubric[String(cr.rating)] && (
          <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Rating {cr.rating}:</span> {rubric[String(cr.rating)]}
            </p>
          </div>
        )}

        {/* Full rubric toggle */}
        {hasRubric && (
          <button
            onClick={() => toggleRubricExpand(globalIdx)}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isExpanded ? 'Hide' : 'View'} full rubric
          </button>
        )}
        {hasRubric && isExpanded && (
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 space-y-1.5 text-xs">
            {[1, 2, 3, 4, 5].map(r => (
              rubric[String(r)] ? (
                <div key={r} className={`flex gap-2 ${cr.rating === r ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  <span className="font-medium w-4 flex-shrink-0">{r}.</span>
                  <span>{rubric[String(r)]}</span>
                </div>
              ) : null
            ))}
          </div>
        )}

        {/* Notes */}
        <input
          type="text"
          value={cr.notes}
          onChange={e => updateCriteriaNotes(globalIdx, e.target.value)}
          className="w-full border dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
          placeholder="Notes for this criterion..."
        />
      </div>
    );
  };

  // ──────────────── SECTIONS-BASED TEMPLATE (new format) ────────────────
  if (hasSections && template?.sections) {
    const hasRedFlags = template.red_flags && template.red_flags.length > 0;
    const anyRedFlagged = Object.values(redFlagsChecked).some(Boolean);
    const thresholds = template.recommendation_thresholds || [];

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {template.title || 'Interview Scorecard'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Evaluating: <strong>{scorecard.applicant_name}</strong>
            {scorecard.stage && <> — {scorecard.stage.name}</>}
          </p>
          {template.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{template.description}</p>
          )}
          {scorecard.due_date && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Due: {new Date(scorecard.due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Mission & Vision */}
        {(template.vision || template.mission) && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 space-y-2">
            {template.vision && (
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                <span className="font-semibold">Vision:</span> {template.vision}
              </p>
            )}
            {template.mission && (
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                <span className="font-semibold">Mission:</span> {template.mission}
              </p>
            )}
          </div>
        )}

        {/* Scoring scale reference */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Scoring Scale (1-5)</p>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-center"><span className="font-semibold">1</span><br /><span className="text-gray-500 dark:text-gray-400">Does Not Meet</span></div>
            <div className="text-center"><span className="font-semibold">2</span><br /><span className="text-gray-500 dark:text-gray-400">Below Expectations</span></div>
            <div className="text-center"><span className="font-semibold">3</span><br /><span className="text-gray-500 dark:text-gray-400">Meets Expectations</span></div>
            <div className="text-center"><span className="font-semibold">4</span><br /><span className="text-gray-500 dark:text-gray-400">Exceeds Expectations</span></div>
            <div className="text-center"><span className="font-semibold">5</span><br /><span className="text-gray-500 dark:text-gray-400">Exceptional</span></div>
          </div>
        </div>

        {/* Domain Sections */}
        {template.sections.map((section, sectionIdx) => {
          const sectionScore = sectionScores[section.name];
          return (
            <div key={sectionIdx} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
              {/* Section header */}
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Domain {sectionIdx + 1}: {section.name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Weight: {Math.round(section.weight * 100)}%
                    </span>
                    {sectionScore && sectionScore.count > 0 && (
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Avg: {sectionScore.avg} ({sectionScore.count}/{sectionScore.total})
                      </span>
                    )}
                  </div>
                </div>
                {section.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{section.description}</p>
                )}
              </div>

              {/* Criteria */}
              <div className="px-6">
                {section.criteria.map(criterion => {
                  const idx = getCriterionIndex(criterion.name);
                  if (idx === -1) return null;
                  return renderCriterion(criterion.name, idx);
                })}
              </div>

              {/* Section subtotal */}
              {sectionScore && sectionScore.count > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-3 border-t dark:border-gray-700 flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Domain {sectionIdx + 1} Weighted Score (avg {sectionScore.avg} x {section.weight.toFixed(2)}):
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {(sectionScore.avg * section.weight).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Red Flags */}
        {hasRedFlags && (
          <div className={`rounded-lg border p-6 space-y-3 ${
            anyRedFlagged
              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <AlertTriangle className={`w-5 h-5 ${anyRedFlagged ? 'text-red-500' : 'text-gray-400'}`} />
              Red Flag / Knockout Indicators
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If ANY of the following are observed, flag immediately regardless of other scores.
            </p>
            <div className="space-y-2">
              {template.red_flags!.map((flag, fi) => (
                <label key={fi} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!redFlagsChecked[fi]}
                    onChange={e => setRedFlagsChecked(prev => ({ ...prev, [fi]: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className={`text-sm ${redFlagsChecked[fi] ? 'text-red-700 dark:text-red-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                    {flag}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Composite Score & Recommendation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Composite Score & Recommendation
          </h2>

          {/* Score breakdown */}
          {template.sections.map((section, si) => {
            const sScore = sectionScores[section.name];
            return (
              <div key={si} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Domain {si + 1}: {section.name}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {sScore && sScore.count > 0 ? `${(sScore.avg * section.weight).toFixed(2)}` : '—'}
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">/ {(5 * section.weight).toFixed(2)}</span>
                </span>
              </div>
            );
          })}
          <div className="border-t dark:border-gray-700 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-900 dark:text-white">Composite Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {compositeScore?.score?.toFixed(2) || '—'}
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/ 5.00</span>
            </span>
          </div>

          {/* Recommendation thresholds */}
          {thresholds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recommendation Thresholds</p>
              {thresholds.map((t, ti) => {
                const isActive = suggestedRecommendation?.label === t.label;
                return (
                  <div
                    key={ti}
                    className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                      recommendation === t.label
                        ? (THRESHOLD_COLORS[t.label] || 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 border-blue-200') + ' ring-2 ring-blue-400 ring-offset-1'
                        : isActive
                        ? (THRESHOLD_COLORS[t.label] || 'bg-gray-50 border-gray-200') + ' ring-1 ring-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                    onClick={() => setRecommendation(t.label)}
                  >
                    <span className="font-semibold w-24">{t.min.toFixed(2)} - {t.max.toFixed(2)}</span>
                    <span className="font-medium w-32">{t.label}</span>
                    <span className="flex-1">{t.action}</span>
                  </div>
                );
              })}
            </div>
          )}

          {anyRedFlagged && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Red flags observed — review before advancing regardless of score.
              </p>
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
          <h2 className="font-semibold">Interviewer Comments & Key Observations</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Summarize overall impression, standout strengths, areas of concern, and any context for the hiring manager.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strengths</label>
            <textarea
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
              rows={3}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="What are the candidate's key strengths?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concerns</label>
            <textarea
              value={concerns}
              onChange={e => setConcerns(e.target.value)}
              rows={3}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Any concerns or areas of improvement?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
            <textarea
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              rows={2}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Any other observations..."
            />
          </div>
        </div>

        {/* Confidentiality notice */}
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          This document is confidential and intended for internal HR use only. All interview assessments must comply with equal employment opportunity policies and applicable federal/state regulations.
        </p>

        {/* Submit */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || overallRating === 0 || !recommendation}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Scorecard'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 border dark:border-gray-600 rounded-lg text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ──────────────── FLAT CRITERIA TEMPLATE (legacy format) ────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interview Scorecard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Evaluating: <strong>{scorecard.applicant_name}</strong>
          {scorecard.stage && <> - {scorecard.stage.name}</>}
        </p>
        {scorecard.due_date && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Due: {new Date(scorecard.due_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Criteria Ratings */}
      {criteriaRatings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold">Criteria Ratings</h2>
          {criteriaRatings.map((cr, idx) => renderCriterion(cr.criteria, idx))}
        </div>
      )}

      {/* Overall Rating */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold">Overall Rating *</h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              onClick={() => setOverallRating(rating)}
              className={`flex items-center gap-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                overallRating === rating
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <Star className="w-4 h-4" fill={overallRating >= rating ? 'currentColor' : 'none'} />
              {rating}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold">Recommendation *</h2>
        <div className="grid grid-cols-5 gap-2">
          {STANDARD_RECOMMENDATIONS.map(rec => (
            <button
              key={rec.value}
              onClick={() => setRecommendation(rec.value)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                recommendation === rec.value
                  ? rec.color + ' ring-2 ring-offset-1 ring-blue-400'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {rec.value}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold">Feedback</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strengths</label>
          <textarea
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
            rows={3}
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="What are the candidate's key strengths?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concerns</label>
          <textarea
            value={concerns}
            onChange={e => setConcerns(e.target.value)}
            rows={3}
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Any concerns or areas of improvement?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
          <textarea
            value={additionalNotes}
            onChange={e => setAdditionalNotes(e.target.value)}
            rows={2}
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Any other observations..."
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || overallRating === 0 || !recommendation}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Submit Scorecard'}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2.5 border dark:border-gray-600 rounded-lg text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
