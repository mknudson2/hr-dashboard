import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, FileText, HelpCircle, Loader2 } from 'lucide-react';

interface ResumeAnalysis {
  id: number;
  application_id: number;
  overall_score: number | null;
  skills_match_score: number | null;
  experience_match_score: number | null;
  education_match_score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  red_flags: string[] | null;
  suggested_questions: string[] | null;
  summary: string | null;
  threshold_score: number;
  threshold_label: string | null;
  status: string;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface Props {
  applicationId: number;
}

const BASE_URL = '';

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score === null || score === undefined) return null;
  const color = score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ResumeAnalysisPanel({ applicationId }: Props) {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${applicationId}/resume-analysis`, {
        credentials: 'include',
      });
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAnalysis(data);
      setNotFound(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Auto-poll while pending/processing
  useEffect(() => {
    if (!analysis || !['Pending', 'Processing'].includes(analysis.status)) return;
    const interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [analysis?.status, fetchAnalysis]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${applicationId}/resume-analysis/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setNotFound(false);
        await fetchAnalysis();
      }
    } catch {
      // silent
    } finally {
      setRetrying(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // No analysis record
  if (notFound) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <FileText className="w-5 h-5" />
          <span className="text-sm">No AI resume analysis available for this application.</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // Pending / Processing
  if (analysis.status === 'Pending' || analysis.status === 'Processing') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Resume Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {analysis.status === 'Pending' ? 'Analysis queued...' : 'Analyzing resume against job description...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Failed
  if (analysis.status === 'Failed') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Resume Analysis Failed</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{analysis.error_message || 'An error occurred'}</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No Resume
  if (analysis.status === 'No Resume') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Resume Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">No resume attached — analysis unavailable.</p>
          </div>
        </div>
      </div>
    );
  }

  // Completed — show full analysis
  const scoreColor = (analysis.overall_score ?? 0) >= 75
    ? 'text-green-600 dark:text-green-400'
    : (analysis.overall_score ?? 0) >= 60
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  const scoreBg = (analysis.overall_score ?? 0) >= 75
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : (analysis.overall_score ?? 0) >= 60
      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  const thresholdBadge = analysis.threshold_label === 'Promising'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Resume Analysis</h3>
          {analysis.threshold_label && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${thresholdBadge}`}>
              {analysis.threshold_label}
            </span>
          )}
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          title="Re-run analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall Score */}
        <div className={`p-4 rounded-lg border ${scoreBg} text-center`}>
          <div className={`text-4xl font-bold ${scoreColor}`}>{Math.round(analysis.overall_score ?? 0)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Overall Match Score</div>
        </div>

        {/* Sub-scores */}
        <div className="space-y-3">
          <ScoreBar label="Skills Match" score={analysis.skills_match_score} />
          <ScoreBar label="Experience Match" score={analysis.experience_match_score} />
          <ScoreBar label="Education Match" score={analysis.education_match_score} />
        </div>

        {/* Summary */}
        {analysis.summary && (
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
            {analysis.summary}
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Strengths</h4>
            <ul className="space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses && analysis.weaknesses.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Weaknesses</h4>
            <ul className="space-y-1">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {analysis.red_flags && analysis.red_flags.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider mb-2">Red Flags</h4>
            <ul className="space-y-1">
              {analysis.red_flags.map((rf, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {rf}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Interview Questions */}
        {analysis.suggested_questions && analysis.suggested_questions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Suggested Interview Questions</h4>
            <ol className="space-y-2 list-decimal list-inside">
              {analysis.suggested_questions.map((q, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{q}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
