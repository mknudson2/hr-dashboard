import { useState, useEffect, useCallback } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { apiGet } from '@/utils/api';
import ScorecardViewer from './ScorecardViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ScorecardDetail {
  id: number;
  application_id: number;
  applicant_name: string | null;
  stage: { id: number; name: string } | null;
  interviewer: { id: number; name: string } | null;
  overall_rating: number | null;
  recommendation: string | null;
  criteria_ratings: { criteria: string; rating: number | null; notes: string }[] | null;
  strengths: string | null;
  concerns: string | null;
  additional_notes: string | null;
  status: string;
  submitted_at: string | null;
  due_date: string | null;
}

interface ScorecardDrawerProps {
  scorecardId: number | null;
  onClose: () => void;
}

export default function ScorecardDrawer({ scorecardId, onClose }: ScorecardDrawerProps) {
  const [data, setData] = useState<ScorecardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [visible, setVisible] = useState(false);

  const fetchScorecard = useCallback(async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGet<ScorecardDetail>(`/portal/hiring-manager/scorecards/${id}`);
      setData(result);
    } catch {
      setError('Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Animate in when scorecardId becomes non-null
  useEffect(() => {
    if (scorecardId) {
      fetchScorecard(scorecardId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      setData(null);
    }
  }, [scorecardId, fetchScorecard]);

  // Animate out then call onClose
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!scorecardId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scorecardId, handleClose]);

  const handleDownload = async () => {
    if (!scorecardId) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('portal_token');
      const resp = await fetch(`${API_URL}/portal/hiring-manager/scorecards/${scorecardId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'scorecard.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (!scorecardId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex pointer-events-none">
        <div
          className={`w-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scorecard Details</h2>
            <div className="flex items-center gap-2">
              {data && data.status === 'Submitted' && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {downloading ? 'Generating...' : 'Download PDF'}
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {data && !loading && (
              <>
                {data.status === 'Pending' || data.status === 'In Progress' ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Loader2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Scorecard {data.status === 'Pending' ? 'Not Started' : 'In Progress'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {data.interviewer?.name
                        ? `Waiting for ${data.interviewer.name} to submit`
                        : 'Awaiting submission'}
                    </p>
                    {data.due_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Due {new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <ScorecardViewer
                    applicantName={data.applicant_name || 'Unknown'}
                    stageName={data.stage?.name}
                    interviewerName={data.interviewer?.name}
                    overallRating={data.overall_rating}
                    recommendation={data.recommendation}
                    criteriaRatings={data.criteria_ratings || []}
                    strengths={data.strengths}
                    concerns={data.concerns}
                    additionalNotes={data.additional_notes}
                    submittedAt={data.submitted_at}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
