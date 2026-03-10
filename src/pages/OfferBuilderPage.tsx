import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiFetch } from '@/utils/api';

interface OfferForm {
  application_id: number;
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  start_date: string;
  reports_to: string;
  salary: string;
  wage_type: string;
  signing_bonus: string;
  equity_details: string;
  benefits_summary: string;
  expires_at: string;
  contingencies: { background_check: boolean; drug_test: boolean; references: boolean };
}

interface Offer {
  id: number;
  offer_id: string;
  application_id: number;
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
  created_at: string;
  approved_by: number | null;
  approved_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  response: string | null;
  decline_reason: string | null;
  is_counter_offer: boolean;
  original_offer_id: number | null;
  negotiation_notes: string | null;
}

const emptyForm: OfferForm = {
  application_id: 0,
  position_title: '',
  department: '',
  location: '',
  employment_type: 'Full-Time',
  start_date: '',
  reports_to: '',
  salary: '',
  wage_type: 'Annual',
  signing_bonus: '',
  equity_details: '',
  benefits_summary: '',
  expires_at: '',
  contingencies: { background_check: true, drug_test: false, references: true },
};

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Declined: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Rescinded: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function OfferBuilderPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('applicationId');

  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!offerId;

  useEffect(() => {
    if (offerId) {
      loadOffer(parseInt(offerId));
    } else if (applicationId) {
      setForm(prev => ({ ...prev, application_id: parseInt(applicationId) }));
    }
  }, [offerId, applicationId]);

  async function loadOffer(id: number) {
    setLoading(true);
    try {
      const data = await apiGet<Offer>(`/recruiting/offers/${id}`);
      setOffer(data);
      setForm({
        application_id: data.application_id,
        position_title: data.position_title || '',
        department: data.department || '',
        location: data.location || '',
        employment_type: data.employment_type || 'Full-Time',
        start_date: data.start_date ? data.start_date.split('T')[0] : '',
        reports_to: data.reports_to || '',
        salary: data.salary ? String(data.salary) : '',
        wage_type: data.wage_type || 'Annual',
        signing_bonus: data.signing_bonus ? String(data.signing_bonus) : '',
        equity_details: data.equity_details || '',
        benefits_summary: data.benefits_summary || '',
        expires_at: data.expires_at ? data.expires_at.split('T')[0] : '',
        contingencies: data.contingencies || { background_check: true, drug_test: false, references: true },
      });
    } catch {
      setError('Failed to load offer');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        application_id: form.application_id,
        position_title: form.position_title,
        department: form.department || null,
        location: form.location || null,
        employment_type: form.employment_type || null,
        start_date: form.start_date || null,
        reports_to: form.reports_to || null,
        salary: form.salary ? parseFloat(form.salary) : null,
        wage_type: form.wage_type || null,
        signing_bonus: form.signing_bonus ? parseFloat(form.signing_bonus) : null,
        equity_details: form.equity_details || null,
        benefits_summary: form.benefits_summary || null,
        expires_at: form.expires_at ? `${form.expires_at}T23:59:59` : null,
        contingencies: form.contingencies,
      };

      if (isEditing) {
        const data = await apiPut<Offer>(`/recruiting/offers/${offerId}`, payload);
        setOffer(data);
      } else {
        const data = await apiPost<Offer>('/recruiting/offers', payload);
        navigate(`/recruiting/offers/${data.id}`, { replace: true });
      }
    } catch {
      setError('Failed to save offer');
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(action: string) {
    if (!offer) return;
    setError('');
    try {
      if (action === 'approve') {
        await apiFetch(`/recruiting/offers/${offer.id}/approve`, { method: 'PATCH' });
      } else if (action === 'send') {
        await apiFetch(`/recruiting/offers/${offer.id}/send`, { method: 'PATCH' });
      } else if (action === 'rescind') {
        if (!confirm('Are you sure you want to rescind this offer?')) return;
        await apiFetch(`/recruiting/offers/${offer.id}/rescind`, { method: 'PATCH' });
      }
      await loadOffer(offer.id);
    } catch {
      setError(`Failed to ${action} offer`);
    }
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

  const canEdit = !offer || offer.status === 'Draft';
  const canApprove = offer?.status === 'Draft' || offer?.status === 'Pending Approval';
  const canSend = offer?.status === 'Approved';
  const canRescind = offer?.status === 'Approved' || offer?.status === 'Sent';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? `Offer ${offer?.offer_id || ''}` : 'Create Offer Letter'}
          </h1>
        </div>
        {offer && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[offer.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
            {offer.status}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Counter-offer badge */}
      {offer?.is_counter_offer && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-400">
          This is a counter-offer. Original offer ID: {offer.original_offer_id}
          {offer.negotiation_notes && <p className="mt-1 text-amber-700 dark:text-amber-400">Notes: {offer.negotiation_notes}</p>}
        </div>
      )}

      {/* Response info */}
      {offer?.response && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          offer.response === 'accepted'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
        }`}>
          Candidate {offer.response} on {new Date(offer.responded_at!).toLocaleDateString()}
          {offer.decline_reason && <p className="mt-1">Reason: {offer.decline_reason}</p>}
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
        {/* Position Details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Position Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position Title *</label>
              <input
                type="text"
                value={form.position_title}
                onChange={e => setForm(p => ({ ...p, position_title: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
              <select
                value={form.employment_type}
                onChange={e => setForm(p => ({ ...p, employment_type: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              >
                <option>Full-Time</option>
                <option>Part-Time</option>
                <option>Contract</option>
                <option>Temporary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reports To</label>
              <input
                type="text"
                value={form.reports_to}
                onChange={e => setForm(p => ({ ...p, reports_to: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Compensation */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compensation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={form.salary}
                    onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                    disabled={!canEdit}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pl-7 pr-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
                    placeholder="0.00"
                  />
                </div>
                <select
                  value={form.wage_type}
                  onChange={e => setForm(p => ({ ...p, wage_type: e.target.value }))}
                  disabled={!canEdit}
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
                >
                  <option>Annual</option>
                  <option>Hourly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signing Bonus</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={form.signing_bonus}
                  onChange={e => setForm(p => ({ ...p, signing_bonus: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pl-7 pr-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Equity Details</label>
            <textarea
              value={form.equity_details}
              onChange={e => setForm(p => ({ ...p, equity_details: e.target.value }))}
              disabled={!canEdit}
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              placeholder="Stock options, RSUs, etc."
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benefits Summary</label>
            <textarea
              value={form.benefits_summary}
              onChange={e => setForm(p => ({ ...p, benefits_summary: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              placeholder="Health insurance, 401k match, PTO, etc."
            />
          </div>
        </div>

        {/* Offer Terms */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Offer Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Offer Expiration Date</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                disabled={!canEdit}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-900"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contingencies</label>
            <div className="flex flex-wrap gap-4">
              {(['background_check', 'drug_test', 'references'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.contingencies[key]}
                    onChange={e => setForm(p => ({
                      ...p,
                      contingencies: { ...p.contingencies, [key]: e.target.checked },
                    }))}
                    disabled={!canEdit}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !form.position_title || !form.application_id}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Offer' : 'Create Offer'}
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => handleAction('approve')}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          )}
          {canSend && (
            <button
              onClick={() => handleAction('send')}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
            >
              Send to Candidate
            </button>
          )}
          {canRescind && (
            <button
              onClick={() => handleAction('rescind')}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              Rescind Offer
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Workflow Timeline */}
      {offer && (
        <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Offer Timeline</h2>
          <div className="space-y-3">
            <TimelineEntry label="Created" date={offer.created_at} />
            {offer.approved_at && <TimelineEntry label="Approved" date={offer.approved_at} />}
            {offer.sent_at && <TimelineEntry label="Sent to candidate" date={offer.sent_at} />}
            {offer.responded_at && (
              <TimelineEntry
                label={`Candidate ${offer.response}`}
                date={offer.responded_at}
                highlight={offer.response === 'accepted' ? 'green' : 'red'}
              />
            )}
            {offer.expires_at && !offer.responded_at && (
              <TimelineEntry
                label="Expires"
                date={offer.expires_at}
                highlight={new Date(offer.expires_at) < new Date() ? 'red' : 'gray'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEntry({ label, date, highlight }: { label: string; date: string; highlight?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400 dark:bg-gray-500',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[highlight || ''] || 'bg-blue-500'}`} />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(date).toLocaleString()}</span>
    </div>
  );
}
