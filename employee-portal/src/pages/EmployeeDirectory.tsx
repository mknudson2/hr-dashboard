import { useState, useMemo } from 'react';
import { Users, Search, Mail, Phone, Building, MapPin, Filter, Grid, List, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  location: string;
  manager: string;
  avatar?: string;
  status: 'active' | 'away' | 'busy' | 'offline';
}

// Mock employee data
const mockEmployees: Employee[] = [
  {
    id: 'E001',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    phone: '(555) 123-4567',
    title: 'Engineering Manager',
    department: 'Engineering',
    location: 'San Francisco, CA',
    manager: 'James Wilson',
    status: 'active',
  },
  {
    id: 'E002',
    name: 'Michael Rodriguez',
    email: 'michael.rodriguez@company.com',
    phone: '(555) 234-5678',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    manager: 'Sarah Chen',
    status: 'busy',
  },
  {
    id: 'E003',
    name: 'Emily Johnson',
    email: 'emily.johnson@company.com',
    phone: '(555) 345-6789',
    title: 'HR Business Partner',
    department: 'Human Resources',
    location: 'New York, NY',
    manager: 'Lisa Thompson',
    status: 'active',
  },
  {
    id: 'E004',
    name: 'David Kim',
    email: 'david.kim@company.com',
    phone: '(555) 456-7890',
    title: 'Product Manager',
    department: 'Product',
    location: 'Seattle, WA',
    manager: 'Rachel Green',
    status: 'away',
  },
  {
    id: 'E005',
    name: 'Amanda Martinez',
    email: 'amanda.martinez@company.com',
    phone: '(555) 567-8901',
    title: 'UX Designer',
    department: 'Design',
    location: 'Austin, TX',
    manager: 'Tom Anderson',
    status: 'active',
  },
  {
    id: 'E006',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    phone: '(555) 678-9012',
    title: 'VP of Engineering',
    department: 'Engineering',
    location: 'San Francisco, CA',
    manager: 'CEO',
    status: 'active',
  },
  {
    id: 'E007',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@company.com',
    phone: '(555) 789-0123',
    title: 'HR Director',
    department: 'Human Resources',
    location: 'New York, NY',
    manager: 'CEO',
    status: 'offline',
  },
  {
    id: 'E008',
    name: 'Robert Taylor',
    email: 'robert.taylor@company.com',
    phone: '(555) 890-1234',
    title: 'Finance Manager',
    department: 'Finance',
    location: 'Chicago, IL',
    manager: 'CFO',
    status: 'active',
  },
  {
    id: 'E009',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@company.com',
    phone: '(555) 901-2345',
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'Los Angeles, CA',
    manager: 'Mark Davis',
    status: 'busy',
  },
  {
    id: 'E010',
    name: 'Christopher Brown',
    email: 'christopher.brown@company.com',
    phone: '(555) 012-3456',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    manager: 'Sarah Chen',
    status: 'active',
  },
  {
    id: 'E011',
    name: 'Ashley Garcia',
    email: 'ashley.garcia@company.com',
    phone: '(555) 111-2222',
    title: 'Recruiter',
    department: 'Human Resources',
    location: 'Denver, CO',
    manager: 'Lisa Thompson',
    status: 'away',
  },
  {
    id: 'E012',
    name: 'Daniel White',
    email: 'daniel.white@company.com',
    phone: '(555) 333-4444',
    title: 'Data Analyst',
    department: 'Analytics',
    location: 'Boston, MA',
    manager: 'Robert Taylor',
    status: 'active',
  },
];

const departments = ['All Departments', 'Engineering', 'Human Resources', 'Product', 'Design', 'Finance', 'Marketing', 'Analytics'];
const locations = ['All Locations', 'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Chicago, IL', 'Los Angeles, CA', 'Denver, CO', 'Boston, MA', 'Remote'];

function getStatusColor(status: Employee['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function EmployeeDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const filteredEmployees = useMemo(() => {
    return mockEmployees.filter(employee => {
      const matchesSearch =
        searchQuery === '' ||
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment =
        selectedDepartment === 'All Departments' || employee.department === selectedDepartment;

      const matchesLocation =
        selectedLocation === 'All Locations' || employee.location === selectedLocation;

      return matchesSearch && matchesDepartment && matchesLocation;
    });
  }, [searchQuery, selectedDepartment, selectedLocation]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mockEmployees.forEach(e => {
      counts[e.department] = (counts[e.department] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Users className="text-blue-600 dark:text-blue-400" />
          Employee Directory
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Find and connect with colleagues across the organization
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, title, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Filter Toggle & View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                showFilters
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Filter size={20} />
              Filters
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                aria-label="Grid view"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                aria-label="List view"
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept} {dept !== 'All Departments' && departmentCounts[dept] ? `(${departmentCounts[dept]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredEmployees.length} of {mockEmployees.length} employees
      </div>

      {/* Employee Grid/List */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-12 text-center">
          <Users className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No employees found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-14 h-14 rounded-full ${getAvatarColor(employee.name)} flex items-center justify-center text-white font-semibold text-lg`}>
                    {getInitials(employee.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-4 h-4 ${getStatusColor(employee.status)} rounded-full border-2 border-white dark:border-gray-800`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{employee.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{employee.title}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{employee.department}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail size={14} />
                  <a href={`mailto:${employee.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 truncate">
                    {employee.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone size={14} />
                  <a href={`tel:${employee.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {employee.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin size={14} />
                  <span>{employee.location}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Reports to: <span className="text-gray-700 dark:text-gray-300">{employee.manager}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden md:table-cell">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden lg:table-cell">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden xl:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(employee.name)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitials(employee.name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{employee.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Building size={14} />
                      {employee.department}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin size={14} />
                      {employee.location}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell">
                    <div className="space-y-1">
                      <a href={`mailto:${employee.email}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                        <Mail size={14} />
                        {employee.email}
                      </a>
                      <a href={`tel:${employee.phone}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                        <Phone size={14} />
                        {employee.phone}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      employee.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : employee.status === 'away'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : employee.status === 'busy'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(employee.status)}`} />
                      {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
