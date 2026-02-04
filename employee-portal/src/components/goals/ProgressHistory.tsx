import { useState, useEffect } from 'react';
import { Clock, FileText, Image, Table, Download, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '@/utils/api';

interface Attachment {
  id: number;
  filename: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface ProgressEntry {
  id: number;
  entry_date: string;
  updated_by: string | null;
  progress_percentage: number | null;
  value: number | null;
  notes: string | null;
  previous_progress: number | null;
  new_progress: number | null;
  attachments: Attachment[];
}

interface HistoryData {
  goal_id: number;
  goal_title: string;
  tracking_type: string;
  current_progress: number;
  total_entries: number;
  entries: ProgressEntry[];
}

interface ProgressHistoryProps {
  goalId: number;
  onDownload?: (attachmentId: number) => void;
}

export default function ProgressHistory({ goalId, onDownload }: ProgressHistoryProps) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const result = await apiGet<HistoryData>(`/performance/goals/${goalId}/history`);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [goalId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={14} className="text-green-500" />;
      case 'spreadsheet':
        return <Table size={14} className="text-emerald-500" />;
      default:
        return <FileText size={14} className="text-blue-500" />;
    }
  };

  const getProgressChange = (entry: ProgressEntry) => {
    if (entry.previous_progress === null || entry.new_progress === null) return null;
    const change = entry.new_progress - entry.previous_progress;
    if (change > 0) {
      return {
        icon: <TrendingUp size={14} className="text-green-500" />,
        text: `+${change.toFixed(1)}%`,
        color: 'text-green-600 dark:text-green-400',
      };
    } else if (change < 0) {
      return {
        icon: <TrendingDown size={14} className="text-red-500" />,
        text: `${change.toFixed(1)}%`,
        color: 'text-red-600 dark:text-red-400',
      };
    }
    return {
      icon: <Minus size={14} className="text-gray-400" />,
      text: 'No change',
      color: 'text-gray-500',
    };
  };

  const handleDownload = (attachmentId: number) => {
    if (onDownload) {
      onDownload(attachmentId);
    } else {
      // Default download behavior
      window.open(`http://localhost:8000/performance/goals/attachments/${attachmentId}/download`, '_blank');
    }
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
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="mx-auto mb-2" size={24} />
        <p>No progress history yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock className="text-gray-500 dark:text-gray-400" size={20} />
          <div className="text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">Progress History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.total_entries} update{data.total_entries !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="text-gray-400" size={20} />
        ) : (
          <ChevronDown className="text-gray-400" size={20} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="max-h-96 overflow-y-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                {data.entries.map((entry, index) => {
                  const change = getProgressChange(entry);

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-12 pr-4 py-4"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-4 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800" />

                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {entry.new_progress?.toFixed(1)}%
                              </span>
                              {change && (
                                <span className={`flex items-center gap-1 text-xs ${change.color}`}>
                                  {change.icon}
                                  {change.text}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatDate(entry.entry_date)}
                              {entry.updated_by && ` by ${entry.updated_by}`}
                            </p>
                          </div>

                          {entry.value !== null && (
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                              +{entry.value}
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            {entry.notes}
                          </p>
                        )}

                        {entry.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.attachments.map((attachment) => (
                              <button
                                key={attachment.id}
                                onClick={() => handleDownload(attachment.id)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                              >
                                {getAttachmentIcon(attachment.type)}
                                <span className="truncate max-w-24">{attachment.filename}</span>
                                <span className="text-gray-400">({formatFileSize(attachment.size)})</span>
                                <Download size={12} className="text-gray-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
