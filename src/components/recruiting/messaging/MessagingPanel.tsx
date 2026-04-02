import { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import ThreadList from './ThreadList';
import MessageView from './MessageView';
import ComposeForm from './ComposeForm';

const BASE_URL = '';

interface Thread {
  thread_id: string;
  application_id: number;
  applicant_name?: string;
  job_title?: string;
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

interface MessagingPanelProps {
  applicationId: number;
}

export default function MessagingPanel({ applicationId }: MessagingPanelProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadThreads(); }, [applicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadThreads = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${applicationId}/messages`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (e) {
      console.error('Failed to load threads:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${applicationId}/messages?thread_id=${threadId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectThread = (thread: Thread) => {
    setSelectedThread(thread);
    setShowNewThread(false);
    loadMessages(thread.thread_id);
  };

  const handleSend = async (body: string, isInternal: boolean) => {
    const endpoint = isInternal
      ? `${BASE_URL}/recruiting/applications/${applicationId}/messages/internal`
      : `${BASE_URL}/recruiting/applications/${applicationId}/messages`;

    const payload: Record<string, string | undefined> = { body };

    if (showNewThread) {
      payload.subject = newSubject || 'New Message';
    } else if (selectedThread) {
      payload.thread_id = selectedThread.thread_id;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (showNewThread) {
        setShowNewThread(false);
        setNewSubject('');
      }
      await loadThreads();
      if (selectedThread) await loadMessages(selectedThread.thread_id);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Messages</h3>
          {threads.reduce((n, t) => n + t.unread_count, 0) > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {threads.reduce((n, t) => n + t.unread_count, 0)}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowNewThread(true); setSelectedThread(null); }}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          New Thread
        </button>
      </div>

      <div className="flex" style={{ height: '400px' }}>
        {/* Thread sidebar */}
        <div className="w-64 border-r dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <ThreadList
            threads={threads}
            selectedThreadId={selectedThread?.thread_id}
            onSelect={handleSelectThread}
            loading={loadingThreads}
          />
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showNewThread ? (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3 border-b dark:border-gray-700">
                <input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Thread subject..."
                  className="w-full border dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex-1" />
              <ComposeForm onSend={handleSend} />
            </div>
          ) : selectedThread ? (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2.5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedThread.subject}</p>
                {selectedThread.applicant_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedThread.applicant_name}</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                <MessageView messages={messages} loading={loadingMessages} />
                <div ref={messagesEndRef} />
              </div>
              <ComposeForm onSend={handleSend} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              Select a thread or start a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
