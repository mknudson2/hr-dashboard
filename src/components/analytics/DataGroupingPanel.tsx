import { motion } from 'framer-motion';
import { Group, TrendingUp, Calculator } from 'lucide-react';
import { useState } from 'react';

export interface GroupByConfig {
  field: string;
  order?: 'asc' | 'desc';
}

export interface AggregationConfig {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  alias?: string;
}

interface DataGroupingPanelProps {
  fields: { id: string; label: string; type: 'text' | 'number' | 'date' }[];
  onApplyGrouping: (groupBy: GroupByConfig[], aggregations: AggregationConfig[]) => void;
}

export default function DataGroupingPanel({ fields, onApplyGrouping }: DataGroupingPanelProps) {
  const [groupByFields, setGroupByFields] = useState<GroupByConfig[]>([]);
  const [aggregations, setAggregations] = useState<AggregationConfig[]>([]);

  const numericFields = fields.filter((f) => f.type === 'number');

  const addGroupBy = () => {
    if (fields.length > 0) {
      setGroupByFields([...groupByFields, { field: fields[0].id, order: 'asc' }]);
    }
  };

  const removeGroupBy = (index: number) => {
    setGroupByFields(groupByFields.filter((_, i) => i !== index));
  };

  const updateGroupBy = (index: number, updates: Partial<GroupByConfig>) => {
    setGroupByFields(
      groupByFields.map((g, i) => (i === index ? { ...g, ...updates } : g))
    );
  };

  const addAggregation = () => {
    if (numericFields.length > 0) {
      setAggregations([
        ...aggregations,
        { field: numericFields[0].id, function: 'sum' },
      ]);
    }
  };

  const removeAggregation = (index: number) => {
    setAggregations(aggregations.filter((_, i) => i !== index));
  };

  const updateAggregation = (index: number, updates: Partial<AggregationConfig>) => {
    setAggregations(
      aggregations.map((a, i) => (i === index ? { ...a, ...updates } : a))
    );
  };

  const handleApply = () => {
    onApplyGrouping(groupByFields, aggregations);
  };

  const aggregationFunctions = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Group className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Grouping & Aggregation
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Group data by fields and calculate aggregations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group By Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Group By
            </h4>
            <button
              onClick={addGroupBy}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              + Add Group
            </button>
          </div>

          <div className="space-y-2">
            {groupByFields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <Group className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  No grouping applied
                </p>
              </div>
            ) : (
              groupByFields.map((group, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg"
                >
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {index + 1}
                  </span>

                  <select
                    value={group.field}
                    onChange={(e) => updateGroupBy(index, { field: e.target.value })}
                    className="flex-1 text-sm border border-purple-300 dark:border-purple-700 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={group.order}
                    onChange={(e) =>
                      updateGroupBy(index, { order: e.target.value as 'asc' | 'desc' })
                    }
                    className="text-sm border border-purple-300 dark:border-purple-700 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="asc">↑ Asc</option>
                    <option value="desc">↓ Desc</option>
                  </select>

                  <button
                    onClick={() => removeGroupBy(index)}
                    className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    ×
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Aggregations Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Aggregations
            </h4>
            <button
              onClick={addAggregation}
              disabled={numericFields.length === 0}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Aggregation
            </button>
          </div>

          <div className="space-y-2">
            {aggregations.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <Calculator className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  No aggregations applied
                </p>
              </div>
            ) : (
              aggregations.map((agg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={agg.function}
                      onChange={(e) =>
                        updateAggregation(index, {
                          function: e.target.value as AggregationConfig['function'],
                        })
                      }
                      className="flex-1 text-sm border border-blue-300 dark:border-blue-700 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {aggregationFunctions.map((fn) => (
                        <option key={fn.value} value={fn.value}>
                          {fn.label}
                        </option>
                      ))}
                    </select>

                    <span className="text-sm text-gray-600 dark:text-gray-400">of</span>

                    <select
                      value={agg.field}
                      onChange={(e) => updateAggregation(index, { field: e.target.value })}
                      className="flex-1 text-sm border border-blue-300 dark:border-blue-700 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {numericFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => removeAggregation(index)}
                      className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <input
                    type="text"
                    value={agg.alias || ''}
                    onChange={(e) => updateAggregation(index, { alias: e.target.value })}
                    placeholder="Column alias (optional)"
                    className="w-full text-xs border border-blue-300 dark:border-blue-700 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary & Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {groupByFields.length > 0 || aggregations.length > 0 ? (
              <div className="space-y-1">
                {groupByFields.length > 0 && (
                  <p>
                    <span className="font-medium">Grouping by:</span>{' '}
                    {groupByFields
                      .map(
                        (g) =>
                          fields.find((f) => f.id === g.field)?.label || g.field
                      )
                      .join(', ')}
                  </p>
                )}
                {aggregations.length > 0 && (
                  <p>
                    <span className="font-medium">{aggregations.length}</span> aggregation
                    {aggregations.length > 1 ? 's' : ''} configured
                  </p>
                )}
              </div>
            ) : (
              <p>No grouping or aggregations configured</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setGroupByFields([]);
                setAggregations([]);
              }}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              disabled={groupByFields.length === 0 && aggregations.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Grouping
            </button>
          </div>
        </div>
      </div>

      {/* Example Output Preview */}
      {(groupByFields.length > 0 || aggregations.length > 0) && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Example Output Columns:
          </p>
          <div className="flex flex-wrap gap-2">
            {groupByFields.map((g, i) => (
              <span
                key={`group-${i}`}
                className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
              >
                {fields.find((f) => f.id === g.field)?.label || g.field}
              </span>
            ))}
            {aggregations.map((a, i) => (
              <span
                key={`agg-${i}`}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
              >
                {a.alias ||
                  `${a.function}(${
                    numericFields.find((f) => f.id === a.field)?.label || a.field
                  })`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
