import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPut } from '@/utils/api';
import { ArrowLeft, User, Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Save, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { RatingCategory, StarRatingInput } from '@/components/performance';

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
  created_at: string;
}

interface EmployeeInfo {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
}

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

  // Form state for ratings
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

  // Form state for text fields
  const [formData, setFormData] = useState({
    strengths: '',
    areas_for_improvement: '',
    achievements: '',
    manager_comments: '',
    development_plan: '',
    goals_for_next_period: '',
  });

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

        // Initialize form with existing data
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

        // Fetch employee info
        // Note: This would ideally come with the review data
        // For now we'll construct a basic info object
        setEmployee({
          employee_id: reviewData.employee_id,
          first_name: '',
          last_name: '',
          department: '',
          position: '',
        });
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

  const canSubmit = () => {
    // Check required ratings (all except leadership)
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

    // Check required text fields (min 50 chars)
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

      await apiPut(`/performance/reviews/${review.id}`, {
        ...ratings,
        ...formData,
        action,
      });

      // Refresh the review data
      const updatedReview = await apiGet<ReviewDetail>(`/performance/reviews/${review.id}`);
      setReview(updatedReview);

      if (action === 'submit') {
        // Navigate back to the list after successful submission
        navigate('/team/performance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
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
              <RatingCategory
                label="Overall Rating"
                description="Overall assessment of employee performance"
                value={ratings.overall_rating}
                onChange={(v) => handleRatingChange('overall_rating', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Quality of Work"
                description="Accuracy, thoroughness, and reliability of work output"
                value={ratings.quality_of_work}
                onChange={(v) => handleRatingChange('quality_of_work', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Productivity"
                description="Volume of work accomplished and efficiency"
                value={ratings.productivity}
                onChange={(v) => handleRatingChange('productivity', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Communication"
                description="Effectiveness of verbal and written communication"
                value={ratings.communication}
                onChange={(v) => handleRatingChange('communication', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Teamwork"
                description="Collaboration and cooperation with colleagues"
                value={ratings.teamwork}
                onChange={(v) => handleRatingChange('teamwork', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Initiative"
                description="Proactive approach and self-motivation"
                value={ratings.initiative}
                onChange={(v) => handleRatingChange('initiative', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Leadership"
                description="Leadership skills and ability to guide others"
                value={ratings.leadership}
                onChange={(v) => handleRatingChange('leadership', v)}
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Problem Solving"
                description="Analytical thinking and solution-oriented approach"
                value={ratings.problem_solving}
                onChange={(v) => handleRatingChange('problem_solving', v)}
                required
                disabled={isReadOnly}
              />
              <RatingCategory
                label="Attendance & Punctuality"
                description="Reliability in attendance and time management"
                value={ratings.attendance_punctuality}
                onChange={(v) => handleRatingChange('attendance_punctuality', v)}
                required
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Feedback Section */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Feedback & Development</h4>
            <div className="space-y-6">
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
