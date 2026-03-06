import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';

interface Conversion {
  id: number;
  application_id: number;
  applicant_name: string | null;
  offer_id: string | null;
  position: string | null;
  department: string | null;
  hire_date: string | null;
  status: string;
  employee_id: string | null;
  is_internal_transfer: boolean;
  eeo_transferred: boolean;
  created_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Employee Created': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'User Created': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Onboarding Started': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function HireConversionList() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadConversions();
  }, [filter]);

  async function loadConversions() {
    try {
      const url = filter
        ? `/recruiting/hire-conversions?status=${encodeURIComponent(filter)}`
        : '/recruiting/hire-conversions';
      const data = await apiGet<Conversion[]>(url);
      setConversions(data);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hire Conversions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track applicant-to-employee conversions</p>
        </div>
        <Link
          to="/recruiting"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Back to Recruiting
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'Pending', 'Employee Created', 'User Created', 'Onboarding Started', 'Completed', 'Failed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : conversions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No hire conversions found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Position</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hire Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {conversions.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{c.applicant_name || 'Unknown'}</div>
                    {c.is_internal_transfer && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">Internal Transfer</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.position}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.hire_date || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.employee_id || '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/recruiting/hire-wizard?conversionId=${c.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {c.status === 'Completed' ? 'View' : 'Continue'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
