import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Award, MessageSquare, AlertTriangle, BarChart3, Plus, Calendar, TrendingUp, Users } from 'lucide-react';
import { ReviewCycleModal, PerformanceReviewModal, GoalModal, FeedbackModal, PIPModal } from '@/components/PerformanceModals';

type TabType = 'dashboard' | 'reviews' | 'goals' | 'feedback' | 'pips';

interface DashboardMetrics {
  active_review_cycles: number;
  total_reviews: number;
  completed_reviews: number;
  completion_rate: number;
  active_goals: number;
  goals_on_track: number;
  goal_success_rate: number;
  active_pips: number;
  pending_feedback: number;
  rating_stats: {
    average: number;
    min: number;
    max: number;
  };
}

interface ReviewCycle {
  id: number;
  name: string;
  cycle_type: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  review_window_start: string;
  review_window_end: string;
  status: string;
  completion_percentage: number;
}

interface PerformanceReview {
  id: number;
  review_id: string;
  employee_id: string;
  employee_name?: string;
  cycle_id: number;
  cycle_name?: string;
  reviewer_id: string;
  reviewer_name?: string;
  review_type: string;
  review_date: string;
  status: string;
  overall_rating?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals_achieved?: string;
  development_plan?: string;
}

interface Goal {
  id: number;
  goal_id: string;
  employee_id: string;
  employee_name?: string;
  cycle_id?: number;
  goal_type: string;
  goal_title: string;
  goal_description?: string;
  target_date: string;
  status: string;
  progress_percentage: number;
  weight?: number;
}

interface Feedback {
  id: number;
  feedback_id: string;
  employee_id: string;
  employee_name?: string;
  reviewer_id: string;
  reviewer_name?: string;
  feedback_type: string;
  relationship: string;
  feedback_date: string;
  status: string;
  rating?: number;
  comments?: string;
  is_anonymous: boolean;
}

