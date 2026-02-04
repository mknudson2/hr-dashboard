import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  AlertCircle,
  Briefcase,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface EmployeeDetail {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string;
  team: string | null;
  hire_date: string;
  employment_type: string | null;
  location: string | null;
  status: string;
  on_fmla: boolean;
  on_pto: boolean;
  pto_balance: number | null;
  fmla_hours_remaining: number | null;
}

export default function EmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const result = await apiGet<EmployeeDetail>(`/portal/team/employee/${employeeId}`);
        setEmployee(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/team/reports"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          Back to Direct Reports
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-500" size={48} />
            <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const InfoRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string | null | undefined;
    icon?: React.ElementType;
  }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      {Icon && <Icon className="text-gray-400 mt-0.5" size={18} />}
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-gray-900 dark:text-white font-medium">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/team/reports"
        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700"
      >
        <ArrowLeft size={20} />
        Back to Direct Reports
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {employee.first_name.charAt(0)}
                {employee.last_name.charAt(0)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {employee.first_name} {employee.last_name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{employee.position || 'Employee'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{employee.department}</p>

            {/* Status badges */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {employee.on_fmla && (
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm">
                  On FMLA
                </span>
              )}
              {employee.on_pto && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                  On PTO
                </span>
              )}
              {!employee.on_fmla && !employee.on_pto && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                  Active
                </span>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Employee ID</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">{employee.employee_id}</p>
            </div>
          </div>
        </motion.div>

        {/* Contact & Employment Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <InfoRow label="Email" value={employee.email} icon={Mail} />
              <InfoRow label="Phone" value={employee.phone} icon={Phone} />
              <InfoRow label="Location" value={employee.location} icon={MapPin} />
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Employment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <InfoRow label="Department" value={employee.department} icon={Building2} />
              <InfoRow label="Team" value={employee.team} icon={User} />
              <InfoRow label="Position" value={employee.position} icon={Briefcase} />
              <InfoRow label="Employment Type" value={employee.employment_type} icon={Building2} />
              <InfoRow label="Hire Date" value={formatDate(employee.hire_date)} icon={Calendar} />
              <InfoRow label="Status" value={employee.status} icon={Clock} />
            </div>
          </div>
        </motion.div>

        {/* Time Off Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {employee.pto_balance !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Calendar className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PTO Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {employee.pto_balance} hours
                  </p>
                </div>
              </div>
            </div>
          )}
          {employee.fmla_hours_remaining !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">FMLA Hours Remaining</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {employee.fmla_hours_remaining} hours
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
