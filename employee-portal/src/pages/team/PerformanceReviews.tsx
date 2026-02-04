import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import { TrendingUp, User, AlertCircle, Star, Clock, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReviewCycle {
  id: number;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface TeamMemberReview {
  id: number | null;  // null when no review exists yet
  employee_id: string;
  employee_name: string;
  review_status: string;
  self_review_submitted: boolean;
  manager_review_submitted: boolean;
  overall_rating: number | null;
  due_date: string;
}

interface PerformanceData {
  current_cycle: ReviewCycle | null;
  team_reviews: TeamMemberReview[];
  completion_stats: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
  };
}

export default function PerformanceReviews() {
  const navigate = useNavigate();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [creatingReview, setCreatingReview] = useState<string | null>(null); // employee_id being created

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const result = await apiGet<PerformanceData>('/portal/team/performance');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'not_started':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
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

  const filteredReviews = data?.team_reviews.filter((review) => {
    if (selectedStatus === 'all') return true;
    return review.review_status === selectedStatus;
  });

  const handleStartReview = async (review: TeamMemberReview) => {
    // If review already exists, navigate to it
    if (review.id) {
      navigate(`/team/performance/review/${review.id}`);
      return;
    }

    // Otherwise, create a new review first
    try {
      setCreatingReview(review.employee_id);

      // Calculate review period (current year by default)
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);

      const result = await apiPost<{ id: number }>('/performance/reviews', {
        employee_id: review.employee_id,
        cycle_id: data?.current_cycle?.id || null,
        review_type: 'Annual',
        review_period_start: startOfYear.toISOString().split('T')[0],
        review_period_end: endOfYear.toISOString().split('T')[0],
        status: 'Not Started'
      });

      navigate(`/team/performance/review/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setCreatingReview(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const completionPercentage = data?.completion_stats
    ? Math.round((data.completion_stats.completed / data.completion_stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Reviews</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your team's performance reviews
        </p>
      </div>

      {/* Current Cycle Banner */}
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
                {formatDate(data.current_cycle.start_date)} - {formatDate(data.current_cycle.end_date)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{completionPercentage}%</p>
              <p className="text-sm text-blue-100">Complete</p>
            </div>
          </div>
          <div className="mt-4 w-full h-2 bg-blue-400 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <User className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.completion_stats.total || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Reviews</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.completion_stats.completed || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.completion_stats.in_progress || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <FileText className="text-gray-600 dark:text-gray-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.completion_stats.not_started || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Not Started</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'not_started', 'in_progress', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Reviews Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
      >
        {filteredReviews && filteredReviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Self Review</th>
                  <th className="px-6 py-3 font-medium">Manager Review</th>
                  <th className="px-6 py-3 font-medium">Rating</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {review.employee_name.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{review.employee_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{review.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.review_status)}`}>
                        {review.review_status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {review.self_review_submitted ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <Clock className="text-gray-400" size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {review.manager_review_submitted ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <Clock className="text-gray-400" size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4">{renderRating(review.overall_rating)}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {formatDate(review.due_date)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleStartReview(review)}
                        disabled={creatingReview === review.employee_id}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {creatingReview === review.employee_id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Creating...
                          </>
                        ) : (
                          review.manager_review_submitted ? 'View' : 'Start Review'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <TrendingUp className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 dark:text-gray-400 mt-4">No reviews found.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
