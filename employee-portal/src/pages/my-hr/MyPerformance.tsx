import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { TrendingUp, AlertCircle, Star, Clock, CheckCircle, FileText, Send, Award, Target, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { RatingCategory } from '@/components/performance';

interface SelfReview {
  id: number;
  submitted_date: string | null;
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

interface CurrentReview {
  id: number;
  review_id: string;
  employee_id: string;
  cycle_id: number | null;
  cycle_name: string | null;
  review_type: string;
  review_period_start: string;
  review_period_end: string;
  reviewer_name: string | null;
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
}

interface ReviewCycle {
  id: number;
  name: string;
  cycle_type: string;
  status: string;
  start_date: string;
  end_date: string;
  review_window_start: string;
  review_window_end: string;
}

interface PastReview {
  id: number;
  review_id: string;
  cycle_name: string | null;
  review_type: string;
  review_period_start: string;
  review_period_end: string;
  status: string;
  overall_rating: number | null;
  submitted_date: string | null;
  acknowledged_date: string | null;
}

interface MyPerformanceData {
  current_review: CurrentReview | null;
  self_review: SelfReview | null;
  past_reviews: PastReview[];
  current_cycle: ReviewCycle | null;
}

// Goal interfaces
interface GoalProgressEntry {
  id: number;
  entry_date: string;
  updated_by: string | null;
  progress_percentage: number | null;
  value: number | null;
  notes: string | null;
  previous_progress: number | null;
  new_progress: number | null;
}

interface GoalMilestone {
  id: number;
  title: string;
  description: string | null;
  sequence_order: number | null;
  due_date: string | null;
  completed_date: string | null;
  status: string;
  completion_notes: string | null;
  weight: number | null;
}

interface Goal {
  id: number;
  goal_id: string;
  goal_title: string;
  goal_description: string | null;
  goal_type: string | null;
  category: string | null;
  status: string;
  priority: string | null;
  progress_percentage: number;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  measurement_criteria: string | null;
  target_value: string | null;
  current_value: string | null;
  unit_of_measure: string | null;
  tracking_type: string | null;
  counter_current: number | null;
  counter_target: number | null;
  milestones_total: number | null;
  milestones_completed: number | null;
  notes: string | null;
  last_update_notes: string | null;
  last_updated_by: string | null;
  weight: number | null;
  score: number | null;
  created_at: string;
  updated_at: string | null;
  progress_entries?: GoalProgressEntry[];
  milestones?: GoalMilestone[];
}

interface GoalsData {
  goals: Goal[];
  summary: {
    total: number;
    by_status: Record<string, number>;
    on_track_percentage: number;
    completed: number;
    in_progress: number;
    at_risk: number;
  };
}

// PIP interfaces
interface PIPNote {
  id: number;
  note_text: string;
  note_type: string | null;
  created_by: string | null;
  created_at: string;
}

interface PIPMilestone {
  id: number;
  milestone_title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  completed_date: string | null;
  notes: string | null;
}

interface PIP {
  id: number;
  pip_id: string;
  title: string;
  status: string;
  reason: string | null;
  performance_issues: string | null;
  start_date: string | null;
  end_date: string | null;
  review_frequency: string | null;
  next_review_date: string | null;
  expectations: string | null;
  success_criteria: string | null;
  support_provided: string | null;
  manager_name: string | null;
  hr_partner: string | null;
  progress_notes: string | null;
  employee_acknowledged: boolean;
  employee_acknowledgment_date: string | null;
  created_at: string;
  updated_at: string | null;
  notes?: PIPNote[];
  milestones?: PIPMilestone[];
}

interface PIPsData {
  pips: PIP[];
  has_active_pip: boolean;
}

export default function MyPerformance() {
  const [data, setData] = useState<MyPerformanceData | null>(null);
  const [goalsData, setGoalsData] = useState<GoalsData | null>(null);
  const [pipsData, setPipsData] = useState<PIPsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'goals' | 'pips'>('current');
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());

  // Self-review form state
  const [selfReviewRatings, setSelfReviewRatings] = useState({
    overall_rating: 0,
    quality_of_work: 0,
    collaboration: 0,
    communication: 0,
    leadership: 0,
    technical_skills: 0,
  });

  const [selfReviewText, setSelfReviewText] = useState({
    strengths: '',
    areas_for_improvement: '',
    specific_examples: '',
    additional_comments: '',
  });

  // Acknowledgment form state
  const [acknowledgeComments, setAcknowledgeComments] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [performanceResult, goalsResult, pipsResult] = await Promise.all([
          apiGet<MyPerformanceData>('/portal/my-hr/performance'),
          apiGet<GoalsData>('/portal/my-hr/goals'),
          apiGet<PIPsData>('/portal/my-hr/pips'),
        ]);

        setData(performanceResult);
        setGoalsData(goalsResult);
        setPipsData(pipsResult);

        // Initialize self-review form if exists
        if (performanceResult.self_review) {
          setSelfReviewRatings({
            overall_rating: performanceResult.self_review.overall_rating || 0,
            quality_of_work: performanceResult.self_review.quality_of_work || 0,
            collaboration: performanceResult.self_review.collaboration || 0,
            communication: performanceResult.self_review.communication || 0,
            leadership: performanceResult.self_review.leadership || 0,
            technical_skills: performanceResult.self_review.technical_skills || 0,
          });
          setSelfReviewText({
            strengths: performanceResult.self_review.strengths || '',
            areas_for_improvement: performanceResult.self_review.areas_for_improvement || '',
            specific_examples: performanceResult.self_review.specific_examples || '',
            additional_comments: performanceResult.self_review.additional_comments || '',
          });
        }

        // Initialize acknowledge comments if exists
        if (performanceResult.current_review?.employee_comments) {
          setAcknowledgeComments(performanceResult.current_review.employee_comments);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSelfReviewSubmit = async () => {
    if (!data?.current_review) return;

    try {
      setSubmitting(true);
      setError(null);

      await apiPost(`/performance/reviews/${data.current_review.id}/self-review`, {
        ...selfReviewRatings,
        ...selfReviewText,
      });

      // Refresh data
      const result = await apiGet<MyPerformanceData>('/portal/my-hr/performance');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit self-review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!data?.current_review) return;

    try {
      setSubmitting(true);
      setError(null);

      await apiPost(`/performance/reviews/${data.current_review.id}/acknowledge`, {
        employee_comments: acknowledgeComments || null,
      });

      // Refresh data
      const result = await apiGet<MyPerformanceData>('/portal/my-hr/performance');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge review');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitSelfReview = () => {
    // At least overall rating and one text field
    return (
      selfReviewRatings.overall_rating >= 1 &&
      selfReviewText.strengths.trim().length >= 20 &&
      selfReviewText.areas_for_improvement.trim().length >= 20
    );
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const currentReview = data?.current_review;
  const selfReview = data?.self_review;
  const reviewStatus = currentReview?.status || 'Not Started';

  // Determine what to show based on status
  const showSelfReviewForm = reviewStatus === 'Not Started' && !selfReview;
  const showWaitingForManager = reviewStatus === 'Self-Review Complete' || reviewStatus === 'Manager Review In Progress';
  const showCompletedReview = reviewStatus === 'Completed';
  const showAcknowledgedReview = reviewStatus === 'Acknowledged';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Performance</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage your performance reviews
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'current'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Current Review
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Review History ({data?.past_reviews.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'goals'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Target size={16} />
          My Goals ({goalsData?.summary.total || 0})
        </button>
        {pipsData?.has_active_pip && (
          <button
            onClick={() => setActiveTab('pips')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'pips'
                ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                : 'border-transparent text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
            }`}
          >
            <AlertTriangle size={16} />
            Development Plan
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {activeTab === 'current' && (
        <>
          {/* Current Cycle Info */}
          {data?.current_cycle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Current Review Cycle</p>
                  <h2 className="text-xl font-bold mt-1">{data.current_cycle.name}</h2>
                  <p className="text-sm text-blue-100 mt-2">
                    Review Period: {formatDate(data.current_cycle.start_date)} - {formatDate(data.current_cycle.end_date)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {data.current_cycle.status}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* No Active Review */}
          {!currentReview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
            >
              <TrendingUp className="mx-auto text-gray-400" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">No Active Review</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                You don't have any active performance reviews at this time.
              </p>
            </motion.div>
          )}

          {/* Self-Review Form */}
          {currentReview && showSelfReviewForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Self-Review</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Complete your self-assessment for the {currentReview.review_type} review period.
                </p>
              </div>

              <div className="p-6 space-y-8">
                {/* Self-Assessment Ratings */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Self-Assessment Ratings</h4>
                  <div className="space-y-1">
                    <RatingCategory
                      label="Overall Performance"
                      description="Your overall assessment of your performance"
                      value={selfReviewRatings.overall_rating}
                      onChange={(v) => setSelfReviewRatings((prev) => ({ ...prev, overall_rating: v }))}
                      required
                    />
                    <RatingCategory
                      label="Quality of Work"
                      description="The quality and accuracy of your work output"
                      value={selfReviewRatings.quality_of_work}
                      onChange={(v) => setSelfReviewRatings((prev) => ({ ...prev, quality_of_work: v }))}
                    />
                    <RatingCategory
                      label="Collaboration"
                      description="How well you work with others"
                      value={selfReviewRatings.collaboration}
                      onChange={(v) => setSelfReviewRatings((prev) => ({ ...prev, collaboration: v }))}
                    />
                    <RatingCategory
                      label="Communication"
                      description="Your communication skills"
                      value={selfReviewRatings.communication}
                      onChange={(v) => setSelfReviewRatings((prev) => ({ ...prev, communication: v }))}
                    />
                    <RatingCategory
                      label="Leadership"
                      description="Your leadership abilities"
                      value={selfReviewRatings.leadership}
                      onChange={(v) => setSelfReviewRatings((prev) => ({ ...prev, leadership: v }))}
                    />
                    <RatingCategory
                      label="Technical Skills"
                      description="Your technical competencies"
                      value={selfReviewRatings.technical_skills}
                      onChange={(v) => setSelfReviewRatings((prev) => ({ ...prev, technical_skills: v }))}
                    />
                  </div>
                </div>

                {/* Self-Assessment Text Fields */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Strengths <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(min 20 characters)</span>
                    </label>
                    <textarea
                      value={selfReviewText.strengths}
                      onChange={(e) => setSelfReviewText((prev) => ({ ...prev, strengths: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe your key strengths and accomplishments..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{selfReviewText.strengths.length}/20 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Areas for Improvement <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(min 20 characters)</span>
                    </label>
                    <textarea
                      value={selfReviewText.areas_for_improvement}
                      onChange={(e) => setSelfReviewText((prev) => ({ ...prev, areas_for_improvement: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Identify areas where you can improve..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{selfReviewText.areas_for_improvement.length}/20 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Specific Examples
                    </label>
                    <textarea
                      value={selfReviewText.specific_examples}
                      onChange={(e) => setSelfReviewText((prev) => ({ ...prev, specific_examples: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Provide specific examples of your contributions..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Comments
                    </label>
                    <textarea
                      value={selfReviewText.additional_comments}
                      onChange={(e) => setSelfReviewText((prev) => ({ ...prev, additional_comments: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any additional comments..."
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={handleSelfReviewSubmit}
                  disabled={submitting || !canSubmitSelfReview()}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  {submitting ? 'Submitting...' : 'Submit Self-Review'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Waiting for Manager */}
          {currentReview && showWaitingForManager && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Waiting for Manager Review</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
                Your self-review has been submitted. Your manager will complete their review, and you'll be notified when it's ready for your acknowledgment.
              </p>

              {/* Self-Review Summary */}
              {selfReview && (
                <div className="mt-8 text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={18} />
                    Your Self-Review (Submitted {selfReview.submitted_date ? formatDate(selfReview.submitted_date) : ''})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Overall', value: selfReview.overall_rating },
                      { label: 'Quality', value: selfReview.quality_of_work },
                      { label: 'Collaboration', value: selfReview.collaboration },
                      { label: 'Communication', value: selfReview.communication },
                      { label: 'Leadership', value: selfReview.leadership },
                      { label: 'Technical', value: selfReview.technical_skills },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                        {renderRating(item.value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Completed Review - Ready for Acknowledgment */}
          {currentReview && showCompletedReview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Alert Banner */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="text-green-500" size={20} />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Your review is ready!</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Please review the feedback below and acknowledge when ready.
                  </p>
                </div>
              </div>

              {/* Manager's Review */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manager's Review</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Reviewed by {currentReview.reviewer_name || 'Manager'} on {currentReview.submitted_date ? formatDate(currentReview.submitted_date) : ''}
                  </p>
                </div>

                <div className="p-6 space-y-8">
                  {/* Ratings Display */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Performance Ratings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Overall Rating', value: currentReview.overall_rating },
                        { label: 'Quality of Work', value: currentReview.quality_of_work },
                        { label: 'Productivity', value: currentReview.productivity },
                        { label: 'Communication', value: currentReview.communication },
                        { label: 'Teamwork', value: currentReview.teamwork },
                        { label: 'Initiative', value: currentReview.initiative },
                        { label: 'Leadership', value: currentReview.leadership },
                        { label: 'Problem Solving', value: currentReview.problem_solving },
                        { label: 'Attendance', value: currentReview.attendance_punctuality },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                          {renderRating(item.value)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Display */}
                  <div className="space-y-6">
                    {currentReview.strengths && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Strengths</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.strengths}
                        </p>
                      </div>
                    )}
                    {currentReview.areas_for_improvement && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Areas for Improvement</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.areas_for_improvement}
                        </p>
                      </div>
                    )}
                    {currentReview.achievements && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Key Achievements</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.achievements}
                        </p>
                      </div>
                    )}
                    {currentReview.manager_comments && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Manager Comments</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.manager_comments}
                        </p>
                      </div>
                    )}
                    {currentReview.development_plan && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Development Plan</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.development_plan}
                        </p>
                      </div>
                    )}
                    {currentReview.goals_for_next_period && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Goals for Next Period</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.goals_for_next_period}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acknowledgment Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Acknowledge Review</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Your Comments (Optional)
                        </label>
                        <textarea
                          value={acknowledgeComments}
                          onChange={(e) => setAcknowledgeComments(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Add any comments or feedback about this review..."
                        />
                      </div>
                      <button
                        onClick={handleAcknowledge}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={18} />
                        {submitting ? 'Processing...' : 'I Acknowledge This Review'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Acknowledged Review */}
          {currentReview && showAcknowledgedReview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Acknowledged Banner */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-center gap-3">
                <Award className="text-purple-500" size={20} />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-300">Review Acknowledged</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    You acknowledged this review on {currentReview.acknowledged_date ? formatDate(currentReview.acknowledged_date) : ''}
                  </p>
                </div>
              </div>

              {/* Full Review Display */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentReview.review_type} Review - {currentReview.cycle_name || 'Performance Review'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Review Period: {formatDate(currentReview.review_period_start)} - {formatDate(currentReview.review_period_end)}
                  </p>
                </div>

                <div className="p-6 space-y-8">
                  {/* Final Rating */}
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Overall Rating</p>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={32}
                          className={
                            star <= (currentReview.overall_rating || 0)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }
                        />
                      ))}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {currentReview.overall_rating}/5
                    </p>
                  </div>

                  {/* Detailed Ratings */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Performance Ratings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Quality of Work', value: currentReview.quality_of_work },
                        { label: 'Productivity', value: currentReview.productivity },
                        { label: 'Communication', value: currentReview.communication },
                        { label: 'Teamwork', value: currentReview.teamwork },
                        { label: 'Initiative', value: currentReview.initiative },
                        { label: 'Leadership', value: currentReview.leadership },
                        { label: 'Problem Solving', value: currentReview.problem_solving },
                        { label: 'Attendance', value: currentReview.attendance_punctuality },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                          {renderRating(item.value)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="space-y-6">
                    {currentReview.strengths && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Strengths</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.strengths}
                        </p>
                      </div>
                    )}
                    {currentReview.areas_for_improvement && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Areas for Improvement</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.areas_for_improvement}
                        </p>
                      </div>
                    )}
                    {currentReview.development_plan && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Development Plan</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.development_plan}
                        </p>
                      </div>
                    )}
                    {currentReview.goals_for_next_period && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Goals for Next Period</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          {currentReview.goals_for_next_period}
                        </p>
                      </div>
                    )}
                    {currentReview.employee_comments && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Your Comments</h5>
                        <p className="text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          {currentReview.employee_comments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700"
        >
          {data?.past_reviews && data.past_reviews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-6 py-3 font-medium">Review Period</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Cycle</th>
                    <th className="px-6 py-3 font-medium">Rating</th>
                    <th className="px-6 py-3 font-medium">Acknowledged</th>
                  </tr>
                </thead>
                <tbody>
                  {data.past_reviews.map((review) => (
                    <tr key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{review.review_type}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{review.cycle_name || '-'}</td>
                      <td className="px-6 py-4">{renderRating(review.overall_rating)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {review.acknowledged_date ? formatDate(review.acknowledged_date) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">No past reviews found.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Goals Summary Cards */}
          {goalsData && goalsData.summary.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Goals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{goalsData.summary.total}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">On Track</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{goalsData.summary.on_track_percentage}%</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{goalsData.summary.completed}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">At Risk</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{goalsData.summary.at_risk}</p>
              </motion.div>
            </div>
          )}

          {/* Goals List */}
          {goalsData && goalsData.goals.length > 0 ? (
            <div className="space-y-4">
              {goalsData.goals.map((goal, index) => {
                const isExpanded = expandedGoals.has(goal.id);
                const statusColors: Record<string, string> = {
                  'On Track': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  'Completed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                  'At Risk': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                  'Behind': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  'Not Started': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
                };
                const priorityColors: Record<string, string> = {
                  'Critical': 'text-red-600 dark:text-red-400',
                  'High': 'text-orange-600 dark:text-orange-400',
                  'Medium': 'text-yellow-600 dark:text-yellow-400',
                  'Low': 'text-gray-500 dark:text-gray-400',
                };

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Goal Header - Clickable to expand */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedGoals);
                        if (isExpanded) {
                          newExpanded.delete(goal.id);
                        } else {
                          newExpanded.add(goal.id);
                          // Fetch detailed goal data if needed
                          if (!goal.progress_entries) {
                            apiGet<Goal>(`/portal/my-hr/goals/${goal.id}`).then((detailed) => {
                              setGoalsData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      goals: prev.goals.map((g) => (g.id === goal.id ? detailed : g)),
                                    }
                                  : null
                              );
                            });
                          }
                        }
                        setExpandedGoals(newExpanded);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[goal.status] || statusColors['Not Started']}`}>
                              {goal.status}
                            </span>
                            {goal.goal_type && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                {goal.goal_type}
                              </span>
                            )}
                            {goal.priority && (
                              <span className={`text-xs font-medium ${priorityColors[goal.priority] || ''}`}>
                                {goal.priority}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{goal.goal_title}</h3>
                          {goal.goal_description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{goal.goal_description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Progress indicator */}
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(goal.progress_percentage)}%</p>
                            {goal.target_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Due {formatDate(goal.target_date)}
                              </p>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            goal.status === 'Completed'
                              ? 'bg-blue-500'
                              : goal.status === 'At Risk' || goal.status === 'Behind'
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                        />
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Goal Details */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Details</h4>
                              <div className="space-y-2 text-sm">
                                {goal.measurement_criteria && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Measurement: </span>
                                    <span className="text-gray-900 dark:text-white">{goal.measurement_criteria}</span>
                                  </div>
                                )}
                                {goal.target_value && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Target: </span>
                                    <span className="text-gray-900 dark:text-white">{goal.target_value}</span>
                                  </div>
                                )}
                                {goal.current_value && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Current: </span>
                                    <span className="text-gray-900 dark:text-white">{goal.current_value}</span>
                                  </div>
                                )}
                                {goal.tracking_type === 'counter' && goal.counter_target && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Progress: </span>
                                    <span className="text-gray-900 dark:text-white">{goal.counter_current || 0} / {goal.counter_target}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Milestones */}
                            {goal.milestones && goal.milestones.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Milestones</h4>
                                <div className="space-y-2">
                                  {goal.milestones.map((m) => (
                                    <div key={m.id} className="flex items-center gap-2 text-sm">
                                      {m.status === 'completed' ? (
                                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                                      )}
                                      <span className={m.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}>
                                        {m.title}
                                      </span>
                                      {m.due_date && (
                                        <span className="text-xs text-gray-400 ml-auto">{formatDate(m.due_date)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Progress History */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Updates</h4>
                            {goal.progress_entries && goal.progress_entries.length > 0 ? (
                              <div className="space-y-3 max-h-48 overflow-y-auto">
                                {goal.progress_entries.slice(0, 5).map((entry) => (
                                  <div key={entry.id} className="text-sm border-l-2 border-blue-400 pl-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {entry.new_progress !== null ? `${Math.round(entry.new_progress)}%` : `${Math.round(entry.progress_percentage || 0)}%`}
                                      </span>
                                      <span className="text-xs text-gray-400">{formatDate(entry.entry_date)}</span>
                                    </div>
                                    {entry.notes && (
                                      <p className="text-gray-600 dark:text-gray-400 mt-1">{entry.notes}</p>
                                    )}
                                    {entry.updated_by && (
                                      <p className="text-xs text-gray-400 mt-1">Updated by {entry.updated_by}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">No progress updates yet.</p>
                            )}

                            {/* Latest notes from supervisor */}
                            {goal.last_update_notes && (
                              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Latest Note from Supervisor</p>
                                <p className="text-sm text-blue-900 dark:text-blue-100">{goal.last_update_notes}</p>
                                {goal.last_updated_by && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">— {goal.last_updated_by}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
            >
              <Target className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">No goals have been assigned yet.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Your supervisor will set goals for you during your next review cycle.</p>
            </motion.div>
          )}
        </div>
      )}

      {/* PIPs Tab */}
      {activeTab === 'pips' && pipsData && (
        <div className="space-y-6">
          {pipsData.pips.filter((p) => ['Active', 'Extended', 'Draft'].includes(p.status)).map((pip, index) => (
            <motion.div
              key={pip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 overflow-hidden"
            >
              {/* PIP Header */}
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 border-b border-orange-200 dark:border-orange-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-orange-500" size={20} />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{pip.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {pip.start_date && pip.end_date && (
                        <>Period: {formatDate(pip.start_date)} - {formatDate(pip.end_date)}</>
                      )}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    pip.status === 'Active' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    pip.status === 'Extended' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {pip.status}
                  </span>
                </div>
              </div>

              {/* PIP Content */}
              <div className="p-6 space-y-6">
                {/* Key Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Performance Concerns</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{pip.performance_issues || pip.reason || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Expectations</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{pip.expectations || 'Not specified'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Success Criteria</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{pip.success_criteria || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Support Provided</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{pip.support_provided || 'Not specified'}</p>
                  </div>
                </div>

                {/* Review Schedule */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Check-in Frequency</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{pip.review_frequency || 'Weekly'}</p>
                    </div>
                    {pip.next_review_date && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Next Review</p>
                        <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">{formatDate(pip.next_review_date)}</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Manager</p>
                      <p className="text-sm text-gray-900 dark:text-white">{pip.manager_name || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Notes */}
                {pip.progress_notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Progress Notes</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      {pip.progress_notes}
                    </p>
                  </div>
                )}

                {/* Milestones */}
                {pip.milestones && pip.milestones.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Milestones</h4>
                    <div className="space-y-3">
                      {pip.milestones.map((m) => (
                        <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          {m.status === 'Completed' ? (
                            <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                          ) : m.status === 'Overdue' ? (
                            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 dark:text-white">{m.milestone_title}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                m.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                m.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                m.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {m.status}
                              </span>
                            </div>
                            {m.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{m.description}</p>
                            )}
                            {m.due_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Due: {formatDate(m.due_date)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acknowledgment */}
                {!pip.employee_acknowledged && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                        Please acknowledge that you have read and understand this Performance Improvement Plan.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            setSubmitting(true);
                            await apiPost(`/portal/my-hr/pips/${pip.id}/acknowledge`, {});
                            const result = await apiGet<PIPsData>('/portal/my-hr/pips');
                            setPipsData(result);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to acknowledge PIP');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        disabled={submitting}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Acknowledging...' : 'I Acknowledge This Plan'}
                      </button>
                    </div>
                  </div>
                )}

                {pip.employee_acknowledged && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle size={16} />
                    <span>Acknowledged on {pip.employee_acknowledgment_date ? formatDate(pip.employee_acknowledgment_date) : 'N/A'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
