import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';

const BASE_URL = '';

interface RubricMap {
  [key: string]: string;
}

interface CriterionTemplate {
  name: string;
  weight: number;
  rubric?: RubricMap;
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
  scorecard_template: {
    criteria?: CriterionTemplate[];
  } | null;
}

const RECOMMENDATIONS = [
  { value: 'Strong Hire', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' },
  { value: 'Hire', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
  { value: 'Lean Hire', color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' },
  { value: 'Lean No Hire', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
  { value: 'No Hire', color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' },
];

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

  // Helper to get rubric for a criterion by name
  const getRubric = (criterionName: string): RubricMap | undefined => {
    return scorecard?.scorecard_template?.criteria?.find(c => c.name === criterionName)?.rubric;
  };

  const toggleRubricExpand = (idx: number) => {
    setExpandedRubrics(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  useEffect(() => { loadScorecard(); }, [scorecardId]);

  const loadScorecard = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/scorecards/${scorecardId}`, { credentials: 'include' });
      if (res.ok) {
        const data: ScorecardData = await res.json();
        setScorecard(data);

        // Pre-fill form if already started
        if (data.overall_rating) setOverallRating(data.overall_rating);
        if (data.recommendation) setRecommendation(data.recommendation);
        if (data.strengths) setStrengths(data.strengths);
        if (data.concerns) setConcerns(data.concerns);
        if (data.additional_notes) setAdditionalNotes(data.additional_notes);

        // Initialize criteria ratings
        if (data.criteria_ratings && data.criteria_ratings.length > 0) {
          setCriteriaRatings(data.criteria_ratings);
        } else if (data.scorecard_template?.criteria) {
          setCriteriaRatings(
            data.scorecard_template.criteria.map(c => ({
              criteria: c.name,
              rating: null,
              notes: '',
            }))
          );
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
          concerns: concerns || null,
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
          {criteriaRatings.map((cr, idx) => {
            const rubric = getRubric(cr.criteria);
            const hasRubric = rubric && Object.keys(rubric).length > 0;
            const isExpanded = expandedRubrics[idx];

            return (
              <div key={idx} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {cr.criteria}
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <div key={rating} className="relative group">
                      <button
                        onClick={() => updateCriteriaRating(idx, rating)}
                        className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                          cr.rating === rating
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {rating}
                      </button>
                      {/* Rubric tooltip on hover */}
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

                {/* Inline rubric description for selected rating */}
                {hasRubric && cr.rating && rubric[String(cr.rating)] && (
                  <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-semibold">Rating {cr.rating}:</span> {rubric[String(cr.rating)]}
                    </p>
                  </div>
                )}

                {/* Collapsible full rubric */}
                {hasRubric && (
                  <button
                    onClick={() => toggleRubricExpand(idx)}
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

                <input
                  type="text"
                  value={cr.notes}
                  onChange={e => updateCriteriaNotes(idx, e.target.value)}
                  className="w-full border dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Notes for this criteria..."
                />
              </div>
            );
          })}
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
          {RECOMMENDATIONS.map(rec => (
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
