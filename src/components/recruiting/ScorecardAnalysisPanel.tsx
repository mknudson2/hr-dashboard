import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, RefreshCw, Loader2, XCircle, AlertTriangle,
  CheckCircle, ArrowRight, Flag, MessageSquare
} from 'lucide-react';

interface Disagreement {
  topic: string;
  views: string[];
}

interface ScorecardAnalysis {
  id: number;
  application_id: number;
  recommendation: string | null;
  confidence: string | null;
  summary: string | null;
  consensus_strengths: string[] | null;
  consensus_concerns: string[] | null;
  disagreements: Disagreement[] | null;
  red_flags: string[] | null;
  suggested_next_steps: string[] | null;
  scorecard_count: number;
  status: string;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface Props {
  applicationId: number;
  submittedScorecardCount: number;
}

const BASE_URL = '';

const recommendationColors: Record<string, string> = {
  'Strong Hire': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Hire': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Lean Hire': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Lean No Hire': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'No Hire': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const confidenceColors: Record<string, string> = {
  'High': 'text-green-700 dark:text-green-400',
  'Medium': 'text-amber-700 dark:text-amber-400',
  'Low': 'text-red-700 dark:text-red-400',
};

export default function ScorecardAnalysisPanel({ applicationId, submittedScorecardCount }: Props) {
  const [analysis, setAnalysis] = useState<ScorecardAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${applicationId}/scorecard-analysis`, {
        credentials: 'include',
      });
      if (res.status === 404) {
        setAnalysis(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch scorecard analysis');
      const data = await res.json();
      setAnalysis(data);
      setError(null);
    } catch {
      // silent on initial load
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

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${applicationId}/scorecard-analysis`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to generate analysis');
      }
      await fetchAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-56" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // No analysis yet — show generate button if enough scorecards
  if (!analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm">No AI scorecard analysis yet.</span>
          </div>
          {submittedScorecardCount >= 2 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate Analysis'}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // Pending / Processing
  if (analysis.status === 'Pending' || analysis.status === 'Processing') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Scorecard Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {analysis.status === 'Pending' ? 'Analysis queued...' : 'Analyzing scorecards and synthesizing feedback...'}
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Scorecard Analysis Failed</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{analysis.error_message || 'An error occurred'}</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // Completed — show full analysis
  const needsRefresh = analysis.scorecard_count !== submittedScorecardCount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Scorecard Analysis</h3>
        </div>
        {needsRefresh && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            Refresh ({submittedScorecardCount} scorecards, analyzed {analysis.scorecard_count})
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Status Bar: recommendation + confidence + count */}
        <div className="flex flex-wrap items-center gap-3">
          {analysis.recommendation && (
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${recommendationColors[analysis.recommendation] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
              {analysis.recommendation}
            </span>
          )}
          {analysis.confidence && (
            <span className={`text-sm font-medium ${confidenceColors[analysis.confidence] || 'text-gray-600 dark:text-gray-400'}`}>
              {analysis.confidence} Confidence
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Based on {analysis.scorecard_count} scorecard{analysis.scorecard_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Summary */}
        {analysis.summary && (
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg">
            {analysis.summary}
          </div>
        )}

        {/* Consensus Strengths */}
        {analysis.consensus_strengths && analysis.consensus_strengths.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">
              Consensus Strengths
            </h4>
            <ul className="space-y-1.5">
              {analysis.consensus_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Consensus Concerns */}
        {analysis.consensus_concerns && analysis.consensus_concerns.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">
              Consensus Concerns
            </h4>
            <ul className="space-y-1.5">
              {analysis.consensus_concerns.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disagreements */}
        {analysis.disagreements && analysis.disagreements.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3">
              Disagreements
            </h4>
            <div className="space-y-3">
              {analysis.disagreements.map((d, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    {d.topic}
                  </p>
                  {d.views && d.views.length > 0 && (
                    <ul className="mt-1 ml-6 space-y-0.5">
                      {d.views.map((v, j) => (
                        <li key={j} className="text-xs text-amber-700 dark:text-amber-300/80">
                          &bull; {v}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {analysis.red_flags && analysis.red_flags.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider mb-2">
              Red Flags
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.red_flags.map((rf, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full"
                >
                  <Flag className="w-3 h-3" />
                  {rf}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Next Steps */}
        {analysis.suggested_next_steps && analysis.suggested_next_steps.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
              Suggested Next Steps
            </h4>
            <ul className="space-y-1.5">
              {analysis.suggested_next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <div className="px-6 pb-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
