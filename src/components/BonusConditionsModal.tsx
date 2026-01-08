import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Edit2, Trash2, Calendar, Target, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BASE_URL = '';

interface BonusCondition {
  id: number;
  bonus_id: number;
  condition_text: string;
  is_completed: boolean;
  completion_date?: string;
  completed_by?: string;
  target_value?: string;
  actual_value?: string;
  due_date?: string;
  weight?: number;
  notes?: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface BonusConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bonusId: number;
  employeeName: string;
  bonusType: string;
  bonusAmount: number;
}

export default function BonusConditionsModal({
  isOpen,
  onClose,
  bonusId,
  employeeName,
  bonusType,
  bonusAmount,
}: BonusConditionsModalProps) {
  const { user } = useAuth();
  const [conditions, setConditions] = useState<BonusCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCondition, setEditingCondition] = useState<BonusCondition | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [formData, setFormData] = useState({
    condition_text: '',
    target_value: '',
    due_date: '',
    weight: '',
    notes: '',
  });

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<BonusCondition | null>(null);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConditions();
    }
  }, [isOpen, bonusId]);

  const loadConditions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/compensation/bonuses/${bonusId}/conditions`);
      const data = await response.json();
      setConditions(data.conditions || []);
      setCompletionPercentage(data.completion_percentage || 0);
    } catch (error) {
      console.error('Error loading conditions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        bonus_id: bonusId,
        condition_text: formData.condition_text,
        target_value: formData.target_value || null,
        due_date: formData.due_date || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes || null,
        display_order: conditions.length,
      };

      if (editingCondition) {
        await fetch(`${BASE_URL}/compensation/bonus-conditions/${editingCondition.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${BASE_URL}/compensation/bonus-conditions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setFormData({
        condition_text: '',
        target_value: '',
        due_date: '',
        weight: '',
        notes: '',
      });
      setShowAddForm(false);
      setEditingCondition(null);
      loadConditions();
    } catch (error) {
      console.error('Error saving condition:', error);
      alert('Failed to save condition');
    }
  };

  const handleToggleComplete = async (condition: BonusCondition) => {
    try {
      if (condition.is_completed) {
        // Uncomplete
        const response = await fetch(`${BASE_URL}/compensation/bonus-conditions/${condition.id}/uncomplete`, {
          method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to uncomplete condition');
      } else {
        // Complete - auto-populate with current user (send as query parameter)
        const completedBy = encodeURIComponent(user?.full_name || 'Unknown User');
        const response = await fetch(
          `${BASE_URL}/compensation/bonus-conditions/${condition.id}/complete?completed_by=${completedBy}`,
          {
            method: 'POST',
          }
        );
        if (!response.ok) throw new Error('Failed to complete condition');
      }
      await loadConditions();
    } catch (error) {
      console.error('Error toggling condition:', error);
      alert('Failed to update condition');
    }
  };

  const handleOpenNotesModal = (condition: BonusCondition) => {
    setSelectedCondition(condition);
    setNotesInput(condition.notes || '');
    setShowNotesModal(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedCondition) return;

    try {
      const response = await fetch(`${BASE_URL}/compensation/bonus-conditions/${selectedCondition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notesInput || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save notes');

      setShowNotesModal(false);
      setSelectedCondition(null);
      setNotesInput('');
      await loadConditions();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this condition?')) return;
    try {
      await fetch(`${BASE_URL}/compensation/bonus-conditions/${id}`, {
        method: 'DELETE',
      });
      loadConditions();
    } catch (error) {
      console.error('Error deleting condition:', error);
      alert('Failed to delete condition');
    }
  };

  const handleEdit = (condition: BonusCondition) => {
    setEditingCondition(condition);
    setFormData({
      condition_text: condition.condition_text,
      target_value: condition.target_value || '',
      due_date: condition.due_date || '',
      weight: condition.weight?.toString() || '',
      notes: condition.notes || '',
    });
    setShowAddForm(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bonus Conditions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {employeeName} - {bonusType} Bonus (${bonusAmount.toLocaleString()})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          {conditions.length > 0 && (
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {completionPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Add Button */}
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
                  >
                    <Plus className="w-5 h-5" />
                    Add Condition
                  </button>
                )}

                {/* Add/Edit Form */}
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {editingCondition ? 'Edit Condition' : 'Add New Condition'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Condition Description *
                        </label>
                        <textarea
                          value={formData.condition_text}
                          onChange={(e) =>
                            setFormData({ ...formData, condition_text: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          rows={3}
                          required
                          placeholder="e.g., Achieve 100% of sales quota for Q1"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Target Value
                          </label>
                          <input
                            type="text"
                            value={formData.target_value}
                            onChange={(e) =>
                              setFormData({ ...formData, target_value: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g., $100,000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) =>
                              setFormData({ ...formData, due_date: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Weight (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.weight}
                            onChange={(e) =>
                              setFormData({ ...formData, weight: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g., 25"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          rows={2}
                          placeholder="Additional details or requirements"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {editingCondition ? 'Update' : 'Add'} Condition
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setEditingCondition(null);
                            setFormData({
                              condition_text: '',
                              target_value: '',
                              due_date: '',
                              weight: '',
                              notes: '',
                            });
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Conditions List */}
                {conditions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No conditions defined yet. Add conditions to track bonus requirements.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <motion.div
                        key={condition.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border rounded-lg p-4 ${
                          condition.is_completed
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleComplete(condition)}
                            className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              condition.is_completed
                                ? 'bg-green-600 border-green-600'
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                            }`}
                          >
                            {condition.is_completed && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-gray-900 dark:text-white font-medium ${
                                condition.is_completed ? 'line-through text-gray-600' : ''
                              }`}
                            >
                              {condition.condition_text}
                            </p>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {condition.target_value && (
                                <div className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  <span>Target: {condition.target_value}</span>
                                </div>
                              )}
                              {condition.due_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Due: {condition.due_date}</span>
                                </div>
                              )}
                              {condition.weight && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                                  {condition.weight}%
                                </span>
                              )}
                            </div>

                            {condition.is_completed && (
                              <div className="mt-2 space-y-2">
                                <div className="text-sm text-green-700 dark:text-green-400">
                                  ✓ Completed on {condition.completion_date} by{' '}
                                  {condition.completed_by}
                                </div>
                                {condition.notes && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded p-2">
                                    <span className="font-medium">Notes:</span> {condition.notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1">
                            {condition.is_completed && (
                              <button
                                onClick={() => handleOpenNotesModal(condition)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Add/Edit Notes"
                              >
                                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(condition)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(condition.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>

        {/* Notes Modal - Light overlay, no blackout */}
        <AnimatePresence>
          {showNotesModal && selectedCondition && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
              onClick={() => setShowNotesModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border-2 border-purple-500"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Add Notes
                  </h3>
                  <button
                    onClick={() => setShowNotesModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {selectedCondition.condition_text}
                  </p>
                  <textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                    placeholder="Add notes about this condition..."
                  />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowNotesModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Save Notes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
