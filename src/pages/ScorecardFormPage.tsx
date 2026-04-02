import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Check, Target, AlertTriangle } from 'lucide-react';
import SectionBlock from '@/components/recruiting/scorecard/SectionBlock';
import CriterionRow from '@/components/recruiting/scorecard/CriterionRow';
import RecommendationPicker from '@/components/recruiting/scorecard/RecommendationPicker';
import RedFlagChecklist from '@/components/recruiting/scorecard/RedFlagChecklist';

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
  const [redFlagsChecked, setRedFlagsChecked] = useState<Record<number, boolean>>({});

  const template = scorecard?.scorecard_template;
  const hasSections = !!(template?.sections && template.sections.length > 0);

  // Flatten all criteria from sections for lookup
  const allCriteria = useMemo(() => {
    if (!template) return [];
    if (template.sections) return template.sections.flatMap(s => s.criteria);
    return template.criteria || [];
  }, [template]);

  // Compute weighted composite score
  const compositeScore = useMemo(() => {
    if (!hasSections || criteriaRatings.length === 0) return null;
    let totalWeight = 0;
    let weightedSum = 0;

    for (const cr of criteriaRatings) {
      const criterion = allCriteria.find(c => c.name === cr.criteria);
      if (!criterion || cr.rating === null) continue;
      weightedSum += cr.rating * criterion.weight;
      totalWeight += criterion.weight;
    }

    if (totalWeight === 0) return null;
    return Math.round(weightedSum * 100) / 100;
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
        if (cr?.rating) { sum += cr.rating; rated++; }
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
    if (!compositeScore || !template?.recommendation_thresholds) return null;
    return template.recommendation_thresholds.find(
      t => compositeScore >= t.min && compositeScore <= t.max
    ) || null;
  }, [compositeScore, template]);

  // Auto-set overall rating and recommendation when composite changes
  useEffect(() => {
    if (hasSections && compositeScore && !submitted) {
      setOverallRating(compositeScore);
      if (suggestedRecommendation) setRecommendation(suggestedRecommendation.label);
    }
  }, [compositeScore, suggestedRecommendation, hasSections, submitted]);

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

        if (data.criteria_ratings && data.criteria_ratings.length > 0) {
          setCriteriaRatings(data.criteria_ratings);
        } else {
          const tmpl = data.scorecard_template;
          let criteriaList: CriterionTemplate[] = [];
          if (tmpl?.sections) criteriaList = tmpl.sections.flatMap(s => s.criteria);
          else if (tmpl?.criteria) criteriaList = tmpl.criteria;
          if (criteriaList.length > 0) {
            setCriteriaRatings(criteriaList.map(c => ({ criteria: c.name, rating: null, notes: '' })));
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
      if (res.ok) setSubmitted(true);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateRating = (criterionName: string, rating: number) => {
    setCriteriaRatings(prev => prev.map(cr =>
      cr.criteria === criterionName ? { ...cr, rating } : cr
    ));
  };

  const updateNotes = (criterionName: string, notes: string) => {
    setCriteriaRatings(prev => prev.map(cr =>
      cr.criteria === criterionName ? { ...cr, notes } : cr
    ));
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

  const anyRedFlagged = Object.values(redFlagsChecked).some(Boolean);

  // ──────────────── SECTIONS-BASED TEMPLATE ────────────────
  if (hasSections && template?.sections) {
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

        {/* Scoring scale */}
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
        {template.sections.map((section, si) => (
          <SectionBlock
            key={si}
            section={section}
            sectionIndex={si}
            criteriaRatings={criteriaRatings}
            sectionScore={sectionScores[section.name]}
            onRatingChange={updateRating}
            onNotesChange={updateNotes}
          />
        ))}

        {/* Red Flags */}
        {template.red_flags && template.red_flags.length > 0 && (
          <RedFlagChecklist
            flags={template.red_flags}
            checked={redFlagsChecked}
            onChange={(i, v) => setRedFlagsChecked(prev => ({ ...prev, [i]: v }))}
          />
        )}

        {/* Composite Score & Recommendation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Composite Score & Recommendation
          </h2>

          {template.sections.map((section, si) => {
            const s = sectionScores[section.name];
            return (
              <div key={si} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Domain {si + 1}: {section.name}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {s && s.count > 0 ? `${(s.avg * section.weight).toFixed(2)}` : '—'}
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">/ {(5 * section.weight).toFixed(2)}</span>
                </span>
              </div>
            );
          })}
          <div className="border-t dark:border-gray-700 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-900 dark:text-white">Composite Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {compositeScore?.toFixed(2) || '—'}
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/ 5.00</span>
            </span>
          </div>

          <RecommendationPicker
            recommendation={recommendation}
            onChange={setRecommendation}
            thresholds={template.recommendation_thresholds}
            suggestedLabel={suggestedRecommendation?.label}
          />

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
        <FeedbackSection
          strengths={strengths} setStrengths={setStrengths}
          concerns={concerns} setConcerns={setConcerns}
          additionalNotes={additionalNotes} setAdditionalNotes={setAdditionalNotes}
          title="Interviewer Comments & Key Observations"
          subtitle="Summarize overall impression, standout strengths, areas of concern, and any context for the hiring manager."
        />

        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          This document is confidential and intended for internal HR use only. All interview assessments must comply with equal employment opportunity policies and applicable federal/state regulations.
        </p>

        <SubmitButtons
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          submitting={submitting}
          disabled={overallRating === 0 || !recommendation}
        />
      </div>
    );
  }

  // ──────────────── FLAT CRITERIA TEMPLATE (legacy) ────────────────
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
          {criteriaRatings.map(cr => {
            const criterion = allCriteria.find(c => c.name === cr.criteria);
            return (
              <CriterionRow
                key={cr.criteria}
                name={cr.criteria}
                weight={criterion?.weight}
                valueDescription={criterion?.value_description}
                rubric={criterion?.rubric}
                suggestedQuestions={criterion?.suggested_questions}
                rating={cr.rating}
                notes={cr.notes}
                onRatingChange={r => updateRating(cr.criteria, r)}
                onNotesChange={n => updateNotes(cr.criteria, n)}
              />
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
        <RecommendationPicker recommendation={recommendation} onChange={setRecommendation} />
      </div>

      <FeedbackSection
        strengths={strengths} setStrengths={setStrengths}
        concerns={concerns} setConcerns={setConcerns}
        additionalNotes={additionalNotes} setAdditionalNotes={setAdditionalNotes}
        title="Feedback"
      />

      <SubmitButtons
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        submitting={submitting}
        disabled={overallRating === 0 || !recommendation}
      />
    </div>
  );
}

// ──────────────── Helper sub-components ────────────────

function FeedbackSection({
  strengths, setStrengths, concerns, setConcerns, additionalNotes, setAdditionalNotes,
  title, subtitle,
}: {
  strengths: string; setStrengths: (v: string) => void;
  concerns: string; setConcerns: (v: string) => void;
  additionalNotes: string; setAdditionalNotes: (v: string) => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strengths</label>
        <textarea value={strengths} onChange={e => setStrengths(e.target.value)} rows={3}
          className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          placeholder="What are the candidate's key strengths?" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concerns</label>
        <textarea value={concerns} onChange={e => setConcerns(e.target.value)} rows={3}
          className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          placeholder="Any concerns or areas of improvement?" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
        <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} rows={2}
          className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          placeholder="Any other observations..." />
      </div>
    </div>
  );
}

function SubmitButtons({
  onSubmit, onCancel, submitting, disabled,
}: {
  onSubmit: () => void; onCancel: () => void; submitting: boolean; disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onSubmit} disabled={submitting || disabled}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
        <Check className="w-4 h-4" />
        {submitting ? 'Submitting...' : 'Submit Scorecard'}
      </button>
      <button onClick={onCancel}
        className="px-4 py-2.5 border dark:border-gray-600 rounded-lg text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
        Cancel
      </button>
    </div>
  );
}
