import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';

interface Offer {
  id: number;
  offer_id: string;
  position_title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  start_date: string | null;
  reports_to: string | null;
  salary: number | null;
  wage_type: string | null;
  signing_bonus: number | null;
  equity_details: string | null;
  benefits_summary: string | null;
  expires_at: string | null;
  contingencies: Record<string, boolean> | null;
  status: string;
  sent_at: string | null;
  is_counter_offer: boolean;
  negotiation_notes: string | null;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  Sent: { label: 'Pending Your Response', color: 'bg-purple-100 text-purple-800' },
  Accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  Declined: { label: 'Declined', color: 'bg-red-100 text-red-800' },
  Expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' },
  Rescinded: { label: 'Rescinded', color: 'bg-red-100 text-red-700' },
};

export default function OfferViewPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [responseSuccess, setResponseSuccess] = useState('');

  useEffect(() => {
    loadOffer();
  }, [offerId]);

  async function loadOffer() {
    try {
      const data = await apiGet<Offer>(`/applicant-portal/my-offers/${offerId}`);
      setOffer(data);
    } catch {
      setError('Failed to load offer details');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!confirm('Are you sure you want to accept this offer? This action cannot be undone.')) return;
    setResponding(true);
    setError('');
    try {
      await apiPost(`/applicant-portal/my-offers/${offerId}/respond`, {
        response: 'accept',
      });
      setResponseSuccess('accepted');
      await loadOffer();
    } catch {
      setError('Failed to accept offer');
    } finally {
      setResponding(false);
    }
  }

  async function handleDecline() {
    setResponding(true);
    setError('');
    try {
      await apiPost(`/applicant-portal/my-offers/${offerId}/respond`, {
        response: 'decline',
        decline_reason: declineReason || undefined,
      });
      setResponseSuccess('declined');
      setShowDeclineModal(false);
      await loadOffer();
    } catch {
      setError('Failed to decline offer');
    } finally {
      setResponding(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      </div>
    );
  }

  if (!offer) return null;

  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
  const canRespond = offer.status === 'Sent' && !isExpired;
  const statusInfo = STATUS_DISPLAY[offer.status] || { label: offer.status, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/my-applications" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to My Applications
      </Link>

      {/* Success banner */}
      {responseSuccess && (
        <div className={`mb-6 p-4 rounded-lg border ${
          responseSuccess === 'accepted'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          <p className="font-medium">
            {responseSuccess === 'accepted'
              ? 'Congratulations! You have accepted the offer.'
              : 'You have declined the offer.'}
          </p>
          <p className="text-sm mt-1">
            {responseSuccess === 'accepted'
              ? 'The HR team will be in touch with next steps.'
              : 'Thank you for considering this opportunity.'}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{offer.position_title}</h1>
            <p className="text-gray-600 mt-1">Offer ID: {offer.offer_id}</p>
            {offer.is_counter_offer && (
              <p className="text-sm text-amber-700 mt-1">This is a revised offer</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        {isExpired && offer.status === 'Sent' && (
          <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-sm">
            This offer has expired. Please contact HR if you have questions.
          </div>
        )}
      </div>

      {/* Position Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Position Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {offer.department && <DetailRow label="Department" value={offer.department} />}
          {offer.location && <DetailRow label="Location" value={offer.location} />}
          {offer.employment_type && <DetailRow label="Employment Type" value={offer.employment_type} />}
          {offer.start_date && (
            <DetailRow label="Start Date" value={new Date(offer.start_date).toLocaleDateString()} />
          )}
          {offer.reports_to && <DetailRow label="Reports To" value={offer.reports_to} />}
        </dl>
      </div>

      {/* Compensation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensation</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {offer.salary && (
            <DetailRow
              label="Salary"
              value={`$${offer.salary.toLocaleString()} ${offer.wage_type || 'Annual'}`}
            />
          )}
          {offer.signing_bonus && (
            <DetailRow label="Signing Bonus" value={`$${offer.signing_bonus.toLocaleString()}`} />
          )}
        </dl>
        {offer.equity_details && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-gray-500">Equity</dt>
            <dd className="mt-1 text-sm text-gray-900">{offer.equity_details}</dd>
          </div>
        )}
        {offer.benefits_summary && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-gray-500">Benefits</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{offer.benefits_summary}</dd>
          </div>
        )}
      </div>

      {/* Contingencies */}
      {offer.contingencies && Object.keys(offer.contingencies).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contingencies</h2>
          <p className="text-sm text-gray-600 mb-3">This offer is contingent upon completion of:</p>
          <ul className="space-y-2">
            {Object.entries(offer.contingencies)
              .filter(([, v]) => v)
              .map(([key]) => (
                <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Expiration */}
      {offer.expires_at && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Response Deadline</h2>
          <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
            {isExpired ? 'Expired on ' : 'Please respond by '}
            <strong>{new Date(offer.expires_at).toLocaleDateString()}</strong>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {canRespond && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Response</h2>
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={responding}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 text-center"
            >
              {responding ? 'Processing...' : 'Accept Offer'}
            </button>
            <button
              onClick={() => setShowDeclineModal(true)}
              disabled={responding}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 text-center"
            >
              Decline Offer
            </button>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Decline Offer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to decline this offer? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="We appreciate your feedback..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={responding}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {responding ? 'Processing...' : 'Decline Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
