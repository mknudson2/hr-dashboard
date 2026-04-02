import { MessageSquare, ChevronRight } from 'lucide-react';

interface ThreadItem {
  thread_id: string;
  application_id: number;
  applicant_name?: string;
  job_title?: string;
  subject: string;
  last_message_at: string;
  unread_count: number;
  message_count: number;
}

interface ThreadListProps {
  threads: ThreadItem[];
  selectedThreadId?: string;
  onSelect: (thread: ThreadItem) => void;
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffHrs < 1) return `${Math.round(diffHrs * 60)}m ago`;
  if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ThreadList({ threads, selectedThreadId, onSelect, loading }: ThreadListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {threads.map(thread => (
        <button
          key={thread.thread_id}
          onClick={() => onSelect(thread)}
          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
            selectedThreadId === thread.thread_id
              ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {thread.subject}
                </span>
                {thread.unread_count > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {thread.unread_count > 99 ? '99+' : thread.unread_count}
                  </span>
                )}
              </div>
              {thread.applicant_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {thread.applicant_name}{thread.job_title ? ` · ${thread.job_title}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-gray-400">{formatDate(thread.last_message_at)}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
