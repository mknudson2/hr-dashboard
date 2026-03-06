import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Building, DollarSign } from 'lucide-react';
import { API_URL } from '@/config/api';

interface JobDetail {
  id: number;
  posting_id: string;
  slug: string;
  title: string;
  description_html: string | null;
  short_description: string | null;
  department: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  requirements: string | null;
  preferred_qualifications: string | null;
  responsibilities: string | null;
  benefits_summary: string | null;
  requires_resume: boolean;
  requires_cover_letter: boolean;
  custom_questions: { question: string; type: string; required: boolean; options?: string[] }[] | null;
  published_at: string | null;
  closes_at: string | null;
}

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) loadJob();
  }, [slug]);

  const loadJob = async () => {
    try {
      const res = await fetch(`${API_URL}/applicant-portal/jobs/${slug}`);
      if (res.ok) {
        setJob(await res.json());
      }
    } catch (error) {
      console.error('Failed to load job:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Job not found.</p>
        <Link to="/jobs" className="text-blue-600 hover:text-blue-800">Back to job listings</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link to="/jobs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" /> Back to all jobs
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{job.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {job.department && (
            <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {job.department}</span>
          )}
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {job.location}
              {job.remote_type && job.remote_type !== 'On-site' && ` (${job.remote_type})`}
            </span>
          )}
          {job.employment_type && (
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {job.employment_type}</span>
          )}
          {(job.salary_min || job.salary_max) && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <DollarSign className="w-4 h-4" />
              {job.salary_min ? `$${job.salary_min.toLocaleString()}` : ''}
              {job.salary_min && job.salary_max ? ' - ' : ''}
              {job.salary_max ? `$${job.salary_max.toLocaleString()}` : ''}
            </span>
          )}
        </div>
        {job.closes_at && (
          <p className="text-sm text-amber-600 mt-2">
            Applications close: {new Date(job.closes_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Apply CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-blue-900">Interested in this role?</p>
          <p className="text-sm text-blue-700">
            {job.requires_resume ? 'Resume required' : 'No resume required'}
            {job.requires_cover_letter ? ' + cover letter' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate(`/apply/${job.id}`)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Apply Now
        </button>
      </div>

      {/* Description */}
      {job.description_html && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">About This Role</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {job.description_html}
          </div>
        </div>
      )}

      {/* Responsibilities */}
      {job.responsibilities && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Responsibilities</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.responsibilities}</div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Requirements</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.requirements}</div>
        </div>
      )}

      {/* Preferred */}
      {job.preferred_qualifications && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Preferred Qualifications</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.preferred_qualifications}</div>
        </div>
      )}

      {/* Benefits */}
      {job.benefits_summary && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Benefits</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.benefits_summary}</div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="text-center py-6">
        <button
          onClick={() => navigate(`/apply/${job.id}`)}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-lg"
        >
          Apply for this Position
        </button>
      </div>
    </div>
  );
}
