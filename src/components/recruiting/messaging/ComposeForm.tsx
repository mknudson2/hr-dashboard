import { useState } from 'react';
import { Send, Lock } from 'lucide-react';

interface ComposeFormProps {
  onSend: (body: string, isInternal: boolean) => Promise<void>;
  showInternalToggle?: boolean;
  placeholder?: string;
}

export default function ComposeForm({ onSend, showInternalToggle = true, placeholder }: ComposeFormProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await onSend(body.trim(), isInternal);
      setBody('');
      setIsInternal(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t dark:border-gray-700 p-3 space-y-2">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder || 'Type a message...'}
        rows={3}
        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showInternalToggle && (
            <button
              onClick={() => setIsInternal(v => !v)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                isInternal
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              {isInternal ? 'Internal note' : 'Internal'}
            </button>
          )}
          <span className="text-[10px] text-gray-400">Ctrl+Enter to send</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || sending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
