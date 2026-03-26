import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, MapPin, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import BifrostLightCard from '@/components/bifrost-light/BifrostLightCard';

interface MyApplication {
  id: number;
  application_id: string;
  job_title: string;
  department: string | null;
  location: string | null;
  status: string;
  submitted_at: string | null;
}

export default function MyApplicationsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) loadApplications();
  }, [isAuthenticated, authLoading]);

  const loadApplications = async () => {
    try {
      const data = await apiGet<{ applications: MyApplication[] }>('/applicant-portal/my-applications');
      setApplications(data.applications);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800',
    Screening: 'bg-yellow-100 text-yellow-800',
    Interview: 'bg-purple-100 text-purple-800',
    Offer: 'bg-green-100 text-green-800',
    Hired: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
    Withdrawn: 'bg-gray-100 text-gray-800',
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 rounded" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A2E]">My Applications</h1>

      {applications.length === 0 ? (
        <BifrostLightCard className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-[#4A4A62] mb-4">You haven't applied to any positions yet.</p>
          <Link to="/jobs" className="text-bifrost-violet hover:text-bifrost-violet-dark font-medium">
            Browse open positions
          </Link>
        </BifrostLightCard>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <Link
              key={app.id}
              to={`/my-applications/${app.id}`}
              className="block"
            >
              <BifrostLightCard className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-[#1A1A2E]">{app.job_title}</h2>
                    <div className="flex gap-3 mt-1 text-sm text-gray-500">
                      {app.department && (
                        <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {app.department}</span>
                      )}
                      {app.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[app.status] || 'bg-gray-100 text-gray-800'}`}>
                      {app.status}
                    </span>
                    {app.submitted_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Applied {new Date(app.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </BifrostLightCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
