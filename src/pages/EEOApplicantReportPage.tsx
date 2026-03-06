import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';

interface EEOCategory {
  category: string;
  count: number;
}

interface AdverseImpactGroup {
  group: string;
  applicants: number;
  hired: number;
  hire_rate: number;
  impact_ratio: number | null;
  potential_adverse_impact: boolean;
}

interface EEOFlowData {
  total_with_eeo_data: number;
  total_declined: number;
  by_race_ethnicity: EEOCategory[];
  by_gender: EEOCategory[];
  by_veteran_status: EEOCategory[];
  by_disability_status: EEOCategory[];
  adverse_impact_analysis: AdverseImpactGroup[];
}

export default function EEOApplicantReportPage() {
  const [data, setData] = useState<EEOFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await apiGet<EEOFlowData>('/recruiting/analytics/eeo-flow');
      setData(result);
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
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Failed to load EEO data.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EEO Applicant Flow Report</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Aggregate voluntary self-identification data</p>
        </div>
        <Link
          to="/recruiting/analytics"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Back to Analytics
        </Link>
      </div>

      {/* Privacy Notice */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
        This report shows aggregate data only. Individual applicant EEO responses are never visible
        to hiring managers. Data is based on voluntary self-identification.
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_with_eeo_data}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Applicants with EEO data</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_declined}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Declined to identify</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Race/Ethnicity */}
        <CategorySection title="Race / Ethnicity" items={data.by_race_ethnicity} total={data.total_with_eeo_data} />

        {/* Gender */}
        <CategorySection title="Gender" items={data.by_gender} total={data.total_with_eeo_data} />

        {/* Veteran Status */}
        <CategorySection title="Veteran Status" items={data.by_veteran_status} total={data.total_with_eeo_data} />

        {/* Disability Status */}
        <CategorySection title="Disability Status" items={data.by_disability_status} total={data.total_with_eeo_data} />
      </div>

      {/* Adverse Impact Analysis */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Adverse Impact Analysis</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Four-fifths (80%) rule analysis by race/ethnicity. Groups with an impact ratio below 0.80
          may indicate potential adverse impact requiring further investigation.
        </p>

        {data.adverse_impact_analysis.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Insufficient data for adverse impact analysis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Group</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Applicants</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Hired</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Hire Rate</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Impact Ratio</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-center">Flag</th>
                </tr>
              </thead>
              <tbody>
                {data.adverse_impact_analysis.map(g => (
                  <tr key={g.group} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 text-gray-900 dark:text-white">{g.group}</td>
                    <td className="py-2 text-right dark:text-gray-300">{g.applicants}</td>
                    <td className="py-2 text-right dark:text-gray-300">{g.hired}</td>
                    <td className="py-2 text-right dark:text-gray-300">{g.hire_rate}%</td>
                    <td className="py-2 text-right font-medium dark:text-gray-200">
                      {g.impact_ratio !== null ? g.impact_ratio.toFixed(3) : '—'}
                    </td>
                    <td className="py-2 text-center">
                      {g.potential_adverse_impact && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs rounded-full">
                          Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CategorySection({ title, items, total }: { title: string; items: EEOCategory[]; total: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No data available.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{item.category}</span>
                  <span className="text-gray-500 dark:text-gray-400">{item.count} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
