import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import ApplicantPipelineTracker from '@/components/ApplicantPipelineTracker';
import InterviewCalendar from '@/components/scheduling/InterviewCalendar';
import type { ApplicantFacingStage } from '@/types/ats';

interface TimelineEvent {
  activity_type: string;
  description: string;
  created_at: string | null;
}

interface ApplicationDetail {
  id: number;
  application_id: string;
  job_title: string;
  department: string | null;
  location: string | null;
  status: string;
  submitted_at: string | null;
  timeline: TimelineEvent[];
}

export default function ApplicationStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [pipelineStages, setPipelineStages] = useState<ApplicantFacingStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuthenticated && id) loadApplication();
  }, [isAuthenticated, authLoading, id]);

  const loadApplication = async () => {
    try {
      const [data, stages] = await Promise.all([
        apiGet<ApplicationDetail>(`/applicant-portal/my-applications/${id}`),
        apiGet<ApplicantFacingStage[]>(`/applicant-portal/my-applications/${id}/pipeline`).catch(() => []),
      ]);
      setApplication(data);
      setPipelineStages(stages);
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12 text-gray-500">
        Application not found.
        <Link to="/my-applications" className="block mt-4 text-blue-600">Back to applications</Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800',
    Screening: 'bg-yellow-100 text-yellow-800',
    Interview: 'bg-purple-100 text-purple-800',
    Offer: 'bg-green-100 text-green-800',
    Hired: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
    Withdrawn: 'bg-gray-100 text-gray-800',
  };

  const statusIcon = (status: string) => {
    if (status === 'Hired') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'Rejected') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-blue-500" />;
  };

  const showInterviewCalendar = pipelineStages.some(
    s => (s.status === 'current' || s.status === 'completed') &&
         s.label.toLowerCase().includes('interview'),
  );

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/my-applications" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to applications
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{application.job_title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {application.department && `${application.department} · `}
              {application.location || ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Application ID: {application.application_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon(application.status)}
            <span className={`px-3 py-1.5 rounded text-sm font-medium ${statusColors[application.status] || 'bg-gray-100'}`}>
              {application.status}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout: Pipeline + Timeline (left) | Calendar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className={`${showInterviewCalendar ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-6`}>
          {/* Pipeline Progress */}
          {pipelineStages.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold mb-4">Application Progress</h2>
              <ApplicantPipelineTracker stages={pipelineStages} />
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Timeline</h2>
            {application.timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No updates yet. We'll update you as your application progresses.</p>
            ) : (
              <div className="space-y-4">
                {application.timeline.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      {i < application.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-gray-900">{event.description}</p>
                      {event.created_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Interview Calendar */}
        {showInterviewCalendar && id && (
          <div className="lg:col-span-2">
            <InterviewCalendar applicationId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
