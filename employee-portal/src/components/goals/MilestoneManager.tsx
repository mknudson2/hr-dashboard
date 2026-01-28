import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flag,
  Plus,
  Check,
  Clock,
  SkipForward,
  Trash2,
  Edit2,
  X,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

interface Milestone {
  id: number;
  title: string;
  description: string | null;
  sequence_order: number;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_date: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  weight: number;
}

interface MilestoneData {
  goal_id: number;
  goal_title: string;
  milestones_total: number;
  milestones_completed: number;
  progress_percentage: number;
  milestones: Milestone[];
}

interface MilestoneManagerProps {
  goalId: number;
  onProgressUpdate?: (progress: number) => void;
  editable?: boolean;
}

export default function MilestoneManager({
  goalId,
  onProgressUpdate,
  editable = true,
}: MilestoneManagerProps) {
  const [data, setData] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: '',
    weight: 1,
  });
  const [completionNotes, setCompletionNotes] = useState('');

  // Use ref to avoid infinite loop - onProgressUpdate can change without re-fetching
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiGet<MilestoneData>(`/performance/goals/${goalId}/milestones`);
      setData(result);
      if (onProgressUpdateRef.current) {
        onProgressUpdateRef.current(result.progress_percentage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) return;

    try {
      setSaving(true);
      await apiPost(`/performance/goals/${goalId}/milestones`, {
        title: newMilestone.title,
        description: newMilestone.description || null,
        due_date: newMilestone.due_date || null,
        weight: newMilestone.weight,
      });
      setNewMilestone({ title: '', description: '', due_date: '', weight: 1 });
      setShowAddForm(false);
      await fetchMilestones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add milestone');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    milestoneId: number,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped',
    notes?: string
  ) => {
    try {
      setSaving(true);
      const response = await fetch(`http://localhost:8000/performance/goals/milestones/${milestoneId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, completion_notes: notes || null }),
      });

      if (!response.ok) throw new Error('Failed to update milestone');

      await fetchMilestones();
      setCompletionNotes('');
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update milestone');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      setSaving(true);
      await apiDelete(`/performance/goals/milestones/${milestoneId}`);
      await fetchMilestones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete milestone');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check size={16} className="text-green-500" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-500" />;
      case 'skipped':
        return <SkipForward size={16} className="text-gray-400" />;
      default:
        return <Flag size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'skipped':
        return 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-red-600 dark:text-red-400">
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag className="text-purple-500" size={20} />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Milestones</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data?.milestones_completed || 0} of {data?.milestones_total || 0} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${data?.progress_percentage || 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(data?.progress_percentage || 0)}%
          </span>
        </div>
      </div>

      {/* Milestones list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {data?.milestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className={`
                rounded-lg border p-3 transition-colors
                ${getStatusColor(milestone.status)}
              `}
            >
              <div className="flex items-start gap-3">
                {editable && (
                  <div className="cursor-grab text-gray-400 hover:text-gray-600">
                    <GripVertical size={16} />
                  </div>
                )}

                <button
                  onClick={() => {
                    if (milestone.status === 'completed') {
                      handleUpdateStatus(milestone.id, 'pending');
                    } else {
                      handleUpdateStatus(milestone.id, 'completed');
                    }
                  }}
                  disabled={saving}
                  className="mt-0.5"
                >
                  {getStatusIcon(milestone.status)}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className={`font-medium ${
                          milestone.status === 'completed'
                            ? 'text-gray-500 dark:text-gray-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {milestone.title}
                      </p>
                      {milestone.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {milestone.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {milestone.due_date && (
                          <span>Due: {formatDate(milestone.due_date)}</span>
                        )}
                        {milestone.completed_date && (
                          <span className="text-green-600 dark:text-green-400">
                            Completed: {formatDate(milestone.completed_date)}
                          </span>
                        )}
                        {milestone.weight !== 1 && (
                          <span>Weight: {milestone.weight}x</span>
                        )}
                      </div>
                      {milestone.completion_notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                          "{milestone.completion_notes}"
                        </p>
                      )}
                    </div>

                    {editable && (
                      <div className="flex items-center gap-1 ml-2">
                        {milestone.status !== 'completed' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(milestone.id, 'in_progress')}
                              disabled={saving || milestone.status === 'in_progress'}
                              className={`p-1 rounded transition-colors ${
                                milestone.status === 'in_progress'
                                  ? 'text-blue-500'
                                  : 'text-gray-400 hover:text-blue-500'
                              }`}
                              title="Mark as in progress"
                            >
                              <Clock size={14} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(milestone.id, 'skipped')}
                              disabled={saving}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                              title="Skip milestone"
                            >
                              <SkipForward size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteMilestone(milestone.id)}
                          disabled={saving}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Delete milestone"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(!data?.milestones || data.milestones.length === 0) && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Flag className="mx-auto mb-2" size={24} />
            <p>No milestones yet</p>
          </div>
        )}
      </div>

      {/* Add milestone form */}
      {editable && (
        <AnimatePresence>
          {showAddForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">Add Milestone</h4>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="Milestone title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newMilestone.due_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newMilestone.weight}
                    onChange={(e) =>
                      setNewMilestone({ ...newMilestone, weight: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMilestone}
                  disabled={saving || !newMilestone.title.trim()}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
            >
              <Plus size={16} />
              Add Milestone
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
