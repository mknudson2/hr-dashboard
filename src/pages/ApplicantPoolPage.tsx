import { useState, useEffect } from 'react';
import { Search, Users, UserPlus, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface PoolCandidate {
  id: number;
  applicant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  current_title: string | null;
  current_employer: string | null;
  years_of_experience: number | null;
  pool_opted_in_at: string | null;
  latest_application: {
    id: number;
    application_id: string;
    job_title: string;
    status: string;
    submitted_at: string | null;
  } | null;
}

interface Requisition {
  id: number;
  title: string;
  department: string;
  status: string;
}

export default function ApplicantPoolPage() {
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<PoolCandidate | null>(null);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReqId, setSelectedReqId] = useState('');
  const [poolNotes, setPoolNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const limit = 25;

  useEffect(() => { loadCandidates(); }, [search, offset]);

  async function loadCandidates() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/recruiting/pool?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load pool candidates');
    } finally {
      setLoading(false);
    }
  }

  async function openConsiderModal(candidate: PoolCandidate) {
    setSelectedCandidate(candidate);
    setSelectedReqId('');
    setPoolNotes('');
    // Load open requisitions
    try {
      const res = await fetch(`${API_URL}/recruiting/requisitions?status=Open&limit=100`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data.requisitions || []);
      }
    } catch { /* ignore */ }
  }

  async function handleCreateApplication() {
    if (!selectedCandidate || !selectedReqId) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/recruiting/pool/${selectedCandidate.id}/create-application`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisition_id: Number(selectedReqId),
          source_application_id: selectedCandidate.latest_application?.id,
          notes: poolNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed' }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setSuccess(`Application ${data.application.application_id} created for ${selectedCandidate.first_name} ${selectedCandidate.last_name}`);
      setSelectedCandidate(null);
      await loadCandidates();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create application');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Applicant Pool
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Candidates who opted in for cross-role consideration ({total} total)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Search by name, email, or title..."
          className="w-full pl-10 pr-4 py-2.5 border dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Candidate</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Current Role</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Experience</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Latest Application</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Opted In</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="animate-pulse h-5 bg-gray-100 dark:bg-gray-700 rounded" />
                  </td>
                </tr>
              ))
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No candidates in the pool{search ? ' matching your search' : ''}
                </td>
              </tr>
            ) : (
              candidates.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {c.current_title || '—'}
                    {c.current_employer && <span className="text-gray-400"> at {c.current_employer}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {c.years_of_experience != null ? `${c.years_of_experience} yrs` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.latest_application ? (
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{c.latest_application.job_title}</p>
                        <span className="text-xs text-gray-400">{c.latest_application.status}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {c.pool_opted_in_at ? new Date(c.pool_opted_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openConsiderModal(c)}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Consider
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 border dark:border-gray-600 rounded text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1.5 border dark:border-gray-600 rounded text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Consider for Role Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Consider for Role
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create a new application for {selectedCandidate.first_name} {selectedCandidate.last_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Requisition <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedReqId}
                  onChange={e => setSelectedReqId(e.target.value)}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a position...</option>
                  {requisitions.map(r => (
                    <option key={r.id} value={r.id}>{r.title} — {r.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={poolNotes}
                  onChange={e => setPoolNotes(e.target.value)}
                  rows={3}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Why is this candidate a good fit?"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApplication}
                disabled={creating || !selectedReqId}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
