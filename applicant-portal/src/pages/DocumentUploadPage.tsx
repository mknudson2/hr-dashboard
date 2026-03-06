import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPostFormData } from '@/utils/api';

interface DocumentRequest {
  id: number;
  application_id: number;
  document_type: string;
  description: string | null;
  is_required: boolean;
  due_date: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  Requested: { label: 'Waiting for Upload', color: 'bg-yellow-100 text-yellow-800', icon: '!' },
  Submitted: { label: 'Under Review', color: 'bg-blue-100 text-blue-800', icon: '...' },
  Accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: '✓' },
  Rejected: { label: 'Rejected — Please Resubmit', color: 'bg-red-100 text-red-800', icon: '✗' },
  Expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: '—' },
};

export default function DocumentUploadPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const data = await apiGet<DocumentRequest[]>('/applicant-portal/my-document-requests');
      setRequests(data);
    } catch {
      setError('Failed to load document requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(reqId: number) {
    const input = fileInputRefs.current[reqId];
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(reqId);
    setError('');
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiPostFormData(`/applicant-portal/my-document-requests/${reqId}/upload`, formData);
      setUploadSuccess(reqId);
      if (input) input.value = '';
      await loadRequests();
    } catch {
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'Requested' || r.status === 'Rejected').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/my-applications" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to My Applications
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Requests</h1>
        {pendingCount > 0 && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No document requests at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const statusInfo = STATUS_DISPLAY[req.status] || { label: req.status, color: 'bg-gray-100', icon: '?' };
            const needsUpload = req.status === 'Requested' || req.status === 'Rejected';
            const isUploading = uploading === req.id;
            const justUploaded = uploadSuccess === req.id;

            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {req.document_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </h3>
                    {req.description && (
                      <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>Requested: {new Date(req.created_at).toLocaleDateString()}</span>
                  {req.due_date && (
                    <span className={new Date(req.due_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                      Due: {new Date(req.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {req.is_required && <span className="text-red-600 font-medium">Required</span>}
                </div>

                {req.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 mb-3">
                    <strong>Reason for rejection:</strong> {req.rejection_reason}
                  </div>
                )}

                {justUploaded && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700 mb-3">
                    Document uploaded successfully! It will be reviewed shortly.
                  </div>
                )}

                {needsUpload && (
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={el => { fileInputRefs.current[req.id] = el; }}
                      className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <button
                      onClick={() => handleUpload(req.id)}
                      disabled={isUploading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Help text */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>Accepted formats: PDF, DOC, DOCX, JPG, PNG</li>
          <li>Maximum file size: 50MB</li>
          <li>If your document was rejected, please review the reason and upload a corrected version.</li>
        </ul>
      </div>
    </div>
  );
}
