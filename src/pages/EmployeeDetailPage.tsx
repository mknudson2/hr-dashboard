import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Heart,
  Award,
  Cake,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import SalaryHistoryChart from "@/components/compensation/SalaryHistoryChart";

interface EmployeeDetail {
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  status: string;
  type: string;
  location: string;
  department: string;
  cost_center: string;
  team: string;
  hire_date: string | null;
  termination_date: string | null;
  termination_type: string | null;
  tenure_years: number;
  wage: number;
  benefits_cost: number;
  pto_allotted: number;
  pto_used: number;
  pto_remaining: number | null;
  attendance_days: number;
  expected_days: number;
  birth_date?: string | null;
  show_birthday?: boolean;
  show_tenure?: boolean;
  show_exact_dates?: boolean;
}

interface WageHistoryRecord {
  effective_date: string;
  wage: number;
  change_reason: string | null;
  change_amount: number | null;
  change_percentage: number | null;
}

export default function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [wageHistory, setWageHistory] = useState<WageHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        setLoading(true);

        // Fetch employee details
        const empRes = await fetch(
          `/analytics/employees/${employeeId}`
        );
        const empData = await empRes.json();

        if (empData.error) {
          setError(empData.error);
          return;
        }

        setEmployee(empData);

        // Fetch wage history
        const wageRes = await fetch(
          `/analytics/employees/${employeeId}/wage-history`
        );
        const wageData = await wageRes.json();

        if (!wageData.error) {
          setWageHistory(wageData);
        }
      } catch (err) {
        console.error("Error fetching employee data:", err);
        setError("Failed to load employee details");
      } finally {
        setLoading(false);
      }
    }

    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId]);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading employee details...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error || "Employee not found"}</div>
        <button
          onClick={() => navigate("/employees")}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Employees
        </button>
      </div>
    );
  }

  const InfoCard = ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number | null;
  }) => (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="text-blue-600 dark:text-blue-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {value ?? "N/A"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/employees")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {employee.full_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {employee.employee_id} •{" "}
            <span
              className={`font-medium ${
                employee.status === "Active"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {employee.status}
            </span>
          </p>
        </div>
      </div>

      {/* Termination Banner - Shows for terminated employees */}
      {employee.status === "Terminated" && employee.termination_date && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Employment Terminated
                </p>
                <p className="text-lg font-semibold text-red-900 dark:text-red-100">
                  {new Date(employee.termination_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {employee.termination_type && (
                    <span className="ml-2 text-sm font-normal text-red-700 dark:text-red-300">
                      ({employee.termination_type})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/offboarding?employee=${employee.employee_id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              <ClipboardList className="w-4 h-4" />
              View Offboarding Checklist
            </button>
          </div>
        </motion.div>
      )}

      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Personal Information
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            icon={<User className="w-4 h-4" />}
            label="Employee ID"
            value={employee.employee_id}
          />
          <InfoCard
            icon={<Briefcase className="w-4 h-4" />}
            label="Type"
            value={employee.type}
          />
          <InfoCard
            icon={<MapPin className="w-4 h-4" />}
            label="Location"
            value={employee.location}
          />
          <InfoCard
            icon={<Calendar className="w-4 h-4" />}
            label="Hire Date"
            value={
              employee.hire_date
                ? new Date(employee.hire_date).toLocaleDateString()
                : null
            }
          />
          <InfoCard
            icon={<Clock className="w-4 h-4" />}
            label="Tenure"
            value={`${employee.tenure_years} years`}
          />
          {employee.termination_date && (
            <InfoCard
              icon={<Calendar className="w-4 h-4" />}
              label="Termination Date"
              value={new Date(employee.termination_date).toLocaleDateString()}
            />
          )}
        </div>
      </motion.div>

      {/* Position Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Position & Organization
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={<Briefcase className="w-4 h-4" />}
            label="Department"
            value={employee.department}
          />
          <InfoCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Cost Center"
            value={employee.cost_center}
          />
          <InfoCard
            icon={<User className="w-4 h-4" />}
            label="Team"
            value={employee.team}
          />
        </div>
      </motion.div>

      {/* Compensation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Compensation & Benefits
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Annual Wage"
            value={
              employee.wage ? `$${employee.wage.toLocaleString()}` : null
            }
          />
          <InfoCard
            icon={<Heart className="w-4 h-4" />}
            label="Benefits Cost"
            value={
              employee.benefits_cost
                ? `$${employee.benefits_cost.toLocaleString()}`
                : null
            }
          />
          <InfoCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Total Compensation"
            value={
              employee.wage && employee.benefits_cost
                ? `$${(employee.wage + employee.benefits_cost).toLocaleString()}`
                : null
            }
          />
        </div>
      </motion.div>

      {/* PTO & Attendance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            PTO & Attendance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            icon={<Calendar className="w-4 h-4" />}
            label="PTO Allotted"
            value={employee.pto_allotted ? `${employee.pto_allotted} days` : null}
          />
          <InfoCard
            icon={<Calendar className="w-4 h-4" />}
            label="PTO Used"
            value={employee.pto_used ? `${employee.pto_used} days` : null}
          />
          <InfoCard
            icon={<Calendar className="w-4 h-4" />}
            label="PTO Remaining"
            value={
              employee.pto_remaining !== null
                ? `${employee.pto_remaining} days`
                : null
            }
          />
          <InfoCard
            icon={<Clock className="w-4 h-4" />}
            label="Attendance Rate"
            value={
              employee.attendance_days && employee.expected_days
                ? `${Math.round(
                    (employee.attendance_days / employee.expected_days) * 100
                  )}%`
                : null
            }
          />
        </div>
      </motion.div>

      {/* Tenure & Birthday Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Tenure & Personal Dates
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tenure Timeline */}
          {employee.hire_date && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tenure Timeline
                </h3>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Hire Date</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(employee.hire_date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Years of Service</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {employee.tenure_years} years
                  </span>
                </div>
                {/* Next Anniversary */}
                {(() => {
                  const today = new Date();
                  const hireDate = new Date(employee.hire_date);
                  const nextAnniversary = new Date(
                    today.getFullYear(),
                    hireDate.getMonth(),
                    hireDate.getDate()
                  );
                  if (nextAnniversary < today) {
                    nextAnniversary.setFullYear(today.getFullYear() + 1);
                  }
                  const daysUntil = Math.ceil(
                    (nextAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div className="flex items-center justify-between pt-3 border-t border-blue-200 dark:border-blue-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Next Anniversary</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {daysUntil === 0 ? "Today!" : `in ${daysUntil} days`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Birthday Information */}
          {employee.birth_date && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Birthday Information
                </h3>
              </div>
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Birthday</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {employee.show_exact_dates
                      ? new Date(employee.birth_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        })
                      : new Date(employee.birth_date).toLocaleDateString("en-US", {
                          month: "long",
                        })}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Age</span>
                  <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {(() => {
                      const today = new Date();
                      const birthDate = new Date(employee.birth_date);
                      let age = today.getFullYear() - birthDate.getFullYear();
                      if (
                        today.getMonth() < birthDate.getMonth() ||
                        (today.getMonth() === birthDate.getMonth() &&
                          today.getDate() < birthDate.getDate())
                      ) {
                        age--;
                      }
                      return age;
                    })()}{" "}
                    years
                  </span>
                </div>
                {/* Next Birthday */}
                {(() => {
                  const today = new Date();
                  const birthDate = new Date(employee.birth_date);
                  const nextBirthday = new Date(
                    today.getFullYear(),
                    birthDate.getMonth(),
                    birthDate.getDate()
                  );
                  if (nextBirthday < today) {
                    nextBirthday.setFullYear(today.getFullYear() + 1);
                  }
                  const daysUntil = Math.ceil(
                    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div className="flex items-center justify-between pt-3 border-t border-pink-200 dark:border-pink-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Next Birthday</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {daysUntil === 0 ? "Today!" : `in ${daysUntil} days`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Wage History */}
      {wageHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Wage History
            </h2>
          </div>
          <SalaryHistoryChart
            history={wageHistory}
            currentSalary={employee.wage}
            employeeName={employee.full_name}
          />
        </motion.div>
      )}
    </div>
  );
}
