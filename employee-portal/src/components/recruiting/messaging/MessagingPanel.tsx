import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Lock } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/api';

interface Thread {
  thread_id: string;
  application_id: number;
  applicant_name?: string;
  subject: string;
  last_message_at: string;
  unread_count: number;
  message_count: number;
}

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
  const d = new Date(dateStr);
  const now = new Date();
  const diffHrs = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffHrs < 1) return `${Math.round(diffHrs * 60)}m ago`;
  if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface MessagingPanelProps {
  requisitionId: number;
}

export default function MessagingPanel({ requisitionId }: MessagingPanelProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadThreads(); }, [requisitionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadThreads = async () => {
    try {
      const data = await apiGet<{ threads: Thread[] }>(
        `/portal/hiring-manager/requisitions/${requisitionId}/messages`
      );
      setThreads(data.threads || []);
    } catch (e) {
      console.error('Failed to load threads:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const data = await apiGet<{ messages: Message[] }>(
        `/portal/hiring-manager/requisitions/${requisitionId}/messages?thread_id=${threadId}`
      );
      setMessages(data.messages || []);
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectThread = (thread: Thread) => {
    setSelectedThread(thread);
    loadMessages(thread.thread_id);
  };

  const handleSend = async () => {
    if (!body.trim() || !selectedThread || sending) return;
    setSending(true);
    try {
      await apiPost(
        `/portal/hiring-manager/requisitions/${requisitionId}/messages`,
        { thread_id: selectedThread.thread_id, body: body.trim(), is_internal: isInternal }
      );
      setBody('');
      setIsInternal(false);
      await loadThreads();
      await loadMessages(selectedThread.thread_id);
    } finally {
      setSending(false);
    }
  };

  const totalUnread = threads.reduce((n, t) => n + t.unread_count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Messages</h3>
        {totalUnread > 0 && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
            {totalUnread}
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden" style={{ height: '360px' }}>
        <div className="flex h-full">
          {/* Thread list */}
          <div className="w-56 border-r dark:border-gray-700 overflow-y-auto p-2 flex-shrink-0">
            {loadingThreads ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse h-12 bg-gray-100 dark:bg-gray-700 rounded" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
                No threads yet
              </div>
            ) : (
              <div className="space-y-1">
                {threads.map(t => (
                  <button
                    key={t.thread_id}
                    onClick={() => handleSelectThread(t)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      selectedThread?.thread_id === t.thread_id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900 dark:text-white truncate text-xs">{t.subject}</span>
                      {t.unread_count > 0 && (
                        <span className="w-4 h-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold flex-shrink-0">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                    {t.applicant_name && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{t.applicant_name}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedThread ? (
              <>
                <div className="px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex-shrink-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedThread.subject}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {loadingMessages ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded" />
                      ))}
                    </div>
                  ) : messages.map(msg => (
                    <div key={msg.id} className={`rounded-lg p-2.5 text-xs ${
                      msg.is_internal
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${senderColors[msg.sender_type] || ''}`}>
                            {senderLabels[msg.sender_type]}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{msg.sender_name}</span>
                          {msg.is_internal && <Lock className="w-2.5 h-2.5 text-yellow-500" />}
                        </div>
                        <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                {/* Compose */}
                <div className="border-t dark:border-gray-700 p-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder="Type a message..."
                      rows={2}
                      className="flex-1 border dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-700 dark:text-white resize-none"
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={handleSend} disabled={!body.trim() || sending}
                        className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setIsInternal(v => !v)}
                        className={`px-1.5 py-1 rounded text-[9px] ${
                          isInternal ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-gray-400 hover:text-gray-600'
                        }`} title={isInternal ? 'Internal note' : 'Toggle internal'}>
                        <Lock className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
                Select a thread
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
