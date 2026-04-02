import { Eye, Lock } from 'lucide-react';

interface Message {
  id: number;
  message_id: string;
  thread_id: string;
  sender_type: 'applicant' | 'hr' | 'hiring_manager';
  sender_name: string;
  body: string;
  is_internal: boolean;
  is_read: boolean;
  created_at: string;
}

interface MessageViewProps {
  messages: Message[];
  loading?: boolean;
}

const senderColors: Record<string, string> = {
  applicant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  hr: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  hiring_manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const senderLabels: Record<string, string> = {
  applicant: 'Applicant',
  hr: 'HR',
  hiring_manager: 'Hiring Manager',
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function MessageView({ messages, loading }: MessageViewProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
        No messages in this thread
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`rounded-lg p-3 ${
            msg.is_internal
              ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
              : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${senderColors[msg.sender_type] || 'bg-gray-100 text-gray-600'}`}>
                {senderLabels[msg.sender_type] || msg.sender_type}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{msg.sender_name}</span>
              {msg.is_internal && (
                <span className="flex items-center gap-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">
                  <Lock className="w-3 h-3" /> Internal
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {msg.is_read && <Eye className="w-3 h-3 text-gray-300 dark:text-gray-500" />}
              <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.body}</p>
        </div>
      ))}
    </div>
  );
}
