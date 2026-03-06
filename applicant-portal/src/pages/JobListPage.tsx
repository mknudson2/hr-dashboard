import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Clock, Building, Briefcase } from 'lucide-react';
import { API_URL } from '@/config/api';

interface Job {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  department: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  published_at: string | null;
}

interface FiltersData {
  departments: string[];
}

export default function JobListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [filters, setFilters] = useState<FiltersData>({ departments: [] });

  useEffect(() => {
    loadJobs();
  }, [department]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (department) params.set('department', department);
      const res = await fetch(`${API_URL}/applicant-portal/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
        setFilters(data.filters);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Our Team</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Explore open positions and find the right fit for your career.
        </p>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="border rounded-lg px-4 py-3 text-sm min-w-[180px]"
        >
          <option value="">All Departments</option>
          {filters.departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Results */}
      <div className="text-sm text-gray-500">{total} position{total !== 1 ? 's' : ''} available</div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-lg border p-6">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No positions found</p>
          <p className="mt-1">Try adjusting your search or check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <Link
              key={job.id}
              to={`/jobs/${job.slug}`}
              className="block bg-white rounded-lg border p-6 hover:shadow-md hover:border-blue-200 transition-all"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                {job.department && (
                  <span className="flex items-center gap-1">
                    <Building className="w-4 h-4" /> {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {job.location}
                    {job.remote_type && job.remote_type !== 'On-site' && (
                      <span className="text-blue-600 ml-1">({job.remote_type})</span>
                    )}
                  </span>
                )}
                {job.employment_type && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {job.employment_type}
                  </span>
                )}
                {formatSalary(job.salary_min, job.salary_max) && (
                  <span className="text-green-600 font-medium">
                    {formatSalary(job.salary_min, job.salary_max)}
                  </span>
                )}
              </div>
              {job.short_description && (
                <p className="text-sm text-gray-600 line-clamp-2">{job.short_description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
