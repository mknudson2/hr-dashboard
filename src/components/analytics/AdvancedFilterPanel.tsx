import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: string | string[];
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  groups: FilterGroup[];
}

interface AdvancedFilterPanelProps {
  fields: { id: string; label: string; type: 'text' | 'number' | 'date' | 'select'; options?: string[] }[];
  onApplyFilters: (groups: FilterGroup[]) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (filterId: string) => void;
}

export default function AdvancedFilterPanel({
  fields,
  onApplyFilters,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
}: AdvancedFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
    {
      id: '1',
      logic: 'AND',
      conditions: [],
    },
  ]);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' },
  ];

  const addCondition = (groupId: string) => {
    setFilterGroups((groups) =>
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                {
                  id: Date.now().toString(),
                  field: fields[0]?.id || '',
                  operator: 'equals',
                  value: '',
                },
              ],
            }
          : group
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setFilterGroups((groups) =>
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.filter((c) => c.id !== conditionId),
            }
          : group
      )
    );
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    field: keyof FilterCondition,
    value: any
  ) => {
    setFilterGroups((groups) =>
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map((c) =>
                c.id === conditionId ? { ...c, [field]: value } : c
              ),
            }
          : group
      )
    );
  };

  const addGroup = () => {
    setFilterGroups([
      ...filterGroups,
      {
        id: Date.now().toString(),
        logic: 'AND',
        conditions: [],
      },
    ]);
  };

  const removeGroup = (groupId: string) => {
    if (filterGroups.length > 1) {
      setFilterGroups(filterGroups.filter((g) => g.id !== groupId));
    }
  };

  const toggleGroupLogic = (groupId: string) => {
    setFilterGroups((groups) =>
      groups.map((group) =>
        group.id === groupId
          ? { ...group, logic: group.logic === 'AND' ? 'OR' : 'AND' }
          : group
      )
    );
  };

  const handleApplyFilters = () => {
    // Filter out groups with no conditions
    const activeGroups = filterGroups.filter((g) => g.conditions.length > 0);
    onApplyFilters(activeGroups);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim() || !onSaveFilter) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      description: filterDescription,
      groups: filterGroups,
    };

    onSaveFilter(newFilter);
    setShowSaveModal(false);
    setFilterName('');
    setFilterDescription('');
  };

  const loadSavedFilter = (filter: SavedFilter) => {
    setFilterGroups(filter.groups);
  };

  const clearAllFilters = () => {
    setFilterGroups([
      {
        id: '1',
        logic: 'AND',
        conditions: [],
      },
    ]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Advanced Filters
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {filterGroups.reduce((sum, g) => sum + g.conditions.length, 0)} conditions active
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Saved Filters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map((filter) => (
                      <div
                        key={filter.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                      >
                        <button
                          onClick={() => loadSavedFilter(filter)}
                          className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                        >
                          {filter.name}
                        </button>
                        {onDeleteFilter && (
                          <button
                            onClick={() => onDeleteFilter(filter.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Groups */}
              {filterGroups.map((group, groupIndex) => (
                <div
                  key={group.id}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Group {groupIndex + 1}
                      </span>
                      <button
                        onClick={() => toggleGroupLogic(group.id)}
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          group.logic === 'AND'
                            ? 'bg-blue-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {group.logic}
                      </button>
                    </div>
                    {filterGroups.length > 1 && (
                      <button
                        onClick={() => removeGroup(group.id)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="space-y-2">
                    {group.conditions.map((condition) => (
                      <div
                        key={condition.id}
                        className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600"
                      >
                        {/* Field */}
                        <select
                          value={condition.field}
                          onChange={(e) =>
                            updateCondition(group.id, condition.id, 'field', e.target.value)
                          }
                          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {fields.map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.label}
                            </option>
                          ))}
                        </select>

                        {/* Operator */}
                        <select
                          value={condition.operator}
                          onChange={(e) =>
                            updateCondition(group.id, condition.id, 'operator', e.target.value)
                          }
                          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {operators.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {/* Value */}
                        <input
                          type="text"
                          value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
                          onChange={(e) =>
                            updateCondition(group.id, condition.id, 'value', e.target.value)
                          }
                          placeholder="Value"
                          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />

                        {/* Remove */}
                        <button
                          onClick={() => removeCondition(group.id, condition.id)}
                          className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Add Condition Button */}
                    <button
                      onClick={() => addCondition(group.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Condition
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Group Button */}
              <button
                onClick={addGroup}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Filter Group
              </button>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <div className="flex items-center gap-2">
                  {onSaveFilter && (
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  )}
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Filter Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Save Filter
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Filter Name *
                    </label>
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="e.g., Active Full-Time Employees"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={filterDescription}
                      onChange={(e) => setFilterDescription(e.target.value)}
                      placeholder="Describe what this filter is for"
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFilter}
                    disabled={!filterName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Filter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
