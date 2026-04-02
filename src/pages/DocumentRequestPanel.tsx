import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiFetch } from '@/utils/api';

interface DocumentRequest {
  id: number;
  application_id: number;
  applicant_id: number;
  document_type: string;
  description: string | null;
  is_required: boolean;
  due_date: string | null;
  status: string;
  file_upload_id: number | null;
  rejection_reason: string | null;
  reminder_count: number;
  created_at: string;
  updated_at: string;
}

interface DocRequestForm {
  document_type: string;
  description: string;
  is_required: boolean;
  due_date: string;
}

const DOCUMENT_TYPES = [
  'resume',
  'cover_letter',
  'portfolio',
  'certification',
  'transcript',
  'reference_letter',
  'background_check_consent',
  'identification',
  'work_authorization',
  'i9_verification',
  'other',
];

const STATUS_COLORS: Record<string, string> = {
  Requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export default function DocumentRequestPanel() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId');

  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DocRequestForm>({
    document_type: 'resume',
    description: '',
    is_required: true,
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviewModal, setReviewModal] = useState<{ req: DocumentRequest; action: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (applicationId) loadRequests();
  }, [applicationId]);

  async function loadRequests() {
    try {
      const data = await apiGet<DocumentRequest[]>(`/recruiting/document-requests?application_id=${applicationId}`);
      setRequests(data);
    } catch {
      setError('Failed to load document requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!applicationId) return;
    setSaving(true);
    setError('');
    try {
      await apiPost('/recruiting/document-requests', {
        application_id: parseInt(applicationId),
        document_type: form.document_type,
        description: form.description || null,
        is_required: form.is_required,
        due_date: form.due_date || null,
      });
      setShowForm(false);
      setForm({ document_type: 'resume', description: '', is_required: true, due_date: '' });
      await loadRequests();
    } catch {
      setError('Failed to create document request');
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(reqId: number, action: string) {
    setError('');
    try {
      await apiFetch(`/recruiting/document-requests/${reqId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined,
        }),
      });
      setReviewModal(null);
      setRejectionReason('');
      await loadRequests();
    } catch {
      setError(`Failed to ${action} document`);
    }
  }

  async function handleRemind(reqId: number) {
    setError('');
    try {
      await apiPost(`/recruiting/document-requests/${reqId}/remind`);
      await loadRequests();
    } catch {
      setError('Failed to send reminder');
    }
  }

  if (!applicationId) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">No application selected. Use ?applicationId= parameter.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Request Document'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">New Document Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
              <select
                value={form.document_type}
                onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
              >
                {DOCUMENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Additional details about this request..."
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={e => setForm(p => ({ ...p, is_required: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Required document
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Sending...' : 'Send Request'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No document requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {req.document_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                      {req.status}
                    </span>
                    {req.is_required && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">Required</span>
                    )}
                  </div>
                  {req.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{req.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Requested: {new Date(req.created_at).toLocaleDateString()}</span>
                    {req.due_date && <span>Due: {new Date(req.due_date).toLocaleDateString()}</span>}
                    {req.reminder_count > 0 && <span>Reminders sent: {req.reminder_count}</span>}
                  </div>
                  {req.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">Rejection reason: {req.rejection_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'Submitted' && (
                    <>
                      <button
                        onClick={() => setReviewModal({ req, action: 'accept' })}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setReviewModal({ req, action: 'reject' })}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {req.status === 'Requested' && (
                    <button
                      onClick={() => handleRemind(req.id)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Send Reminder
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {reviewModal.action === 'accept' ? 'Accept Document' : 'Reject Document'}
            </h3>
            {reviewModal.action === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {reviewModal.action === 'accept'
                ? 'Are you sure you want to accept this document?'
                : 'The applicant will be notified about the rejection.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setReviewModal(null); setRejectionReason(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(reviewModal.req.id, reviewModal.action)}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg ${
                  reviewModal.action === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewModal.action === 'accept' ? 'Accept' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
