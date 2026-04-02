import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ApprovalActionPanelProps {
  requestId: number;
  onApprove: (requestId: number, notes: string) => Promise<void>;
  onReject: (requestId: number, notes: string) => Promise<void>;
}

export default function ApprovalActionPanel({ requestId, onApprove, onReject }: ApprovalActionPanelProps) {
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  const handleAction = async (action: 'approve' | 'reject') => {
    setActing(true);
    try {
      if (action === 'approve') await onApprove(requestId, notes);
      else await onReject(requestId, notes);
      setNotes('');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Your approval is required</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add notes (optional)..."
        rows={2}
        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('approve')}
          disabled={acting}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {acting ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={acting}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}
