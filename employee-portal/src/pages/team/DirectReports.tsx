import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import { Users, Mail, Phone, Calendar, Briefcase, AlertCircle, Search, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface DirectReport {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string;
  hire_date: string;
  status: string;
  on_fmla: boolean;
  on_pto: boolean;
}

interface DirectReportsData {
  reports: DirectReport[];
  total_count: number;
}

export default function DirectReports() {
  const [data, setData] = useState<DirectReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDirectReports = async () => {
      try {
        setLoading(true);
        const result = await apiGet<DirectReportsData>('/portal/team/reports');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load direct reports');
      } finally {
        setLoading(false);
      }
    };

    fetchDirectReports();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredReports = data?.reports.filter((report) => {
    if (!searchQuery) return true;
    const fullName = `${report.first_name} ${report.last_name}`.toLowerCase();
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      report.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.position?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Direct Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {data?.total_count} team members
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search by name, email, or employee ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Team Members Grid */}
      {filteredReports && filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {report.first_name.charAt(0)}{report.last_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {report.first_name} {report.last_name}
                    </h3>
                    {report.on_fmla && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                        FMLA
                      </span>
                    )}
                    {report.on_pto && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                        PTO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {report.position || 'Employee'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {report.department}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail size={14} />
                  <a href={`mailto:${report.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 truncate">
                    {report.email}
                  </a>
                </div>
                {report.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={14} />
                    <a href={`tel:${report.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                      {report.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>Hired {formatDate(report.hire_date)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {report.employee_id}
                  </span>
                  <Link
                    to={`/team/employee/${report.employee_id}`}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    View <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
        >
          <Users className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            {searchQuery ? 'No team members match your search.' : 'No direct reports found.'}
          </p>
        </motion.div>
      )}

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.total_count || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Reports</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Briefcase className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.reports.filter((r) => r.on_fmla).length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">On FMLA</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Calendar className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.reports.filter((r) => r.on_pto).length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">On PTO</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.reports.filter((r) => !r.on_fmla && !r.on_pto).length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
