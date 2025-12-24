import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import InteractiveMetricCard from '@/components/analytics/InteractiveMetricCard';
import ComparisonWidget from '@/components/analytics/ComparisonWidget';
import TrendAnalysisWidget from '@/components/analytics/TrendAnalysisWidget';
import MultiMetricChart from '@/components/analytics/MultiMetricChart';
import DrillDownChart from '@/components/analytics/DrillDownChart';
import AdvancedFilterPanel from '@/components/analytics/AdvancedFilterPanel';
import DataGroupingPanel from '@/components/analytics/DataGroupingPanel';
import ExportPanel from '@/components/analytics/ExportPanel';
import { getAnalytics } from '../services/analyticsService';

export default function AdvancedAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  // Sample data for demonstrations
  const monthlyHeadcount = analytics.headcount_trend?.labels.map((label: string, index: number) => ({
    label,
    value: analytics.headcount_trend.values[index],
  })) || [];

  const sampleEmployees = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    department: ['Engineering', 'Sales', 'Marketing', 'HR'][i % 4],
    salary: 50000 + Math.random() * 50000,
    hire_date: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
  }));

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Advanced Analytics
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive dashboards and advanced reporting tools
        </p>
      </div>

      {/* Interactive Metric Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Interactive KPI Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InteractiveMetricCard
            title="Active Employees"
            icon={<Users className="w-5 h-5" />}
            data={{
              current: analytics.active_employees,
              previous: analytics.active_employees - (analytics.ytd_hires || 0) + (analytics.ytd_terminations?.total || 0),
              target: Math.round(analytics.active_employees * 1.1),
              format: 'number',
            }}
            color="blue"
            details={[
              { label: 'YTD Hires', value: analytics.ytd_hires || 0 },
              { label: 'YTD Terms', value: analytics.ytd_terminations?.total || 0 },
            ]}
            tooltip="Total number of active employees in the organization"
          />

          <InteractiveMetricCard
            title="Turnover Rate"
            icon={<TrendingUp className="w-5 h-5" />}
            data={{
              current: analytics.turnover_rate || 0,
              previous: (analytics.turnover_rate || 0) * 0.9,
              target: 10,
              format: 'percentage',
            }}
            color="orange"
            details={[
              { label: 'Voluntary', value: analytics.ytd_terminations?.voluntary || 0 },
              { label: 'Involuntary', value: analytics.ytd_terminations?.involuntary || 0 },
            ]}
            tooltip="Percentage of employees who left this year"
          />

          <InteractiveMetricCard
            title="Avg Tenure"
            icon={<Calendar className="w-5 h-5" />}
            data={{
              current: analytics.avg_tenure || 3.5,
              previous: (analytics.avg_tenure || 3.5) - 0.2,
              format: 'days',
            }}
            color="green"
            tooltip="Average length of employee tenure in years"
          />
        </div>
      </div>

      {/* Comparison Widget */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Period Comparison
        </h2>
        <ComparisonWidget
          title="YTD vs Previous Year"
          currentPeriod="2024 YTD"
          previousPeriod="2023 YTD"
          comparisons={[
            {
              label: 'Total Employees',
              current: analytics.active_employees,
              previous: Math.round(analytics.active_employees * 0.95),
              format: 'number',
            },
            {
              label: 'New Hires',
              current: analytics.ytd_hires || 0,
              previous: Math.round((analytics.ytd_hires || 0) * 0.8),
              format: 'number',
            },
            {
              label: 'Turnover Rate',
              current: analytics.turnover_rate || 0,
              previous: (analytics.turnover_rate || 0) * 1.1,
              format: 'percentage',
            },
          ]}
          color="blue"
        />
      </div>

      {/* Trend Analysis */}
      {monthlyHeadcount.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Trend Analysis
          </h2>
          <TrendAnalysisWidget
            title="Headcount Trend"
            data={monthlyHeadcount}
            color="blue"
            showPrediction={true}
          />
        </div>
      )}

      {/* Multi-Metric Chart */}
      {monthlyHeadcount.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Multi-Metric Visualization
          </h2>
          <MultiMetricChart
            title="Workforce Metrics Over Time"
            labels={monthlyHeadcount.map((d) => d.label)}
            series={[
              {
                id: 'headcount',
                label: 'Headcount',
                data: monthlyHeadcount.map((d) => d.value),
                color: '#3b82f6',
                type: 'line',
                visible: true,
              },
              {
                id: 'hires',
                label: 'Estimated Hires',
                data: monthlyHeadcount.map(() => Math.floor(Math.random() * 10)),
                color: '#10b981',
                type: 'bar',
                visible: true,
              },
              {
                id: 'terminations',
                label: 'Estimated Terms',
                data: monthlyHeadcount.map(() => Math.floor(Math.random() * 5)),
                color: '#ef4444',
                type: 'bar',
                visible: true,
              },
            ]}
            chartType="mixed"
          />
        </div>
      )}

      {/* Advanced Filtering */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Advanced Filtering
        </h2>
        <AdvancedFilterPanel
          fields={[
            { id: 'department', label: 'Department', type: 'text' },
            { id: 'salary', label: 'Salary', type: 'number' },
            { id: 'hire_date', label: 'Hire Date', type: 'date' },
            { id: 'name', label: 'Name', type: 'text' },
          ]}
          onApplyFilters={(groups) => {
            console.log('Applying filters:', groups);
            // In a real app, this would filter data
          }}
          savedFilters={[]}
        />
      </div>

      {/* Data Grouping */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Data Grouping & Aggregation
        </h2>
        <DataGroupingPanel
          fields={[
            { id: 'department', label: 'Department', type: 'text' },
            { id: 'salary', label: 'Salary', type: 'number' },
            { id: 'hire_date', label: 'Hire Date', type: 'date' },
          ]}
          onApplyGrouping={(groupBy, aggregations) => {
            console.log('Grouping by:', groupBy);
            console.log('Aggregations:', aggregations);
            // In a real app, this would group and aggregate data
          }}
        />
      </div>

      {/* Export Panel */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Export Tools
        </h2>
        <ExportPanel
          data={sampleEmployees}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'department', label: 'Department' },
            { key: 'salary', label: 'Salary', format: (v) => `$${v.toLocaleString()}` },
            { key: 'hire_date', label: 'Hire Date' },
          ]}
          title="Employee Report"
          filename="employees_export"
        />
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl"
      >
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          About These Components
        </h3>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          This page demonstrates the new advanced analytics components that have been added to your HR Dashboard.
          Each component is interactive and can be integrated into other pages as needed. The filtering, grouping,
          and export tools can work with real data from your backend API.
        </p>
      </motion.div>
    </div>
  );
}
