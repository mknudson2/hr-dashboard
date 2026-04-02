import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  FileText,
  Clock,
  Check,
  X,
  MessageSquare,
  Scale,
  ChevronDown,
} from 'lucide-react';

interface OfferVersion {
  id: number;
  offer_id: string;
  version: number;
  salary: number | null;
  signing_bonus: number | null;
  start_date: string | null;
  benefits_summary: string | null;
  status: string;
  is_counter_offer: boolean;
  negotiation_notes: string | null;
  created_at: string | null;
}

interface ApplicantProposal {
  desired_salary: number | null;
  desired_signing_bonus: number | null;
  desired_start_date: string | null;
  notes: string | null;
  submitted_at: string | null;
}

interface ApprovalInfo {
  id: number;
  resource_id: number;
  status: string;
  notes: string | null;
  created_at: string | null;
  acted_at: string | null;
}

interface NegotiationHistory {
  application_id: number;
  applicant_name: string;
  negotiation_round: number;
  current_offer: OfferVersion | null;
  offer_versions: OfferVersion[];
  applicant_proposals: ApplicantProposal[];
  approval_requests: ApprovalInfo[];
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Declined: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Rescinded: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Negotiating: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const APPROVAL_COLORS: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function formatUSD(value: number | null): string {
  if (value === null || value === undefined) return '--';
  return `$${value.toLocaleString()}`;
}

function formatDate(date: string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date: string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleString();
}

export default function NegotiationTrackingPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();

