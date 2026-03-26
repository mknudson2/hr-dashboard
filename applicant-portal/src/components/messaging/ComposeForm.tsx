import { useState } from 'react';
import { Send } from 'lucide-react';

interface ComposeFormProps {
  onSend: (body: string, stageKey?: string) => Promise<void>;
  placeholder?: string;
  stageKey?: string;
}

export default function ComposeForm({ onSend, placeholder, stageKey }: ComposeFormProps) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await onSend(body.trim(), stageKey);
      setBody('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t p-3 space-y-2">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder || 'Type a reply...'}
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Ctrl+Enter to send</span>
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
