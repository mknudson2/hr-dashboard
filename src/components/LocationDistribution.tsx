import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Download, Users, Map, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import LocationMap from './LocationMap';

interface LocationData {
  total_employees: number;
  us_states: Record<string, { count: number; cities: Record<string, number> }>;
  countries: Record<string, { count: number; cities: Record<string, number> }>;
  cities: Array<{
    city: string;
    state?: string;
    country?: string;
    full_location: string;
    type: string;
  }>;
  summary: {
    total_us: number;
    total_international: number;
    us_percentage: number;
    international_percentage: number;
    total_states: number;
    total_countries: number;
  };
}

const LocationDistribution = () => {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'us' | 'international'>('us');
  const [displayMode, setDisplayMode] = useState<'map' | 'charts'>('map');
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Detect dark mode for chart styling
  const axisColor = isDarkMode ? '#E5E7EB' : '#374151';
  const gridColor = isDarkMode ? '#4B5563' : '#D1D5DB';

  useEffect(() => {
    fetchLocationData();
  }, []);

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/analytics/location-distribution', {
        credentials: 'include',
      });
      const data = await response.json();
      setLocationData(data);
    } catch (error) {
      console.error('Error fetching location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      // Show loading state
      const exportButton = document.querySelector('[data-export-pdf]') as HTMLButtonElement;
      const downloadIcon = exportButton?.querySelector('svg');
      if (exportButton) {
        exportButton.disabled = true;
        if (downloadIcon) downloadIcon.classList.add('animate-pulse');
        const textNode = Array.from(exportButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = 'Generating...';
      }

      // Download PDF from backend
      const response = await fetch('/analytics/location-distribution/pdf', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employee-locations-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Restore button state
      if (exportButton) {
        exportButton.disabled = false;
        if (downloadIcon) downloadIcon.classList.remove('animate-pulse');
        const textNode = Array.from(exportButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = 'Export PDF';
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Restore button state
      const exportButton = document.querySelector('[data-export-pdf]') as HTMLButtonElement;
      const downloadIcon = exportButton?.querySelector('svg');
      if (exportButton) {
        exportButton.disabled = false;
        if (downloadIcon) downloadIcon.classList.remove('animate-pulse');
        const textNode = Array.from(exportButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = 'Export PDF';
      }
    }
  };

  if (loading || !locationData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bifrost-violet mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading location data...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const usStatesData = Object.entries(locationData.us_states)
    .map(([state, data]) => ({
      name: state,
      employees: data.count,
    }))
    .sort((a, b) => b.employees - a.employees)
    .slice(0, 15); // Top 15 states

  const countriesData = Object.entries(locationData.countries)
    .map(([country, data]) => ({
      name: country,
      employees: data.count,
    }))
    .sort((a, b) => b.employees - a.employees);

  const pieData = [
    { name: 'United States', value: locationData.summary.total_us, color: '#6C3FA0' },
    { name: 'International', value: locationData.summary.total_international, color: '#2ABFBF' },
  ];

  const COLORS = ['#6C3FA0', '#2ABFBF', '#E8B84B', '#8B5FC4', '#1F9E9E', '#D4A030', '#1B3A5C', '#E05C8A'];

  return (
    <div id="location-distribution-content" className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Bifröst gradient strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }} />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Employee Location Distribution
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Remote workforce across {locationData.summary.total_states} states and {locationData.summary.total_countries} countries
          </p>
        </div>
        <button
          onClick={exportToPDF}
          data-export-pdf
          className="flex items-center gap-2 px-4 py-2 bg-bifrost-violet hover:bg-bifrost-violet-light text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-bifrost-violet/10 to-bifrost-violet/20 dark:from-bifrost-violet/20 dark:to-bifrost-violet/10 rounded-lg p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-bifrost-violet rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {locationData.total_employees}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-aurora-teal/10 to-aurora-teal/20 dark:from-aurora-teal/20 dark:to-aurora-teal/10 rounded-lg p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-aurora-teal rounded-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">US Employees</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {locationData.summary.total_us}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {locationData.summary.us_percentage}% • {locationData.summary.total_states} states
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-bridge-gold/10 to-bridge-gold/20 dark:from-bridge-gold/20 dark:to-bridge-gold/10 rounded-lg p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-bridge-gold rounded-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">International</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {locationData.summary.total_international}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {locationData.summary.international_percentage}% • {locationData.summary.total_countries} countries
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-bifrost-violet/5 to-aurora-teal/10 dark:from-bifrost-violet/15 dark:to-aurora-teal/10 rounded-lg p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-bifrost-violet to-aurora-teal rounded-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Locations</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {locationData.summary.total_states + locationData.summary.total_countries}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            States & Countries
          </p>
        </motion.div>
      </div>

      {/* Display Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setDisplayMode('map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            displayMode === 'map'
              ? 'bg-bifrost-violet text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Map className="w-4 h-4" />
          Map View
        </button>
        <button
          onClick={() => setDisplayMode('charts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            displayMode === 'charts'
              ? 'bg-bifrost-violet text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Charts View
        </button>
      </div>

      {/* Map View */}
      {displayMode === 'map' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Interactive Location Map
          </h3>
          <LocationMap locationData={locationData} />
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-bifrost-violet"></div>
              <span className="text-gray-600 dark:text-gray-400">United States</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-aurora-teal"></div>
              <span className="text-gray-600 dark:text-gray-400">International</span>
            </div>
            <span className="text-gray-500 dark:text-gray-500 text-xs">
              • Circle size represents employee count
            </span>
          </div>
        </div>
      )}

      {/* Charts View */}
      {displayMode === 'charts' && (
        <>
          {/* Distribution Pie Chart */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              US vs International Distribution
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Toggle View */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setView('us')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'us'
                  ? 'bg-bifrost-violet text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              US States
            </button>
            <button
              onClick={() => setView('international')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'international'
                  ? 'bg-bifrost-violet text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              International
            </button>
          </div>

          {/* Bar Charts - only show in charts view */}
          {view === 'us' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top States by Employee Count
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={usStatesData} layout="vertical" margin={{ left: 100 }}>
                    <XAxis
                      type="number"
                      tick={{ fill: axisColor, fontSize: 12 }}
                      stroke={gridColor}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: axisColor, fontSize: 13, fontWeight: 500 }}
                      stroke={gridColor}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        color: '#111827'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                      itemStyle={{ color: '#111827' }}
                    />
                    <Bar dataKey="employees" fill="#3B82F6">
                      {usStatesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                International Employees by Country
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countriesData} layout="vertical" margin={{ left: 120 }}>
                    <XAxis
                      type="number"
                      tick={{ fill: axisColor, fontSize: 12 }}
                      stroke={gridColor}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: axisColor, fontSize: 13, fontWeight: 500 }}
                      stroke={gridColor}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        color: '#111827'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                      itemStyle={{ color: '#111827' }}
                    />
                    <Bar dataKey="employees" fill="#10B981">
                      {countriesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LocationDistribution;
