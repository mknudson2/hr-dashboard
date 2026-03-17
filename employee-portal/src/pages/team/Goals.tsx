import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from '@/utils/api';
import {
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  User,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  X,
  History,
  Flag,
  Hash,
  Percent,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackingTypeSelector, { type TrackingType } from '@/components/goals/TrackingTypeSelector';
import ProgressUpdateForm from '@/components/goals/ProgressUpdateForm';
import ProgressHistory from '@/components/goals/ProgressHistory';
import MilestoneManager from '@/components/goals/MilestoneManager';

interface Goal {
  id: number;
  goal_id: string;
  employee_id: string;
  employee_name: string;
  goal_title: string;
  goal_description: string;
  goal_type: string;
  category: string;
  target_date: string;
  start_date: string;
  progress_percentage: number;
  status: string;
  priority: string;
  target_value: string | null;
  current_value: string | null;
  unit_of_measure: string | null;
  measurement_criteria: string | null;
  // Enhanced tracking type fields
  tracking_type: TrackingType;
  counter_current: number | null;
  counter_target: number | null;
  average_values: Array<{ value: number; date: string; notes?: string }> | null;
  average_target: number | null;
  milestones_total: number | null;
  milestones_completed: number | null;
  is_key_result: boolean;
  // Alternate field names returned by some API responses
  title?: string;
  description?: string;
  due_date?: string;
  progress?: number;
}

interface MilestoneInput {
  title: string;
  description?: string;
  due_date?: string;
  weight?: number;
}

interface TeamMemberGoals {
  employee_id: string;
  employee_name: string;
  goals: Goal[];
  total_goals: number;
  completed_goals: number;
}

interface GoalsData {
  team_goals: TeamMemberGoals[];
  summary: {
    total_goals: number;
    completed: number;
    in_progress: number;
    at_risk: number;
  };
}

interface DirectReport {
  employee_id: string;
  first_name: string;
  last_name: string;
}

interface GoalFormData {
  employee_id: string;
  goal_title: string;
  goal_description: string;
  goal_type: string;
  category: string;
  priority: string;
  start_date: string;
  target_date: string;
  target_value: string;
  current_value: string;
  unit_of_measure: string;
  measurement_criteria: string;
  status: string;
  // Enhanced tracking type fields
  tracking_type: TrackingType;
  counter_target: number | null;
  average_target: number | null;
  milestones: MilestoneInput[];
  is_key_result: boolean;
}

const initialFormData: GoalFormData = {
  employee_id: '',
  goal_title: '',
  goal_description: '',
  goal_type: 'SMART Goal',
  category: 'Individual',
  priority: 'Medium',
  start_date: new Date().toISOString().split('T')[0],
  target_date: '',
  target_value: '',
  current_value: '',
  unit_of_measure: '',
  measurement_criteria: '',
  status: 'Not Started',
  tracking_type: 'percentage',
  counter_target: null,
  average_target: null,
  milestones: [],
  is_key_result: false,
};

export default function Goals() {
  const [data, setData] = useState<GoalsData | null>(null);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);
  const [progressValue, setProgressValue] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', due_date: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [goalsResult, reportsResult, allGoalsResult] = await Promise.all([
        apiGet<GoalsData>('/portal/team/goals'),
        apiGet<{ reports: DirectReport[]; total_count: number }>('/portal/team/reports'),
        apiGet<Goal[]>('/performance/goals'),
      ]);
      setData(goalsResult);
      setDirectReports(reportsResult.reports || []);
      setAllGoals(allGoalsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stable callback for milestone progress updates - doesn't trigger full data refresh
  const handleMilestoneProgressUpdate = useCallback(() => {
    // MilestoneManager handles its own state, no need to refetch all data
    // This prevents infinite loops from callback recreation
  }, []);

  // Close progress modal and refresh data to show updated progress on main page
  const closeProgressModal = useCallback(() => {
    setShowProgressModal(false);
    fetchData();
  }, [fetchData]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase().replace(' ', '_')) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'on_track':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'at_risk':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'behind':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'not_started':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleCreateGoal = async () => {
    if (!formData.employee_id || !formData.goal_title || !formData.target_date) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      await apiPost('/performance/goals', formData);
      setShowCreateModal(false);
      setFormData(initialFormData);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const handleEditGoal = async () => {
    if (!selectedGoal) return;

    try {
      setSaving(true);
      await apiPut(`/performance/goals/${selectedGoal.id}`, formData);
      setShowEditModal(false);
      setSelectedGoal(null);
      setFormData(initialFormData);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProgress = async (formDataSubmit?: FormData) => {
    if (!selectedGoal) return;

    try {
      setSaving(true);

      if (formDataSubmit) {
        // New FormData-based progress entry with file uploads
        await apiPostFormData(`/performance/goals/${selectedGoal.id}/progress-entry`, formDataSubmit);
      } else {
        // Legacy simple progress update
        await apiPost(`/performance/goals/${selectedGoal.id}/progress`, {
          progress_percentage: progressValue,
          notes: progressNotes || null,
          current_value: formData.current_value || null,
        });
      }

      setShowProgressModal(false);
      setSelectedGoal(null);
      setProgressValue(0);
      setProgressNotes('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;

    try {
      setSaving(true);
      await apiDelete(`/performance/goals/${selectedGoal.id}`);
      setShowDeleteConfirm(false);
      setSelectedGoal(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData({
      employee_id: goal.employee_id,
      goal_title: goal.goal_title,
      goal_description: goal.goal_description || '',
      goal_type: goal.goal_type || 'SMART Goal',
      category: goal.category || 'Individual',
      priority: goal.priority || 'Medium',
      start_date: goal.start_date?.split('T')[0] || '',
      target_date: goal.target_date?.split('T')[0] || '',
      target_value: goal.target_value || '',
      current_value: goal.current_value || '',
      unit_of_measure: goal.unit_of_measure || '',
      measurement_criteria: goal.measurement_criteria || '',
      status: goal.status || 'Not Started',
      tracking_type: goal.tracking_type || 'percentage',
      counter_target: goal.counter_target,
      average_target: goal.average_target,
      milestones: [],
      is_key_result: goal.is_key_result || false,
    });
    setShowEditModal(true);
  };

  const openDetailModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
  };

  const getTrackingTypeIcon = (type: TrackingType) => {
    switch (type) {
      case 'percentage':
      case 'target_percentage':
        return <Percent size={14} className="text-blue-500" />;
      case 'counter':
        return <Hash size={14} className="text-green-500" />;
      case 'average':
        return <TrendingUp size={14} className="text-yellow-500" />;
      case 'milestone':
        return <Flag size={14} className="text-purple-500" />;
      default:
        return <Percent size={14} className="text-blue-500" />;
    }
  };

  const addMilestoneToForm = () => {
    if (!newMilestone.title.trim()) return;
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { ...newMilestone, weight: 1 }],
    });
    setNewMilestone({ title: '', description: '', due_date: '' });
  };

  const removeMilestoneFromForm = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index),
    });
  };

  const openProgressModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setProgressValue(goal.progress_percentage || 0);
    setFormData((prev) => ({ ...prev, current_value: goal.current_value || '' }));
    setProgressNotes('');
    setShowProgressModal(true);
  };

  const openDeleteConfirm = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeleteConfirm(true);
  };

  // Find goal data from allGoals for expanded view
  const getGoalDetails = (goalId: number) => {
    return allGoals.find((g) => g.id === goalId);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Goals</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage your team's goals and KPIs
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Goal
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Target className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.summary.total_goals || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Goals</p>
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
                {data?.summary.completed || 0}
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
                {data?.summary.in_progress || 0}
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
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.summary.at_risk || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">At Risk</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Team Goals Accordion */}
      <div className="space-y-4">
        {data?.team_goals && data.team_goals.length > 0 ? (
          data.team_goals.map((member, index) => {
            const isExpanded = expandedEmployee === member.employee_id;
            const completionRate =
              member.total_goals > 0
                ? Math.round((member.completed_goals / member.total_goals) * 100)
                : 0;

            return (
              <motion.div
                key={member.employee_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedEmployee(isExpanded ? null : member.employee_id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <User className="text-blue-600 dark:text-blue-400" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {member.employee_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {member.completed_goals}/{member.total_goals} goals completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-10">
                        {completionRate}%
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-300 dark:border-gray-700"
                    >
                      <div className="p-5 space-y-4">
                        {member.goals.map((goal) => {
                          const goalDetails = getGoalDetails(goal.id) || goal;
                          return (
                            <div
                              key={goal.id}
                              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {goalDetails.goal_title || goal.title}
                                    </h4>
                                    {goal.is_key_result && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                        KPI
                                      </span>
                                    )}
                                    <span
                                      className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}
                                    >
                                      {goal.priority?.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {goalDetails.goal_description || goal.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}
                                    >
                                      {goal.status?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Due: {formatDate(goalDetails.target_date || goal.due_date || '')}
                                    </span>
                                    {goalDetails.target_value && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Target: {goalDetails.target_value} {goalDetails.unit_of_measure}
                                      </span>
                                    )}
                                  </div>
                                  {/* Tracking Type Indicator */}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                      {getTrackingTypeIcon(goalDetails.tracking_type || 'percentage')}
                                      {goalDetails.tracking_type === 'counter' && goalDetails.counter_target && (
                                        <span>{goalDetails.counter_current || 0}/{goalDetails.counter_target}</span>
                                      )}
                                      {goalDetails.tracking_type === 'milestone' && goalDetails.milestones_total && (
                                        <span>{goalDetails.milestones_completed || 0}/{goalDetails.milestones_total} milestones</span>
                                      )}
                                      {goalDetails.tracking_type === 'average' && (
                                        <span>
                                          Avg: {goalDetails.current_value || '—'}
                                          {goalDetails.average_target && ` / ${goalDetails.average_target} target`}
                                        </span>
                                      )}
                                      {goalDetails.tracking_type === 'target_percentage' && goalDetails.target_value && (
                                        <span className="flex items-center gap-1">
                                          {goalDetails.current_value || '0'} / {goalDetails.target_value} {goalDetails.unit_of_measure}
                                        </span>
                                      )}
                                    </span>
                                    {/* Target Met/Exceeded Indicator for target_percentage */}
                                    {goalDetails.tracking_type === 'target_percentage' && goalDetails.target_value && goalDetails.current_value && (
                                      (() => {
                                        const current = parseFloat(goalDetails.current_value) || 0;
                                        const target = parseFloat(goalDetails.target_value) || 0;
                                        const percentage = target > 0 ? (current / target) * 100 : 0;
                                        const isMet = current >= target;
                                        const isClose = percentage >= 90 && !isMet;

                                        if (isMet) {
                                          return (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                              <CheckCircle size={12} />
                                              Target {current > target ? 'Exceeded' : 'Met'}!
                                            </span>
                                          );
                                        } else if (isClose) {
                                          return (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                                              <Target size={12} />
                                              {Math.round(percentage)}% to target
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()
                                    )}
                                    {/* Target Met/Exceeded Indicator for average */}
                                    {goalDetails.tracking_type === 'average' && goalDetails.average_target && goalDetails.current_value && (
                                      (() => {
                                        // Use progress_percentage for consistency (avoids rounding issues)
                                        const progress = goalDetails.progress_percentage || 0;
                                        const isMet = progress >= 100;
                                        const isClose = progress >= 90 && !isMet;

                                        if (isMet) {
                                          return (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                              <CheckCircle size={12} />
                                              Target {progress > 100 ? 'Exceeded' : 'Met'}!
                                            </span>
                                          );
                                        } else if (isClose) {
                                          return (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                                              <Target size={12} />
                                              {Math.round(progress)}% to target
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()
                                    )}
                                  </div>
                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 mt-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openProgressModal(goalDetails);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                    >
                                      <TrendingUp size={14} />
                                      Update Progress
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDetailModal(goalDetails);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                    >
                                      <History size={14} />
                                      History
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(goalDetails);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                    >
                                      <Edit2 size={14} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteConfirm(goalDetails);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="w-16 h-16 relative">
                                    <svg className="w-full h-full transform -rotate-90">
                                      <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        className="text-gray-200 dark:text-gray-600"
                                      />
                                      <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(goalDetails.progress_percentage || goal.progress || 0) * 1.76} 176`}
                                        className="text-blue-500"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {Math.round(goalDetails.progress_percentage || goal.progress || 0)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
          >
            <Target className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 dark:text-gray-400 mt-4">No team goals found.</p>
            <button
              onClick={() => {
                setFormData(initialFormData);
                setShowCreateModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create First Goal
            </button>
          </motion.div>
        )}
      </div>

      {/* Create/Edit Goal Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {showEditModal ? 'Edit Goal' : 'Create New Goal'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Employee Selection (only for create) */}
                {showCreateModal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Team Member</option>
                      {directReports.map((report) => (
                        <option key={report.employee_id} value={report.employee_id}>
                          {report.first_name} {report.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Goal Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.goal_title}
                    onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter goal title"
                  />
                </div>

                {/* Goal Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.goal_description}
                    onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the goal..."
                  />
                </div>

                {/* KPI Toggle */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Key Performance Indicator (KPI)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mark as a company or department standard KPI</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_key_result: !formData.is_key_result })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.is_key_result ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_key_result ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Row: Type, Category, Priority */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.goal_type}
                      onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SMART Goal">SMART Goal</option>
                      <option value="Objective">Objective</option>
                      <option value="Key Result">Key Result</option>
                      <option value="Development Goal">Development Goal</option>
                      <option value="Project">Project</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Team">Team</option>
                      <option value="Department">Department</option>
                      <option value="Company">Company</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Row: Start Date, Target Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Tracking Type Selection (only for create) */}
                {showCreateModal && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <TrackingTypeSelector
                      value={formData.tracking_type}
                      onChange={(type) => setFormData({ ...formData, tracking_type: type })}
                    />
                  </div>
                )}

                {/* Type-Specific Configuration */}
                {showCreateModal && formData.tracking_type === 'counter' && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Count <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.counter_target || ''}
                      onChange={(e) => setFormData({ ...formData, counter_target: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., 10"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      The target number to count towards
                    </p>
                  </div>
                )}

                {showCreateModal && formData.tracking_type === 'average' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Average
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.average_target || ''}
                      onChange={(e) => setFormData({ ...formData, average_target: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                      placeholder="e.g., 4.5"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      The target average value to achieve
                    </p>
                  </div>
                )}

                {showCreateModal && formData.tracking_type === 'milestone' && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Initial Milestones
                    </h4>
                    {formData.milestones.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded p-2">
                        <Flag size={14} className="text-purple-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{m.title}</span>
                        <button
                          type="button"
                          onClick={() => removeMilestoneFromForm(idx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestoneToForm())}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="Add milestone..."
                      />
                      <button
                        type="button"
                        onClick={addMilestoneToForm}
                        disabled={!newMilestone.title.trim()}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add milestones that need to be completed. You can add more after creation.
                    </p>
                  </div>
                )}

                {/* Measurement Section (for percentage/target_percentage types) */}
                {(formData.tracking_type === 'percentage' || formData.tracking_type === 'target_percentage') && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Measurement (Optional)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Target Value
                        </label>
                        <input
                          type="text"
                          value={formData.target_value}
                          onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Current Value
                        </label>
                        <input
                          type="text"
                          value={formData.current_value}
                          onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 25"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={formData.unit_of_measure}
                          onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., %"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Status (only for edit) */}
                {showEditModal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="On Track">On Track</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Behind">Behind</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showEditModal ? handleEditGoal : handleCreateGoal}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : showEditModal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Progress Modal */}
      <AnimatePresence>
        {showProgressModal && selectedGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={closeProgressModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Progress</h2>
                  {getTrackingTypeIcon(selectedGoal.tracking_type || 'percentage')}
                </div>
                <button
                  onClick={closeProgressModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {selectedGoal.tracking_type === 'milestone' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Goal</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedGoal.goal_title}</p>
                    </div>
                    <MilestoneManager
                      goalId={selectedGoal.id}
                      onProgressUpdate={handleMilestoneProgressUpdate}
                    />
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <button
                        onClick={closeProgressModal}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <ProgressUpdateForm
                    goal={selectedGoal}
                    onSubmit={handleUpdateProgress}
                    onCancel={closeProgressModal}
                    saving={saving}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Detail Modal with History */}
      <AnimatePresence>
        {showDetailModal && selectedGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedGoal.goal_title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrackingTypeIcon(selectedGoal.tracking_type || 'percentage')}
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {(selectedGoal.tracking_type || 'percentage').replace('_', ' ')} tracking
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Goal Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedGoal.status)}`}>
                      {selectedGoal.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {Math.round(selectedGoal.progress_percentage || 0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Target Date</p>
                    <p className="text-gray-900 dark:text-white">{formatDate(selectedGoal.target_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                    <span className={`font-medium ${getPriorityColor(selectedGoal.priority)}`}>
                      {selectedGoal.priority}
                    </span>
                  </div>
                </div>

                {selectedGoal.goal_description && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                    <p className="text-gray-900 dark:text-white">{selectedGoal.goal_description}</p>
                  </div>
                )}

                {/* Type-specific info */}
                {selectedGoal.tracking_type === 'counter' && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Counter Progress</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {selectedGoal.counter_current || 0} / {selectedGoal.counter_target || '?'}
                    </p>
                  </div>
                )}

                {selectedGoal.tracking_type === 'average' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Average</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {selectedGoal.current_value || '—'}
                      {selectedGoal.average_target && (
                        <span className="text-base font-normal text-gray-500 ml-2">
                          / {selectedGoal.average_target} target
                        </span>
                      )}
                    </p>
                    {selectedGoal.average_values && (
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {selectedGoal.average_values.length} entries
                      </p>
                    )}
                  </div>
                )}

                {/* Milestones for milestone type */}
                {selectedGoal.tracking_type === 'milestone' && (
                  <MilestoneManager
                    goalId={selectedGoal.id}
                    onProgressUpdate={handleMilestoneProgressUpdate}
                  />
                )}

                {/* Progress History */}
                <ProgressHistory goalId={selectedGoal.id} />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openProgressModal(selectedGoal);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <TrendingUp size={16} />
                  Update Progress
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && selectedGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                  Delete Goal?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-center mt-2">
                  Are you sure you want to delete "{selectedGoal.goal_title}"? This action cannot be undone.
                </p>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGoal}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete Goal'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
