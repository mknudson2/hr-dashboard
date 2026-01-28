import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { TrendingUp, AlertCircle, Star, Clock, CheckCircle, FileText, Send, Calendar, Award, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { RatingCategory, StarRatingInput } from '@/components/performance';

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

export default function MyPerformance() {
  const [data, setData] = useState<MyPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

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
        const result = await apiGet<MyPerformanceData>('/portal/my-hr/performance');
        setData(result);

        // Initialize self-review form if exists
        if (result.self_review) {
          setSelfReviewRatings({
            overall_rating: result.self_review.overall_rating || 0,
            quality_of_work: result.self_review.quality_of_work || 0,
            collaboration: result.self_review.collaboration || 0,
            communication: result.self_review.communication || 0,
            leadership: result.self_review.leadership || 0,
            technical_skills: result.self_review.technical_skills || 0,
          });
          setSelfReviewText({
            strengths: result.self_review.strengths || '',
            areas_for_improvement: result.self_review.areas_for_improvement || '',
            specific_examples: result.self_review.specific_examples || '',
            additional_comments: result.self_review.additional_comments || '',
          });
        }

        // Initialize acknowledge comments if exists
        if (result.current_review?.employee_comments) {
          setAcknowledgeComments(result.current_review.employee_comments);
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
    </div>
  );
}
