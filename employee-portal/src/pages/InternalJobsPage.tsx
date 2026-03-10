import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface InternalJob {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  department: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  published_at: string | null;
}

interface JobsResponse {
  total: number;
  jobs: InternalJob[];
}

export default function InternalJobsPage() {
  const { viewMode } = useEmployeeFeatures();
  const [jobs, setJobs] = useState<InternalJob[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, [search]);

  async function loadJobs() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await apiGet<JobsResponse>(`/portal/internal-jobs?${params.toString()}`);
      setJobs(data.jobs);
      setTotal(data.total);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Internal Job Board"
          subtitle="Browse open positions and apply for internal transfers"
        />
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Internal Job Board</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Browse open positions and apply for internal transfers</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Link
          to="/internal-jobs/my-applications"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
        >
          My Applications
        </Link>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{total} open position{total !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No internal positions available at this time.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Link
              key={job.id}
              to={`/internal-jobs/${job.id}`}
              className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{job.title}</h3>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                {job.department && <span>{job.department}</span>}
                {job.location && <span>{job.location}</span>}
                {job.remote_type && <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">{job.remote_type}</span>}
                {job.employment_type && <span>{job.employment_type}</span>}
              </div>
              {job.short_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{job.short_description}</p>
              )}
              {job.published_at && (
                <p className="text-xs text-gray-400 mt-2">Posted {new Date(job.published_at).toLocaleDateString()}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