  const [history, setHistory] = useState<NegotiationHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Counter-offer form
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterSalary, setCounterSalary] = useState('');
  const [counterBonus, setCounterBonus] = useState('');
  const [counterStartDate, setCounterStartDate] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (offerId) {
      loadHistory();
    }
  }, [offerId]);

  async function loadHistory() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<NegotiationHistory>(
        `/recruiting/offers/${offerId}/negotiation-history`,
      );
      setHistory(data);

      // Pre-fill counter form with current offer values
      if (data.current_offer) {
        setCounterSalary(data.current_offer.salary ? String(data.current_offer.salary) : '');
        setCounterBonus(data.current_offer.signing_bonus ? String(data.current_offer.signing_bonus) : '');
        setCounterStartDate(data.current_offer.start_date ? data.current_offer.start_date.split('T')[0] : '');
      }
    } catch {
      setError('Failed to load negotiation history');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCounter(overridePayload?: {
    salary: number | null;
    signing_bonus: number | null;
    start_date: string | null;
    negotiation_notes: string;
  }) {
    if (!history?.current_offer) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const payload = overridePayload || {
        salary: counterSalary ? parseFloat(counterSalary) : null,
        signing_bonus: counterBonus ? parseFloat(counterBonus) : null,
        start_date: counterStartDate || null,
        negotiation_notes: counterNotes || null,
      };
      await apiPost(`/recruiting/offers/${history.current_offer.id}/counter`, payload);
      setSuccess('Counter-offer created successfully');
      setShowCounterForm(false);
      setCounterNotes('');
      await loadHistory();
    } catch {
      setError('Failed to create counter-offer');
    } finally {
      setCreating(false);
    }
  }

  function handleAcceptApplicantTerms() {
    if (!history?.applicant_proposals.length) return;
    const latest = history.applicant_proposals[history.applicant_proposals.length - 1];
    handleCreateCounter({
      salary: latest.desired_salary,
      signing_bonus: latest.desired_signing_bonus,
      start_date: latest.desired_start_date,
      negotiation_notes: 'Accepted applicant\'s proposed terms',
    });
  }

  function handleHoldFirm() {
    if (!history?.current_offer) return;
    handleCreateCounter({
      salary: history.current_offer.salary,
      signing_bonus: history.current_offer.signing_bonus,
      start_date: history.current_offer.start_date,
      negotiation_notes: 'Holding firm on current offer terms',
    });
  }

  // Build a combined timeline of all events
  function buildTimeline(): Array<{
    type: 'offer' | 'proposal' | 'approval';
    date: string;
    data: OfferVersion | ApplicantProposal | ApprovalInfo;
  }> {
    const items: Array<{
      type: 'offer' | 'proposal' | 'approval';
      date: string;
      data: OfferVersion | ApplicantProposal | ApprovalInfo;
    }> = [];

    if (!history) return items;

    for (const ov of history.offer_versions) {
      items.push({ type: 'offer', date: ov.created_at || '', data: ov });
    }
    for (const ap of history.applicant_proposals) {
      items.push({ type: 'proposal', date: ap.submitted_at || '', data: ap });
    }
    for (const ar of history.approval_requests) {
      items.push({ type: 'approval', date: ar.created_at || '', data: ar });
    }

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const currentOffer = history?.current_offer;
  const latestProposal = history?.applicant_proposals.length
    ? history.applicant_proposals[history.applicant_proposals.length - 1]
    : null;
  const timeline = buildTimeline();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/recruiting/offers')}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Offers
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {history?.applicant_name || 'Negotiation'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Negotiation Round {history?.negotiation_round || 1}
            </p>
          </div>
          {currentOffer && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                STATUS_COLORS[currentOffer.status] || 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {currentOffer.status}
            </span>
          )}
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Side-by-side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Offer */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Offer</h2>
          </div>
          {currentOffer ? (
            <div className="space-y-3">
              <ComparisonRow
                icon={<DollarSign className="w-4 h-4" />}
                label="Salary"
                value={formatUSD(currentOffer.salary)}
                compareValue={latestProposal?.desired_salary ?? null}
                currentValue={currentOffer.salary}
              />
              <ComparisonRow
                icon={<DollarSign className="w-4 h-4" />}
                label="Signing Bonus"
                value={formatUSD(currentOffer.signing_bonus)}
                compareValue={latestProposal?.desired_signing_bonus ?? null}
                currentValue={currentOffer.signing_bonus}
              />
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(currentOffer.start_date)}
                  </p>
                </div>
              </div>
              {currentOffer.benefits_summary && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Benefits</p>
                    <p className="text-sm text-gray-900 dark:text-white">{currentOffer.benefits_summary}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No offer on record.</p>
          )}
        </div>

        {/* Applicant's Proposal */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Applicant's Proposal</h2>
          </div>
          {latestProposal ? (
            <div className="space-y-3">
              <ComparisonRow
                icon={<DollarSign className="w-4 h-4" />}
                label="Desired Salary"
                value={formatUSD(latestProposal.desired_salary)}
                compareValue={currentOffer?.salary ?? null}
                currentValue={latestProposal.desired_salary}
                invertComparison
              />
              <ComparisonRow
                icon={<DollarSign className="w-4 h-4" />}
                label="Desired Signing Bonus"
                value={formatUSD(latestProposal.desired_signing_bonus)}
                compareValue={currentOffer?.signing_bonus ?? null}
                currentValue={latestProposal.desired_signing_bonus}
                invertComparison
              />
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Desired Start Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(latestProposal.desired_start_date)}
                  </p>
                </div>
              </div>
              {latestProposal.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-sm text-gray-900 dark:text-white">{latestProposal.notes}</p>
                  </div>
                </div>
              )}
              {latestProposal.submitted_at && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Submitted {formatDateTime(latestProposal.submitted_at)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No proposal from applicant yet.</p>
          )}
        </div>
      </div>

      {/* Negotiation Timeline */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Negotiation Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No events yet.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-4">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-10">
                  {/* Dot */}
                  <div
                    className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                      item.type === 'offer'
                        ? 'bg-blue-500'
                        : item.type === 'proposal'
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    {item.type === 'offer' && (
                      <TimelineOffer version={item.data as OfferVersion} />
                    )}
                    {item.type === 'proposal' && (
                      <TimelineProposal proposal={item.data as ApplicantProposal} />
                    )}
                    {item.type === 'approval' && (
                      <TimelineApproval approval={item.data as ApprovalInfo} />
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDateTime(item.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCounterForm(!showCounterForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Scale className="w-4 h-4" />
            Create Counter-Offer
            <ChevronDown className={`w-4 h-4 transition-transform ${showCounterForm ? 'rotate-180' : ''}`} />
          </button>
          {latestProposal && (
            <button
              onClick={handleAcceptApplicantTerms}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Accept Applicant's Terms
            </button>
          )}
          <button
            onClick={handleHoldFirm}
            disabled={creating || !currentOffer}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Hold Firm
          </button>
        </div>

        {/* Counter-Offer Form */}
        {showCounterForm && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Counter-Offer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={counterSalary}
                    onChange={e => setCounterSalary(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pl-7 pr-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signing Bonus</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={counterBonus}
                    onChange={e => setCounterBonus(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pl-7 pr-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={counterStartDate}
                  onChange={e => setCounterStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={counterNotes}
                onChange={e => setCounterNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Explain the counter-offer rationale..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleCreateCounter()}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Submit Counter-Offer'}
              </button>
              <button
                onClick={() => setShowCounterForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Status */}
      {history?.approval_requests && history.approval_requests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Approval Status</h2>
          <div className="space-y-3">
            {history.approval_requests.map(ar => (
              <div
                key={ar.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Approval Request #{ar.id}
                    </p>
                    {ar.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ar.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Created {formatDateTime(ar.created_at)}
                      {ar.acted_at && ` | Acted ${formatDateTime(ar.acted_at)}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    APPROVAL_COLORS[ar.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {ar.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function ComparisonRow({
  icon,
  label,
  value,
  compareValue,
  currentValue,
  invertComparison,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  compareValue: number | null;
  currentValue: number | null;
  invertComparison?: boolean;
}) {
  let colorClass = '';
  if (currentValue !== null && compareValue !== null) {
    const diff = currentValue - compareValue;
    // For offer side: green if offer < proposal (saving money), red if offer > proposal
    // For proposal side (invertComparison): green if proposal > offer (asking more), red if less
    if (invertComparison) {
      colorClass = diff > 0 ? 'text-red-600 dark:text-red-400' : diff < 0 ? 'text-green-600 dark:text-green-400' : '';
    } else {
      colorClass = diff < 0 ? 'text-green-600 dark:text-green-400' : diff > 0 ? 'text-red-600 dark:text-red-400' : '';
    }
  }

  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-sm font-medium ${colorClass || 'text-gray-900 dark:text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function TimelineOffer({ version }: { version: OfferVersion }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Offer v{version.version}
          {version.is_counter_offer && (
            <span className="ml-1.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
              Counter
            </span>
          )}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            STATUS_COLORS[version.status] || 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          {version.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Salary: {formatUSD(version.salary)}
        {version.signing_bonus !== null && ` | Bonus: ${formatUSD(version.signing_bonus)}`}
      </p>
      {version.negotiation_notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{version.negotiation_notes}</p>
      )}
    </div>
  );
}

function TimelineProposal({ proposal }: { proposal: ApplicantProposal }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">Applicant Proposal</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Desired Salary: {formatUSD(proposal.desired_salary)}
        {proposal.desired_signing_bonus !== null && ` | Bonus: ${formatUSD(proposal.desired_signing_bonus)}`}
        {proposal.desired_start_date && ` | Start: ${formatDate(proposal.desired_start_date)}`}
      </p>
      {proposal.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{proposal.notes}</p>
      )}
    </div>
  );
}

function TimelineApproval({ approval }: { approval: ApprovalInfo }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">Approval Request</span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            APPROVAL_COLORS[approval.status] || 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          {approval.status}
        </span>
      </div>
      {approval.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{approval.notes}</p>
      )}
    </div>
  );
}
