import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import { CheckCircle, MessageSquare, FileText, ArrowLeft, Handshake, Download } from 'lucide-react';
import BifrostLightCard from '@/components/bifrost-light/BifrostLightCard';
import BifrostLightHero from '@/components/bifrost-light/BifrostLightHero';

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
  offer_letter_file_url: string | null;
  version: number;
  version_notes: string | null;
}

interface OfferVersion {
  id: number;
  version: number;
  status: string;
  salary: number | null;
  signing_bonus: number | null;
  sent_at: string | null;
  version_notes: string | null;
  is_counter_offer: boolean;
  is_current: boolean;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  Sent: { label: 'Pending Your Response', color: 'bg-bifrost-violet/10 text-bifrost-violet-dark' },
  Accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  Declined: { label: 'Declined', color: 'bg-red-100 text-red-800' },
  Expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' },
  Rescinded: { label: 'Rescinded', color: 'bg-red-100 text-red-700' },
  Negotiating: { label: 'Under Negotiation', color: 'bg-bridge-gold/15 text-bridge-gold-dark' },
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

  // Negotiate state
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [desiredSalary, setDesiredSalary] = useState('');
  const [desiredSigningBonus, setDesiredSigningBonus] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [negotiating, setNegotiating] = useState(false);

  // Version history state
  const [versions, setVersions] = useState<OfferVersion[]>([]);

  useEffect(() => {
    loadOffer();
  }, [offerId]);

  useEffect(() => {
    if (offer && (offer.version > 1 || offer.is_counter_offer)) {
      apiGet<{ versions: OfferVersion[] }>(`/applicant-portal/my-offers/${offerId}/versions`)
        .then(data => setVersions(data.versions))
        .catch(() => {});
    }
  }, [offer, offerId]);

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
      await apiPost(`/applicant-portal/my-offers/${offerId}/respond`, { response: 'accept' });
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

  async function handleNegotiate() {
    if (!negotiationNotes.trim()) return;
    setNegotiating(true);
    setError('');
    try {
      await apiPost(`/applicant-portal/my-offers/${offerId}/negotiate`, {
        desired_salary: desiredSalary ? parseFloat(desiredSalary) : null,
        desired_signing_bonus: desiredSigningBonus ? parseFloat(desiredSigningBonus) : null,
        desired_start_date: desiredStartDate || null,
        notes: negotiationNotes.trim(),
      });
      setShowNegotiateModal(false);
      setResponseSuccess('negotiating');
      await loadOffer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit negotiation request');
    } finally {
      setNegotiating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-frost rounded w-1/3" />
          <div className="h-64 bg-frost rounded" />
        </div>
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      </div>
    );
  }

