import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface InternalApplication {
  id: number;
  application_id: string;
  job_title: string;
  department: string | null;
  status: string;
  submitted_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Offer: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  Hired: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function InternalApplicationsPage() {
  const { viewMode } = useEmployeeFeatures();
  const [applications, setApplications] = useState<InternalApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const data = await apiGet<{ applications: InternalApplication[] }>('/portal/my-internal-applications');
      setApplications(data.applications);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      {viewMode === 'bifrost' ? (
        <div className="space-y-3">
          <Link to="/internal-jobs" className="text-sm text-bifrost-violet hover:text-bifrost-violet-dark inline-block">
            &larr; Back to Internal Jobs
          </Link>
          <AuroraPageHeader
            title="My Internal Applications"
            subtitle="Track your internal transfer applications"
          />
        </div>
      ) : (
        <div className="mb-6">
          <Link to="/internal-jobs" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Internal Jobs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Internal Applications</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track your internal transfer applications</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">You haven't applied for any internal positions yet.</p>
          <Link
            to="/internal-jobs"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            Browse Internal Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <div key={app.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{app.job_title}</h3>
                  {app.department && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{app.department}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Applied: {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400">ID: {app.application_id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100'}`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