interface PIP {
  id: number;
  pip_id: string;
  employee_id: string;
  employee_name?: string;
  manager_id: string;
  manager_name?: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  success_criteria?: string;
}

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);

  // Review data
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);

  // Goal data
  const [goals, setGoals] = useState<Goal[]>([]);

  // Feedback data
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);

  // PIP data
  const [pips, setPips] = useState<PIP[]>([]);

  // Modal states
  const [showReviewCycleModal, setShowReviewCycleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPIPModal, setShowPIPModal] = useState(false);

  // Employees for dropdowns
  const [employees, setEmployees] = useState<Array<{ employee_id: string; first_name: string; last_name: string }>>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    // Load employees for dropdowns
    const loadEmployees = async () => {
      try {
        const response = await fetch('http://localhost:8000/analytics/employees');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
        }
      } catch (error) {
        console.error('Error loading employees:', error);
      }
    };
    loadEmployees();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const BASE_URL = 'http://localhost:8000';

      if (activeTab === 'dashboard') {
        const response = await fetch(`${BASE_URL}/performance/dashboard`);
        if (response.ok) {
          const data = await response.json();
          setDashboardMetrics(data);
        }
      } else if (activeTab === 'reviews') {
        // Load review cycles
        const cyclesResponse = await fetch(`${BASE_URL}/performance/cycles`);
        if (cyclesResponse.ok) {
          const cyclesData = await cyclesResponse.json();
          setReviewCycles(cyclesData.cycles || []);
        }

        // Load reviews
        const reviewsResponse = await fetch(`${BASE_URL}/performance/reviews`);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData || []);
        }
      } else if (activeTab === 'goals') {
        const response = await fetch(`${BASE_URL}/performance/goals`);
        if (response.ok) {
          const data = await response.json();
          setGoals(data || []);
        }
      } else if (activeTab === 'feedback') {
        const response = await fetch(`${BASE_URL}/performance/feedback`);
        if (response.ok) {
          const data = await response.json();
          setFeedbackList(data || []);
        }
      } else if (activeTab === 'pips') {
        const response = await fetch(`${BASE_URL}/performance/pips`);
        if (response.ok) {
          const data = await response.json();
          setPips(data || []);
        }
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'reviews' as const, label: 'Reviews', icon: Award },
    { id: 'goals' as const, label: 'Goals & OKRs', icon: Target },
    { id: 'feedback' as const, label: '360° Feedback', icon: MessageSquare },
    { id: 'pips' as const, label: 'PIPs', icon: AlertTriangle },
  ];

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Planned': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'Active': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Completed': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Closed': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'Submitted': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Approved': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Not Started': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'On Track': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'At Risk': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Off Track': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'Successful': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Extended': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Terminated': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !dashboardMetrics) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage performance reviews, goals, and employee development
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowReviewCycleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Review Cycle
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-2 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && dashboardMetrics && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Active Cycles</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dashboardMetrics.active_review_cycles}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">Reviews Completed</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {dashboardMetrics.completed_reviews} / {dashboardMetrics.total_reviews}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(dashboardMetrics.completed_reviews / dashboardMetrics.total_reviews) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Goals On Track</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {dashboardMetrics.goals_on_track} / {dashboardMetrics.active_goals}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Avg Rating</p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        {dashboardMetrics.rating_stats.average.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pending Feedback</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboardMetrics.pending_feedback}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active PIPs</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboardMetrics.active_pips}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-400" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Goal Success Rate</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboardMetrics.goal_success_rate.toFixed(1)}%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Coming Soon Message */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
                <Users className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Performance Dashboard
                </h3>
                <p className="text-blue-700 dark:text-blue-300 mb-4">
                  View performance metrics, trends, and insights across your organization
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Full dashboard with charts and analytics coming soon
                </p>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Reviews</h2>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Review
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No performance reviews yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Create a review cycle to start managing performance reviews
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Cycle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {reviews.map((review) => (
                        <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {review.employee_name || review.employee_id}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {review.review_id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {review.cycle_name || `Cycle ${review.cycle_id}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {review.review_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {review.overall_rating ? (
                              <div className="flex items-center">
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                  {review.overall_rating}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/5</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(review.status)}`}>
                              {review.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(review.review_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Goals & OKRs</h2>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Goal
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading goals...</p>
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No goals defined yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Create goals and OKRs to track employee performance
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            goal.goal_type === 'OKR' ? 'bg-purple-100 dark:bg-purple-900' :
                            goal.goal_type === 'SMART' ? 'bg-blue-100 dark:bg-blue-900' :
                            'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <Target className={`w-5 h-5 ${
                              goal.goal_type === 'OKR' ? 'text-purple-600 dark:text-purple-400' :
                              goal.goal_type === 'SMART' ? 'text-blue-600 dark:text-blue-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{goal.goal_title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {goal.employee_name || goal.employee_id}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                          {goal.status}
                        </span>
                      </div>

                      {goal.goal_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {goal.goal_description}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {goal.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${goal.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDate(goal.target_date)}</span>
                        </div>
                        {goal.weight && (
                          <div className="text-gray-600 dark:text-gray-400">
                            Weight: {goal.weight}%
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">360° Feedback</h2>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Request Feedback
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading feedback...</p>
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No feedback collected yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Request 360° feedback to gather comprehensive performance insights
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackList.map((feedback) => (
                    <motion.div
                      key={feedback.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {feedback.employee_name || feedback.employee_id}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>From: {feedback.is_anonymous ? 'Anonymous' : (feedback.reviewer_name || feedback.reviewer_id)}</span>
                            <span>•</span>
                            <span>{feedback.relationship}</span>
                            <span>•</span>
                            <span>{formatDate(feedback.feedback_date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(feedback.status)}`}>
                            {feedback.status}
                          </span>
                          {feedback.rating && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                              <span>⭐</span>
                              <span>{feedback.rating}/5</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {feedback.comments && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{feedback.comments}</p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {feedback.feedback_type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {feedback.feedback_id}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PIPs Tab */}
          {activeTab === 'pips' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Improvement Plans</h2>
                <button
                  onClick={() => setShowPIPModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New PIP
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading PIPs...</p>
                </div>
              ) : pips.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No active PIPs</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Performance Improvement Plans will appear here when created
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pips.map((pip) => (
                    <motion.div
                      key={pip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-700 border-l-4 border-orange-500 shadow-sm rounded-r-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {pip.employee_name || pip.employee_id}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>Manager: {pip.manager_name || pip.manager_id}</span>
                            <span>•</span>
                            <span>ID: {pip.pip_id}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(pip.status)}`}>
                          {pip.status}
                        </span>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">Reason</h4>
                        <p className="text-sm text-orange-800 dark:text-orange-200">{pip.reason}</p>
                      </div>

                      {pip.success_criteria && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Success Criteria</h4>
                          <p className="text-sm text-green-800 dark:text-green-200">{pip.success_criteria}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Start: {formatDate(pip.start_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>End: {formatDate(pip.end_date)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ReviewCycleModal
        isOpen={showReviewCycleModal}
        onClose={() => setShowReviewCycleModal(false)}
        onSuccess={() => {
          setShowReviewCycleModal(false);
          loadData();
        }}
      />

      <PerformanceReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSuccess={() => {
          setShowReviewModal(false);
          loadData();
        }}
        employees={employees}
        cycles={reviewCycles}
      />

      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSuccess={() => {
          setShowGoalModal(false);
          loadData();
        }}
        employees={employees}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSuccess={() => {
          setShowFeedbackModal(false);
          loadData();
        }}
        employees={employees}
      />

      <PIPModal
        isOpen={showPIPModal}
        onClose={() => setShowPIPModal(false)}
        onSuccess={() => {
          setShowPIPModal(false);
          loadData();
        }}
        employees={employees}
      />
    </div>
  );
}
