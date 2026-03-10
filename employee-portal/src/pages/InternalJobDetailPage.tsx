import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';

interface JobDetail {
  id: number;
  posting_id: string;
  slug: string;
  title: string;
  description_html: string | null;
  department: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  requirements: string | null;
  preferred_qualifications: string | null;
  responsibilities: string | null;
  benefits_summary: string | null;
  published_at: string | null;
}

export default function InternalJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadJob();
  }, [jobId]);

  async function loadJob() {
    try {
      const data = await apiGet<JobDetail>(`/portal/internal-jobs/${jobId}`);
      setJob(data);
    } catch {
      setError('Job not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    setError('');
    try {
      await apiPost(`/portal/internal-jobs/${jobId}/apply`, {
        cover_letter: coverLetter || null,
      });
      setSuccess('Application submitted! You can track it in My Applications.');
      setShowApplyForm(false);
    } catch (e: any) {
      setError(e.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || 'Job not found'}</p>
        <Link to="/internal-jobs" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to Internal Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/internal-jobs" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Internal Jobs
      </Link>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">{success}</div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600 dark:text-gray-400">
          {job.department && <span>{job.department}</span>}
          {job.location && <span>{job.location}</span>}
          {job.remote_type && (
            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">{job.remote_type}</span>
          )}
          {job.employment_type && <span>{job.employment_type}</span>}
        </div>
        {job.published_at && (
          <p className="text-xs text-gray-400 mt-2">Posted {new Date(job.published_at).toLocaleDateString()}</p>
        )}

        {!success && (
          <button
            onClick={() => setShowApplyForm(!showApplyForm)}
            className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Apply for Transfer
          </button>
        )}
      </div>

      {/* Apply Form */}
      {showApplyForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Apply for Transfer</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your profile information will be automatically included with your application.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cover Letter / Statement of Interest (optional)
            </label>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Why are you interested in this position?"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {applying ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              onClick={() => setShowApplyForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Job Description */}
      {job.description_html && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: job.description_html }} />
        </div>
      )}

      {job.responsibilities && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Responsibilities</h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.responsibilities}</div>
        </div>
      )}

      {job.requirements && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Requirements</h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.requirements}</div>
        </div>
      )}

      {job.preferred_qualifications && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Preferred Qualifications</h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.preferred_qualifications}</div>
        </div>
      )}
    </div>
  );
}
