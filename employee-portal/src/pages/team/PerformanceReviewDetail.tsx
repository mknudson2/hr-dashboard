import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiPost } from '@/utils/api';
import { ArrowLeft, User, Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Save, Send, Target, TrendingUp, AlertTriangle, Plus, Pencil, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { RatingCategory, StarRatingInput } from '@/components/performance';

// ============================================================================
// Interfaces
// ============================================================================

interface SelfReview {
  id: number;
  reviewer_name: string;
  submitted_date: string;
  overall_rating: number | null;
  quality_of_work: number | null;
  collaboration: number | null;
  communication: number | null;
  leadership: number | null;
  technical_skills: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  specific_examples: string | null;
  additional_comments: string | null;
}

interface ReviewDetail {
  id: number;
  review_id: string;
  employee_id: string;
  cycle_id: number | null;
  review_type: string;
  review_period_start: string;
  review_period_end: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_title: string | null;
  status: string;
  submitted_date: string | null;
  acknowledged_date: string | null;
  overall_rating: number | null;
  quality_of_work: number | null;
  productivity: number | null;
  communication: number | null;
  teamwork: number | null;
  initiative: number | null;
  leadership: number | null;
  problem_solving: number | null;
  attendance_punctuality: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  achievements: string | null;
  manager_comments: string | null;
  employee_comments: string | null;
  development_plan: string | null;
  goals_for_next_period: string | null;
  template_id: number | null;
  dynamic_ratings: Record<string, number> | null;
  dynamic_responses: Record<string, string> | null;
  rating_notes: Record<string, string> | null;
  created_at: string;
}

interface EmployeeInfo {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
}

interface TemplateCompetency {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

interface TemplateTextField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  min_length: number;
}

interface ReviewTemplateData {
  id: number;
  name: string;
  template_type: string;
  competencies: TemplateCompetency[];
  rating_scale: { min: number; max: number; labels: Record<string, string> };
  text_fields: TemplateTextField[];
  include_self_review: boolean;
  include_goal_setting: boolean;
  include_development_plan: boolean;
}

interface GoalData {
  id: number;
  goal_id: string;
  goal_title: string;
  goal_description: string | null;
  goal_type: string;
  status: string;
  progress_percentage: number;
  target_date: string | null;
  start_date: string | null;
  target_value: string | null;
  current_value: string | null;
  unit_of_measure: string | null;
  is_key_result: boolean;
  priority: string;
}

interface PIPMilestone {
  id: number;
  milestone_title: string;
  due_date: string | null;
  status: string;
  completed_date: string | null;
}

interface PIPData {
  id: number;
  pip_id: string;
  title: string;
  reason: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  milestones: PIPMilestone[];
}

interface EmployeeContext {
  goals: GoalData[];
  kpis: GoalData[];
  active_pips: PIPData[];
  template: ReviewTemplateData | null;
}

// ============================================================================
// Component
// ============================================================================

export default function PerformanceReviewDetail() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [selfReview, setSelfReview] = useState<SelfReview | null>(null);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelfReview, setShowSelfReview] = useState(true);

  // Employee context
  const [context, setContext] = useState<EmployeeContext | null>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [showKPIs, setShowKPIs] = useState(false);
  const [showPIPs, setShowPIPs] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);

  // Inline goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalForm, setGoalForm] = useState({ goal_title: '', goal_description: '', goal_type: 'SMART Goal', target_date: '', start_date: '' });

  // Form state for legacy ratings
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    quality_of_work: 0,
    productivity: 0,
    communication: 0,
    teamwork: 0,
    initiative: 0,
    leadership: 0,
    problem_solving: 0,
    attendance_punctuality: 0,
  });

  // Form state for legacy text fields
  const [formData, setFormData] = useState({
    strengths: '',
    areas_for_improvement: '',
    achievements: '',
    manager_comments: '',
    development_plan: '',
    goals_for_next_period: '',
  });

  // Dynamic form state (template-driven)
  const [dynamicRatings, setDynamicRatings] = useState<Record<string, number>>({});
  const [dynamicResponses, setDynamicResponses] = useState<Record<string, string>>({});

  // Rating notes (per-rating justification)
  const [ratingNotes, setRatingNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reviewData, selfReviewData] = await Promise.all([
          apiGet<ReviewDetail>(`/performance/reviews/${reviewId}`),
          apiGet<SelfReview | null>(`/performance/reviews/${reviewId}/self-review`),
        ]);

        setReview(reviewData);
        setSelfReview(selfReviewData);

        // Initialize legacy form with existing data
        setRatings({
          overall_rating: reviewData.overall_rating || 0,
          quality_of_work: reviewData.quality_of_work || 0,
          productivity: reviewData.productivity || 0,
          communication: reviewData.communication || 0,
          teamwork: reviewData.teamwork || 0,
          initiative: reviewData.initiative || 0,
          leadership: reviewData.leadership || 0,
          problem_solving: reviewData.problem_solving || 0,
          attendance_punctuality: reviewData.attendance_punctuality || 0,
        });

        setFormData({
          strengths: reviewData.strengths || '',
          areas_for_improvement: reviewData.areas_for_improvement || '',
          achievements: reviewData.achievements || '',
          manager_comments: reviewData.manager_comments || '',
          development_plan: reviewData.development_plan || '',
          goals_for_next_period: reviewData.goals_for_next_period || '',
        });

        // Initialize dynamic form state
        if (reviewData.dynamic_ratings) {
          setDynamicRatings(typeof reviewData.dynamic_ratings === 'string' ? JSON.parse(reviewData.dynamic_ratings) : reviewData.dynamic_ratings);
        }
        if (reviewData.dynamic_responses) {
          setDynamicResponses(typeof reviewData.dynamic_responses === 'string' ? JSON.parse(reviewData.dynamic_responses) : reviewData.dynamic_responses);
        }
        if (reviewData.rating_notes) {
          setRatingNotes(typeof reviewData.rating_notes === 'string' ? JSON.parse(reviewData.rating_notes) : reviewData.rating_notes);
        }

        setEmployee({
          employee_id: reviewData.employee_id,
          first_name: '',
          last_name: '',
          department: '',
          position: '',
        });

        // Fetch employee context
        try {
          const contextData = await apiGet<EmployeeContext>(`/performance/reviews/${reviewId}/employee-context`);
          setContext(contextData);
          if (contextData.active_pips.length > 0) setShowPIPs(true);
        } catch {
          // Non-critical — context panel just won't show data
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load review');
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) {
      fetchData();
    }
  }, [reviewId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleRatingChange = (field: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isTemplateDriven = review?.template_id != null && context?.template != null;
  const template = context?.template;

  const canSubmit = () => {
    if (isTemplateDriven && template) {
      // Validate template competencies
      const requiredCompetencies = template.competencies.filter(c => c.required);
      const allRatingsComplete = requiredCompetencies.every(c => (dynamicRatings[c.key] || 0) >= template.rating_scale.min);

      // Validate template text fields
      const requiredTextFields = template.text_fields.filter(f => f.required);
      const allTextComplete = requiredTextFields.every(f => {
        const val = dynamicResponses[f.key] || '';
        return val.trim().length >= (f.min_length || 1);
      });

      return allRatingsComplete && allTextComplete;
    }

    // Legacy validation
    const requiredRatings = [
      ratings.overall_rating,
      ratings.quality_of_work,
      ratings.productivity,
      ratings.communication,
      ratings.teamwork,
      ratings.initiative,
      ratings.problem_solving,
      ratings.attendance_punctuality,
    ];
    const allRatingsComplete = requiredRatings.every((r) => r >= 1 && r <= 5);

    const requiredText = [
      formData.strengths,
      formData.areas_for_improvement,
      formData.development_plan,
      formData.goals_for_next_period,
    ];
    const allTextComplete = requiredText.every((t) => t.trim().length >= 50);

    return allRatingsComplete && allTextComplete;
  };

  const handleSave = async (action: 'save_draft' | 'submit') => {
    if (!review) return;

    if (action === 'submit' && !canSubmit()) {
      setError('Please complete all required fields before submitting.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, unknown> = { action };

      if (isTemplateDriven) {
        payload.dynamic_ratings = dynamicRatings;
        payload.dynamic_responses = dynamicResponses;
      } else {
        Object.assign(payload, ratings, formData);
      }
      payload.rating_notes = ratingNotes;

      await apiPut(`/performance/reviews/${review.id}`, payload);

      // Refresh the review data
      const updatedReview = await apiGet<ReviewDetail>(`/performance/reviews/${review.id}`);
      setReview(updatedReview);

      if (action === 'submit') {
        navigate('/team/performance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  // Goal CRUD
  const handleSaveGoal = async () => {
    if (!review) return;
    try {
      if (editingGoalId) {
        await apiPut(`/performance/goals/${editingGoalId}`, goalForm);
      } else {
        await apiPost('/performance/goals', {
          ...goalForm,
          employee_id: review.employee_id,
          review_id: review.id,
          status: 'Not Started',
          priority: 'Medium',
          start_date: goalForm.start_date || new Date().toISOString().split('T')[0],
        });
      }
      // Refresh context
      const contextData = await apiGet<EmployeeContext>(`/performance/reviews/${reviewId}/employee-context`);
      setContext(contextData);
      setShowGoalForm(false);
      setEditingGoalId(null);
      setGoalForm({ goal_title: '', goal_description: '', goal_type: 'SMART Goal', target_date: '', start_date: '' });
    } catch {
      setError('Failed to save goal');
    }
  };

  const openEditGoal = (goal: GoalData) => {
    setEditingGoalId(goal.id);
    setGoalForm({
      goal_title: goal.goal_title,
      goal_description: goal.goal_description || '',
      goal_type: goal.goal_type,
      target_date: goal.target_date || '',
      start_date: goal.start_date || '',
    });
    setShowGoalForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      case 'Self-Review Complete':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'Manager Review In Progress':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'Completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Acknowledged':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'On Track': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'At Risk': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'Behind': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'Completed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const isReadOnly = review?.status === 'Completed' || review?.status === 'Acknowledged';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !review) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          <button
            onClick={() => navigate('/team/performance')}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to Performance Reviews
          </button>
        </div>
      </div>
    );
  }

  if (!review) return null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/team/performance')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Performance Reviews</span>
      </button>

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employee Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Employee ID: {review.employee_id}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{review.review_type} Review</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Review Period: {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Review Status</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(review.status)}`}>
                {review.status}
              </span>
              {isTemplateDriven && template && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Template: {template.name}</p>
              )}
            </div>
            <div className="text-right">
              {review.submitted_date && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar size={16} />
                  <span className="text-sm">Submitted: {formatDate(review.submitted_date)}</span>
                </div>
              )}
              {review.acknowledged_date && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">Acknowledged: {formatDate(review.acknowledged_date)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Self-Review Section (Collapsible) */}
      {selfReview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
        >
          <button
            onClick={() => setShowSelfReview(!showSelfReview)}
            className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-500" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Self-Review Submitted</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  by {selfReview.reviewer_name} on {formatDate(selfReview.submitted_date)}
                </p>
              </div>
            </div>
            {showSelfReview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showSelfReview && (
            <div className="p-6 space-y-6">
              {/* Self-Review Ratings */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Self-Assessment Ratings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Overall Performance', value: selfReview.overall_rating },
                    { label: 'Quality of Work', value: selfReview.quality_of_work },
                    { label: 'Collaboration', value: selfReview.collaboration },
                    { label: 'Communication', value: selfReview.communication },
                    { label: 'Leadership', value: selfReview.leadership },
                    { label: 'Technical Skills', value: selfReview.technical_skills },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <StarRatingInput value={item.value || 0} onChange={() => {}} disabled size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Self-Review Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selfReview.strengths && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Strengths</h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {selfReview.strengths}
                    </p>
                  </div>
                )}
                {selfReview.areas_for_improvement && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Areas for Improvement</h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {selfReview.areas_for_improvement}
                    </p>
                  </div>
                )}
                {selfReview.specific_examples && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Specific Examples</h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {selfReview.specific_examples}
                    </p>
                  </div>
                )}
                {selfReview.additional_comments && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Additional Comments</h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {selfReview.additional_comments}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Employee Context Panel */}
      {context && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
        >
          <button
            onClick={() => setShowContextPanel(!showContextPanel)}
            className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Target className="text-blue-500" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Employee Context</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {context.goals.length} goal{context.goals.length !== 1 ? 's' : ''}, {context.kpis.length} KPI{context.kpis.length !== 1 ? 's' : ''}
                  {context.active_pips.length > 0 && `, ${context.active_pips.length} active PIP(s)`}
                </p>
              </div>
            </div>
            {showContextPanel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showContextPanel && (
            <div className="p-6 space-y-6">
              {/* Active PIPs Warning */}
              {context.active_pips.length > 0 && (
                <div>
                  <button onClick={() => setShowPIPs(!showPIPs)} className="flex items-center gap-2 w-full text-left">
                    <AlertTriangle className="text-orange-500" size={18} />
                    <h4 className="font-medium text-orange-700 dark:text-orange-400">Active Performance Improvement Plans ({context.active_pips.length})</h4>
                    {showPIPs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showPIPs && (
                    <div className="mt-3 space-y-3">
                      {context.active_pips.map(pip => (
                        <div key={pip.id} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900 dark:text-white">{pip.title}</h5>
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs">{pip.status}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{pip.reason}</p>
                          <p className="text-xs text-gray-500">
                            {pip.start_date && `Start: ${formatDate(pip.start_date)}`}
                            {pip.end_date && ` — End: ${formatDate(pip.end_date)}`}
                          </p>
                          {pip.milestones.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {pip.milestones.map(m => (
                                <div key={m.id} className="flex items-center gap-2 text-xs">
                                  <span className={`w-2 h-2 rounded-full ${m.status === 'Completed' ? 'bg-green-500' : m.status === 'Overdue' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                  <span className="text-gray-600 dark:text-gray-400">{m.milestone_title}</span>
                                  <span className="text-gray-400">({m.status})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Goals */}
              <div>
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowGoals(!showGoals)} className="flex items-center gap-2 text-left">
                    <Target className="text-green-500" size={18} />
                    <h4 className="font-medium text-gray-900 dark:text-white">Goals ({context.goals.length})</h4>
                    {showGoals ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => { setShowGoals(true); setShowGoalForm(true); setEditingGoalId(null); setGoalForm({ goal_title: '', goal_description: '', goal_type: 'SMART Goal', target_date: '', start_date: '' }); }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Plus size={14} /> Add Goal
                    </button>
                  )}
                </div>
                {showGoals && (
                  <div className="mt-3 space-y-2">
                    {context.goals.map(goal => (
                      <div key={goal.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{goal.goal_title}</p>
                            <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${getGoalStatusColor(goal.status)}`}>{goal.status}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${goal.progress_percentage}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{goal.progress_percentage}%</span>
                            {goal.target_date && <span className="text-xs text-gray-400">{formatDate(goal.target_date)}</span>}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button onClick={() => openEditGoal(goal)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                        )}
                      </div>
                    ))}
                    {context.goals.length === 0 && <p className="text-sm text-gray-500 text-center py-2">No goals set</p>}

                    {/* Inline Goal Form */}
                    {showGoalForm && (
                      <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2 bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">{editingGoalId ? 'Edit' : 'New'} Goal</h5>
                          <button onClick={() => { setShowGoalForm(false); setEditingGoalId(null); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                        <input type="text" value={goalForm.goal_title} onChange={e => setGoalForm({ ...goalForm, goal_title: e.target.value })} placeholder="Goal title" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <textarea value={goalForm.goal_description} onChange={e => setGoalForm({ ...goalForm, goal_description: e.target.value })} placeholder="Description" rows={2} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <div className="grid grid-cols-3 gap-2">
                          <select value={goalForm.goal_type} onChange={e => setGoalForm({ ...goalForm, goal_type: e.target.value })} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                            <option value="SMART Goal">SMART Goal</option>
                            <option value="Objective">Objective</option>
                            <option value="Key Result">Key Result</option>
                            <option value="Development Goal">Development Goal</option>
                          </select>
                          <input type="date" value={goalForm.start_date} onChange={e => setGoalForm({ ...goalForm, start_date: e.target.value })} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                          <input type="date" value={goalForm.target_date} onChange={e => setGoalForm({ ...goalForm, target_date: e.target.value })} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setShowGoalForm(false); setEditingGoalId(null); }} className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
                          <button onClick={handleSaveGoal} disabled={!goalForm.goal_title.trim() || !goalForm.target_date} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* KPIs */}
              {context.kpis.length > 0 && (
                <div>
                  <button onClick={() => setShowKPIs(!showKPIs)} className="flex items-center gap-2 text-left">
                    <TrendingUp className="text-purple-500" size={18} />
                    <h4 className="font-medium text-gray-900 dark:text-white">Key Performance Indicators ({context.kpis.length})</h4>
                    {showKPIs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showKPIs && (
                    <div className="mt-3 space-y-2">
                      {context.kpis.map(kpi => (
                        <div key={kpi.id} className="py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{kpi.goal_title}</p>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${getGoalStatusColor(kpi.status)}`}>{kpi.status}</span>
                          </div>
                          {(kpi.current_value || kpi.target_value) && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {kpi.current_value || '0'} / {kpi.target_value || '—'} {kpi.unit_of_measure || ''}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Manager Review Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manager Review</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isReadOnly ? 'This review has been completed.' : 'Rate the employee and provide feedback.'}
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Ratings Section */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Performance Ratings</h4>
            <div className="space-y-1">
              {isTemplateDriven && template ? (
                /* Template-driven competency ratings */
                template.competencies.map(comp => (
                  <RatingCategory
                    key={comp.key}
                    label={comp.label}
                    description={comp.description}
                    value={dynamicRatings[comp.key] || 0}
                    onChange={(v) => setDynamicRatings(prev => ({ ...prev, [comp.key]: v }))}
                    required={comp.required}
                    disabled={isReadOnly}
                    maxStars={template.rating_scale.max}
                    note={ratingNotes[comp.key] || ''}
                    onNoteChange={(n) => setRatingNotes(prev => ({ ...prev, [comp.key]: n }))}
                  />
                ))
              ) : (
                /* Legacy hardcoded ratings */
                <>
                  {([
                    { key: 'overall_rating', label: 'Overall Rating', description: 'Overall assessment of employee performance', required: true },
                    { key: 'quality_of_work', label: 'Quality of Work', description: 'Accuracy, thoroughness, and reliability of work output', required: true },
                    { key: 'productivity', label: 'Productivity', description: 'Volume of work accomplished and efficiency', required: true },
                    { key: 'communication', label: 'Communication', description: 'Effectiveness of verbal and written communication', required: true },
                    { key: 'teamwork', label: 'Teamwork', description: 'Collaboration and cooperation with colleagues', required: true },
                    { key: 'initiative', label: 'Initiative', description: 'Proactive approach and self-motivation', required: true },
                    { key: 'leadership', label: 'Leadership', description: 'Leadership skills and ability to guide others', required: false },
                    { key: 'problem_solving', label: 'Problem Solving', description: 'Analytical thinking and solution-oriented approach', required: true },
                    { key: 'attendance_punctuality', label: 'Attendance & Punctuality', description: 'Reliability in attendance and time management', required: true },
                  ] as const).map(item => (
                    <RatingCategory
                      key={item.key}
                      label={item.label}
                      description={item.description}
                      value={ratings[item.key]}
                      onChange={(v) => handleRatingChange(item.key, v)}
                      required={item.required}
                      disabled={isReadOnly}
                      note={ratingNotes[item.key] || ''}
                      onNoteChange={(n) => setRatingNotes(prev => ({ ...prev, [item.key]: n }))}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Feedback & Development</h4>
            <div className="space-y-6">
              {isTemplateDriven && template ? (
                /* Template-driven text fields */
                template.text_fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.min_length > 0 && <span className="text-gray-400 font-normal ml-2">(min {field.min_length} characters)</span>}
                    </label>
                    <textarea
                      value={dynamicResponses[field.key] || ''}
                      onChange={(e) => setDynamicResponses(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    />
                    {field.min_length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{(dynamicResponses[field.key] || '').length}/{field.min_length} characters</p>
                    )}
                  </div>
                ))
              ) : (
                /* Legacy hardcoded text fields */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Strengths <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(min 50 characters)</span>
                    </label>
                    <textarea
                      value={formData.strengths}
                      onChange={(e) => handleTextChange('strengths', e.target.value)}
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Describe the employee's key strengths and accomplishments..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.strengths.length}/50 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Areas for Improvement <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(min 50 characters)</span>
                    </label>
                    <textarea
                      value={formData.areas_for_improvement}
                      onChange={(e) => handleTextChange('areas_for_improvement', e.target.value)}
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Identify areas where the employee can improve..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.areas_for_improvement.length}/50 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Key Achievements
                    </label>
                    <textarea
                      value={formData.achievements}
                      onChange={(e) => handleTextChange('achievements', e.target.value)}
                      disabled={isReadOnly}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Notable achievements during the review period..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Manager Comments
                    </label>
                    <textarea
                      value={formData.manager_comments}
                      onChange={(e) => handleTextChange('manager_comments', e.target.value)}
                      disabled={isReadOnly}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Additional comments or observations..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Development Plan <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(min 50 characters)</span>
                    </label>
                    <textarea
                      value={formData.development_plan}
                      onChange={(e) => handleTextChange('development_plan', e.target.value)}
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Recommended training, skills development, or career growth opportunities..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.development_plan.length}/50 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Goals for Next Period <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(min 50 characters)</span>
                    </label>
                    <textarea
                      value={formData.goals_for_next_period}
                      onChange={(e) => handleTextChange('goals_for_next_period', e.target.value)}
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Specific objectives and key results for the next review period..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.goals_for_next_period.length}/50 characters</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Employee Comments (if acknowledged) */}
          {review.employee_comments && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Employee Response</h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">{review.employee_comments}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-4">
            <button
              onClick={() => handleSave('save_draft')}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave('submit')}
              disabled={saving || !canSubmit()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              {saving ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
