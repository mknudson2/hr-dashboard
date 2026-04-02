import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, FileSignature } from 'lucide-react';

const BASE_URL = '';

interface OfferRow {
  id: number;
  offer_id: string;
  application_id: number;
  applicant_name: string | null;
  position_title: string;
  salary: number | null;
  status: string;
  is_counter_offer: boolean;
  sent_at: string | null;
  created_at: string | null;
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

const STATUS_OPTIONS = ['All', 'Draft', 'Pending Approval', 'Approved', 'Sent', 'Negotiating', 'Accepted', 'Declined', 'Rescinded'];

export default function OfferListPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    loadOffers();
  }, [statusFilter]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      params.set('limit', '100');
      const res = await fetch(`${BASE_URL}/recruiting/offers?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/recruiting')}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Recruiting
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offer Letters</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{total} offer{total !== 1 ? 's' : ''} total</p>
          </div>
          <button
            onClick={() => navigate('/recruiting/offers/new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Offer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />)}
            </div>
          </div>
        ) : offers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FileSignature className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No offers found{statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Offer ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Candidate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Position</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Salary</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {offers.map(offer => (
                <tr
                  key={offer.id}
                  onClick={() => navigate(`/recruiting/offers/${offer.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                    {offer.offer_id}
                    {offer.is_counter_offer && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">Counter</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{offer.applicant_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{offer.position_title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {offer.salary ? `$${offer.salary.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[offer.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {offer.sent_at ? new Date(offer.sent_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
