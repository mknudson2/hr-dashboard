import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';

interface OverviewStats {
  open_requisitions: number;
  active_postings: number;
  active_applications: number;
  new_applications_this_week: number;
  offers_pending_response: number;
  hires_this_month: number;
  total_applicants: number;
}

interface FunnelData {
  total: number;
  stages: { status: string; count: number; percentage: number }[];
  conversion_rates: Record<string, number>;
}

interface SourceData {
  source: string;
  applications: number;
  hires: number;
  hire_rate: number;
}

interface TimeToFill {
  overall_avg_days: number;
  total_filled: number;
  by_department: { department: string; avg_days: number; min_days: number; max_days: number; count: number }[];
}

interface InterviewerStats {
  interviewer_id: number;
  interviewer_name: string;
  total_scorecards: number;
  submitted: number;
  pending: number;
  avg_rating: number | null;
}

export default function RecruitingAnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [timeToFill, setTimeToFill] = useState<TimeToFill | null>(null);
  const [interviewers, setInterviewers] = useState<InterviewerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [o, f, s, t, i] = await Promise.all([
        apiGet<OverviewStats>('/recruiting/analytics/overview'),
        apiGet<FunnelData>('/recruiting/analytics/funnel'),
        apiGet<SourceData[]>('/recruiting/analytics/sources'),
        apiGet<TimeToFill>('/recruiting/analytics/time-to-fill'),
        apiGet<InterviewerStats[]>('/recruiting/analytics/interviewers'),
      ]);
      setOverview(o);
      setFunnel(f);
      setSources(s);
      setTimeToFill(t);
      setInterviewers(i);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />)}</div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recruiting Analytics</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pipeline performance and hiring metrics</p>
        </div>
        <div className="flex gap-2">
          <Link to="/recruiting/analytics/eeo" className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            EEO Report
          </Link>
          <Link to="/recruiting" className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Back to Recruiting
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <StatCard label="Open Reqs" value={overview.open_requisitions} />
          <StatCard label="Active Postings" value={overview.active_postings} />
          <StatCard label="Active Apps" value={overview.active_applications} />
          <StatCard label="New This Week" value={overview.new_applications_this_week} color="blue" />
          <StatCard label="Offers Pending" value={overview.offers_pending_response} color="purple" />
          <StatCard label="Hires This Month" value={overview.hires_this_month} color="green" />
          <StatCard label="Total Applicants" value={overview.total_applicants} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        {funnel && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline Funnel</h2>
            <div className="space-y-3">
              {funnel.stages.map(s => (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{s.status}</span>
                    <span className="text-gray-500 dark:text-gray-400">{s.count} ({s.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {funnel.conversion_rates && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Conversion Rates</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-gray-400">To Screening</div><div className="dark:text-gray-200">{funnel.conversion_rates.applied_to_screening}%</div>
                  <div className="text-gray-500 dark:text-gray-400">To Interview</div><div className="dark:text-gray-200">{funnel.conversion_rates.applied_to_interview}%</div>
                  <div className="text-gray-500 dark:text-gray-400">To Offer</div><div className="dark:text-gray-200">{funnel.conversion_rates.applied_to_offer}%</div>
                  <div className="text-gray-500 dark:text-gray-400">To Hire</div><div className="font-medium text-green-600 dark:text-green-400">{funnel.conversion_rates.applied_to_hire}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Effectiveness */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source Effectiveness</h2>
          {sources.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No source data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2">Source</th>
                    <th className="pb-2 text-right">Apps</th>
                    <th className="pb-2 text-right">Hires</th>
                    <th className="pb-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s.source} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-900 dark:text-white">{s.source}</td>
                      <td className="py-2 text-right dark:text-gray-300">{s.applications}</td>
                      <td className="py-2 text-right dark:text-gray-300">{s.hires}</td>
                      <td className="py-2 text-right font-medium dark:text-gray-200">{s.hire_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Time to Fill */}
        {timeToFill && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time to Fill</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{timeToFill.overall_avg_days}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">average days<br/>({timeToFill.total_filled} positions filled)</div>
            </div>
            {timeToFill.by_department.length > 0 && (
              <div className="space-y-2">
                {timeToFill.by_department.map(d => (
                  <div key={d.department} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{d.department}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{d.avg_days} days <span className="text-gray-400 dark:text-gray-500">({d.count})</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interviewer Stats */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Interviewer Activity</h2>
          {interviewers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No interviewer data available yet.</p>
          ) : (
            <div className="space-y-3">
              {interviewers.map(i => (
                <div key={i.interviewer_id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{i.interviewer_name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {i.submitted} submitted, {i.pending} pending
                    </span>
                  </div>
                  <div className="text-sm">
                    {i.avg_rating && (
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">{i.avg_rating} avg</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const textColor = color === 'blue' ? 'text-blue-600 dark:text-blue-400' : color === 'green' ? 'text-green-600 dark:text-green-400' : color === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white';
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}