  if (!offer) return null;

  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
  const canRespond = offer.status === 'Sent' && !isExpired;
  const statusInfo = STATUS_DISPLAY[offer.status] || { label: offer.status, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link
        to="/my-applications"
        className="flex items-center gap-1 text-sm text-bifrost-violet hover:text-bifrost-violet-dark mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        My Applications
      </Link>

      {/* Hero */}
      <BifrostLightHero
        title={offer.position_title}
        subtitle={`Offer ID: ${offer.offer_id}${offer.is_counter_offer ? ' (Revised Offer)' : ''}`}
      >
        <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </BifrostLightHero>

      {/* Success banners */}
      {responseSuccess === 'accepted' && (
        <BifrostLightCard accent="teal" className="mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-aurora-teal mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A2E]">Congratulations! You have accepted the offer.</p>
              <p className="text-sm text-[#4A4A62] mt-1">The HR team will be in touch with next steps.</p>
            </div>
          </div>
        </BifrostLightCard>
      )}
      {responseSuccess === 'declined' && (
        <BifrostLightCard className="mb-6">
          <p className="font-medium text-[#1A1A2E]">You have declined the offer.</p>
          <p className="text-sm text-[#4A4A62] mt-1">Thank you for considering this opportunity.</p>
        </BifrostLightCard>
      )}
      {responseSuccess === 'negotiating' && (
        <BifrostLightCard accent="gold" className="mb-6">
          <div className="flex items-start gap-3">
            <Handshake className="w-5 h-5 text-bridge-gold mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A2E]">Negotiation request submitted</p>
              <p className="text-sm text-[#4A4A62] mt-1">Our team will review your counter-proposal and respond shortly.</p>
            </div>
          </div>
        </BifrostLightCard>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Negotiating banner */}
      {offer.status === 'Negotiating' && !responseSuccess && (
        <BifrostLightCard accent="gold" className="mb-6">
          <div className="flex items-start gap-3">
            <Handshake className="w-5 h-5 text-bridge-gold mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A2E]">Your negotiation request is under review</p>
              <p className="text-sm text-[#4A4A62] mt-1">
                The hiring team is considering your counter-proposal. You'll be notified when they respond.
              </p>
            </div>
          </div>
        </BifrostLightCard>
      )}

      {isExpired && offer.status === 'Sent' && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-sm">
          This offer has expired. Please contact HR if you have questions.
        </div>
      )}

      {/* Position Details */}
      <BifrostLightCard className="mb-4">
        <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-4">Position Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {offer.department && <DetailRow label="Department" value={offer.department} />}
          {offer.location && <DetailRow label="Location" value={offer.location} />}
          {offer.employment_type && <DetailRow label="Employment Type" value={offer.employment_type} />}
          {offer.start_date && (
            <DetailRow label="Start Date" value={new Date(offer.start_date).toLocaleDateString()} />
          )}
          {offer.reports_to && <DetailRow label="Reports To" value={offer.reports_to} />}
        </dl>
      </BifrostLightCard>

      {/* Compensation */}
      <BifrostLightCard accent="violet" className="mb-4">
        <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-4">Compensation</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {offer.salary && (
            <DetailRow label="Salary" value={`$${offer.salary.toLocaleString()} ${offer.wage_type || 'Annual'}`} />
          )}
          {offer.signing_bonus && (
            <DetailRow label="Signing Bonus" value={`$${offer.signing_bonus.toLocaleString()}`} />
          )}
        </dl>
        {offer.equity_details && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-[#8E8E9E]">Equity</dt>
            <dd className="mt-1 text-sm text-[#1A1A2E]">{offer.equity_details}</dd>
          </div>
        )}
        {offer.benefits_summary && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-[#8E8E9E]">Benefits</dt>
            <dd className="mt-1 text-sm text-[#1A1A2E] whitespace-pre-wrap">{offer.benefits_summary}</dd>
          </div>
        )}
      </BifrostLightCard>

      {/* Contingencies */}
      {offer.contingencies && Object.keys(offer.contingencies).length > 0 && (
        <BifrostLightCard className="mb-4">
          <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-4">Contingencies</h2>
          <p className="text-sm text-[#4A4A62] mb-3">This offer is contingent upon completion of:</p>
          <ul className="space-y-2">
            {Object.entries(offer.contingencies)
              .filter(([, v]) => v)
              .map(([key]) => (
                <li key={key} className="flex items-center gap-2 text-sm text-[#1A1A2E]">
                  <div className="w-1.5 h-1.5 bg-bifrost-violet rounded-full" />
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </li>
              ))}
          </ul>
        </BifrostLightCard>
      )}

      {/* Expiration */}
      {offer.expires_at && (
        <BifrostLightCard className="mb-4">
          <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-2">Response Deadline</h2>
          <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-[#4A4A62]'}`}>
            {isExpired ? 'Expired on ' : 'Please respond by '}
            <strong>{new Date(offer.expires_at).toLocaleDateString()}</strong>
          </p>
        </BifrostLightCard>
      )}

      {/* Action Buttons */}
      {canRespond && (
        <BifrostLightCard className="mb-4">
          <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-4">Your Response</h2>
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={responding}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 text-center"
            >
              {responding ? 'Processing...' : 'Accept Offer'}
            </button>
            <button
              onClick={() => setShowNegotiateModal(true)}
              disabled={responding}
              className="flex-1 px-6 py-3 bg-bifrost-violet text-white font-medium rounded-xl hover:bg-bifrost-violet-dark disabled:opacity-50 text-center"
            >
              Negotiate
            </button>
            <button
              onClick={() => setShowDeclineModal(true)}
              disabled={responding}
              className="flex-1 px-6 py-3 border-2 border-[rgba(108,63,160,0.12)] text-[#4A4A62] font-medium rounded-xl hover:bg-frost disabled:opacity-50 text-center"
            >
              Decline
            </button>
          </div>
        </BifrostLightCard>
      )}

      {/* Download Offer Letter */}
      {offer.offer_letter_file_url && (
        <div className="mb-4">
          <a
            href={offer.offer_letter_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download Offer Letter (PDF)
          </a>
        </div>
      )}

      {/* Offer Version History */}
      {versions.length > 1 && (
        <BifrostLightCard className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Offer History</h3>
          <div className="space-y-3">
            {versions.map((v) => (
              <div key={v.id} className={`flex items-start gap-3 p-3 rounded-lg ${v.is_current ? 'bg-bifrost-violet/5 border border-bifrost-violet/20' : 'bg-gray-50'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${v.is_current ? 'bg-bifrost-violet text-white' : 'bg-gray-200 text-gray-600'}`}>
                  v{v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">
                      {v.is_counter_offer ? 'Counter Offer' : `Offer v${v.version}`}
                    </span>
                    {v.is_current && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-bifrost-violet/10 text-bifrost-violet font-medium">Current</span>
                    )}
                    <span className="text-gray-400">{v.status}</span>
                  </div>
                  {v.salary && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      ${v.salary.toLocaleString()}{v.signing_bonus ? ` + $${v.signing_bonus.toLocaleString()} signing` : ''}
                    </p>
                  )}
                  {v.version_notes && (
                    <p className="text-xs text-gray-500 mt-1">{v.version_notes}</p>
                  )}
                  {v.sent_at && (
                    <p className="text-xs text-gray-400 mt-1">{new Date(v.sent_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </BifrostLightCard>
      )}

      {/* Next Steps */}
      <BifrostLightCard accent="teal" className="mb-4">
        <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-3">What Happens Next</h2>
        {offer.status === 'Sent' && !isExpired && (
          <div className="text-sm text-[#4A4A62] space-y-2">
            <p>Review your offer carefully. You have three options:</p>
            <ul className="space-y-1.5 ml-4">
              <li className="flex items-start gap-2"><span className="text-aurora-teal font-bold">1.</span> Accept the offer to begin onboarding</li>
              <li className="flex items-start gap-2"><span className="text-aurora-teal font-bold">2.</span> Request a negotiation to discuss terms</li>
              <li className="flex items-start gap-2"><span className="text-aurora-teal font-bold">3.</span> Decline if this isn't the right fit</li>
            </ul>
            <p className="text-xs text-[#8E8E9E] mt-3">Questions? Use the Messages feature to contact your recruiter.</p>
          </div>
        )}
        {offer.status === 'Accepted' && (
          <div className="text-sm text-[#4A4A62] space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-aurora-teal mt-0.5 flex-shrink-0" />
              <span>Background check will be initiated (if applicable)</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-aurora-teal mt-0.5 flex-shrink-0" />
              <span>You'll receive onboarding documents via email</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-aurora-teal mt-0.5 flex-shrink-0" />
              <span>Check your Messages for welcome materials and first-day information</span>
            </div>
            {offer.start_date && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-aurora-teal mt-0.5 flex-shrink-0" />
                <span>Prepare for your start date: <strong>{new Date(offer.start_date).toLocaleDateString()}</strong></span>
              </div>
            )}
          </div>
        )}
        {offer.status === 'Negotiating' && (
          <p className="text-sm text-[#4A4A62]">
            Our team is reviewing your counter-proposal. You'll be notified when they respond.
            Feel free to reach out via Messages if you have additional questions.
          </p>
        )}
        {(offer.status === 'Declined' || offer.status === 'Expired') && (
          <p className="text-sm text-[#4A4A62]">
            Thank you for considering this opportunity. We encourage you to check our
            <Link to="/jobs" className="text-bifrost-violet hover:text-bifrost-violet-dark ml-1">open positions</Link> for future roles.
          </p>
        )}
      </BifrostLightCard>

      {/* Resources */}
      {offer.status !== 'Declined' && offer.status !== 'Rescinded' && (
        <BifrostLightCard className="mb-4">
          <h2 className="text-lg font-display font-semibold text-[#1A1A2E] mb-3">Resources</h2>
          <div className="space-y-3">
            {offer.benefits_summary && (
              <div className="flex items-center gap-3 text-sm">
                <FileText className="w-4 h-4 text-bifrost-violet" />
                <span className="text-[#4A4A62]">Benefits details are included in the Compensation section above</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <MessageSquare className="w-4 h-4 text-bifrost-violet" />
              <span className="text-[#4A4A62]">
                Have questions?{' '}
                <Link to="/my-messages" className="text-bifrost-violet hover:text-bifrost-violet-dark font-medium">
                  Message your recruiter
                </Link>
              </span>
            </div>
          </div>
        </BifrostLightCard>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <BifrostLightCard className="max-w-md w-full !p-6">
            <h3 className="text-lg font-display font-semibold text-[#1A1A2E] mb-3">Decline Offer</h3>
            <p className="text-sm text-[#4A4A62] mb-4">
              Are you sure you want to decline this offer? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#4A4A62] mb-1">Reason (optional)</label>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                rows={3}
                className="w-full border border-[rgba(108,63,160,0.12)] rounded-xl px-3 py-2 text-sm"
                placeholder="We appreciate your feedback..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 border border-[rgba(108,63,160,0.12)] text-[#4A4A62] text-sm rounded-xl hover:bg-frost"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={responding}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {responding ? 'Processing...' : 'Decline Offer'}
              </button>
            </div>
          </BifrostLightCard>
        </div>
      )}

      {/* Negotiate Modal */}
      {showNegotiateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <BifrostLightCard className="max-w-lg w-full !p-6">
            <h3 className="text-lg font-display font-semibold text-[#1A1A2E] mb-1">Request Negotiation</h3>
            <p className="text-sm text-[#4A4A62] mb-4">
              Let us know your preferred terms. Our team will review and respond.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A4A62] mb-1">Desired Salary</label>
                  <input
                    type="number"
                    value={desiredSalary}
                    onChange={e => setDesiredSalary(e.target.value)}
                    className="w-full border border-[rgba(108,63,160,0.12)] rounded-xl px-3 py-2 text-sm"
                    placeholder={offer.salary ? `Current: $${offer.salary.toLocaleString()}` : 'Amount'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A62] mb-1">Desired Signing Bonus</label>
                  <input
                    type="number"
                    value={desiredSigningBonus}
                    onChange={e => setDesiredSigningBonus(e.target.value)}
                    className="w-full border border-[rgba(108,63,160,0.12)] rounded-xl px-3 py-2 text-sm"
                    placeholder={offer.signing_bonus ? `Current: $${offer.signing_bonus.toLocaleString()}` : 'Amount'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A4A62] mb-1">Preferred Start Date</label>
                <input
                  type="date"
                  value={desiredStartDate}
                  onChange={e => setDesiredStartDate(e.target.value)}
                  className="w-full border border-[rgba(108,63,160,0.12)] rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A4A62] mb-1">
                  Explain your request <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={negotiationNotes}
                  onChange={e => setNegotiationNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-[rgba(108,63,160,0.12)] rounded-xl px-3 py-2 text-sm"
                  placeholder="Please describe what you'd like to discuss..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowNegotiateModal(false)}
                className="px-4 py-2 border border-[rgba(108,63,160,0.12)] text-[#4A4A62] text-sm rounded-xl hover:bg-frost"
              >
                Cancel
              </button>
              <button
                onClick={handleNegotiate}
                disabled={negotiating || !negotiationNotes.trim()}
                className="px-4 py-2 bg-bifrost-violet text-white text-sm font-medium rounded-xl hover:bg-bifrost-violet-dark disabled:opacity-50"
              >
                {negotiating ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </BifrostLightCard>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-[#8E8E9E]">{label}</dt>
      <dd className="text-sm text-[#1A1A2E]">{value}</dd>
    </div>
  );
}
