import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost } from '@/utils/api';
import ThreadList from '@/components/messaging/ThreadList';
import MessageView from '@/components/messaging/MessageView';
import ComposeForm from '@/components/messaging/ComposeForm';
import BifrostLightCard from '@/components/bifrost-light/BifrostLightCard';

interface Thread {
  thread_id: string;
  application_id: number;
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
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) loadThreads();
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadThreads = async () => {
    try {
      const data = await apiGet<Thread[]>('/applicant-portal/my-messages');
      setThreads(data);
    } catch (e) {
      console.error('Failed to load threads:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const data = await apiGet<{ messages: Message[] }>(`/applicant-portal/my-messages/${threadId}`);
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

  const handleSend = async (body: string) => {
    if (!selectedThread) return;
    await apiPost(`/applicant-portal/my-messages/${selectedThread.thread_id}/reply`, { body });
    await loadThreads();
    await loadMessages(selectedThread.thread_id);
  };

  if (authLoading || (loadingThreads && threads.length === 0)) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-bifrost-violet" />
        <h1 className="text-xl font-bold text-[#1A1A2E]">Messages</h1>
      </div>

      <BifrostLightCard className="overflow-hidden min-h-[500px] !p-0">
        <div className="flex h-[500px]">
          {/* Thread sidebar */}
          <div className="w-72 border-r overflow-y-auto flex-shrink-0 p-2">
            <ThreadList
              threads={threads}
              selectedThreadId={selectedThread?.thread_id}
              onSelect={handleSelectThread}
              loading={loadingThreads}
            />
          </div>

          {/* Message area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedThread ? (
              <>
                <div className="px-4 py-2.5 border-b bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{selectedThread.subject}</p>
                  {selectedThread.job_title && (
                    <p className="text-xs text-gray-500">{selectedThread.job_title}</p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MessageView messages={messages} loading={loadingMessages} />
                  <div ref={messagesEndRef} />
                </div>
                <ComposeForm onSend={handleSend} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </BifrostLightCard>
    </div>
  );
}
