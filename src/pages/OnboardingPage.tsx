import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle, Clock, AlertTriangle, Plus, Search,
  Filter, Calendar, User, Briefcase, Mail, ChevronDown, ChevronUp
} from 'lucide-react';
import { OnboardingModal } from '@/components/OnboardingOffboardingModals';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';

const BASE_URL = '';


interface OnboardingTask {
  id: number;
  task_id: string;
  employee_id: string;
  task_name: string;
  task_description: string | null;
  category: string;
  assigned_to_role: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  completed_date: string | null;
  days_from_start: number | null;
  notes?: string;
  task_details?: Record<string, unknown>;
}

interface DashboardStats {
  active_onboarding: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  recent_hires: Array<{
    employee_id: string;
    first_name: string;
    last_name: string;
    hire_date: string;
    department: string;
  }>;
}

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  hire_date: string;
  department: string;
}

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes, employeesRes] = await Promise.all([
        fetch(`${BASE_URL}/onboarding/tasks`, { credentials: 'include' }),
        fetch(`${BASE_URL}/onboarding/dashboard`, { credentials: 'include' }),
        fetch(`${BASE_URL}/analytics/employees`, { credentials: 'include' })
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch(`${BASE_URL}/onboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          completed_date: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : null
        })
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const toggleEmployeeExpanded = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const handleTaskClick = (task: OnboardingTask) => {
    setSelectedTask(task);
    setShowTaskDrawer(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'In Progress':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'Not Started':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-600 dark:text-red-400';
      case 'High':
        return 'text-orange-600 dark:text-orange-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedEmployee && task.employee_id !== selectedEmployee) return false;
    if (statusFilter && task.status !== statusFilter) return false;
    return true;
  });

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.employee_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Onboarding</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage new hire onboarding tasks and checklists
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Onboarding
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Onboarding</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.active_onboarding}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_tasks}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.completed_tasks}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.completion_rate}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Onboarding Tasks
          </h2>

          {Object.keys(groupedTasks).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No onboarding tasks found. Create a new onboarding to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTasks).map(([employeeId, employeeTasks]) => {
                const employee = employees.find(e => e.employee_id === employeeId);
                const isExpanded = expandedEmployees.has(employeeId);

                return (
                  <div key={employeeId} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    {/* Employee Header - Clickable to collapse/expand */}
                    <button
                      onClick={() => toggleEmployeeExpanded(employeeId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {employee ? `${employee.first_name} ${employee.last_name}` : employeeId}
                          </h3>
                          {employee && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {employee.department} • Hired: {new Date(employee.hire_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {employeeTasks.filter(t => t.status === 'Completed').length} / {employeeTasks.length} completed
                        </div>
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(employeeTasks.filter(t => t.status === 'Completed').length / employeeTasks.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Tasks - Collapsible */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {employeeTasks.sort((a, b) => (a.days_from_start || 0) - (b.days_from_start || 0)).map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <input
                                type="checkbox"
                                checked={task.status === 'Completed'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const newStatus = e.target.checked ? 'Completed' : 'Not Started';
                                  handleUpdateTaskStatus(task.id, newStatus);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <p className={`font-medium ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                  {task.task_name}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {task.category}
                                  </span>
                                  {task.assigned_to_role && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • {task.assigned_to_role}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.days_from_start !== null && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • Day {task.days_from_start}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        employees={employees}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        isOpen={showTaskDrawer}
        onClose={() => setShowTaskDrawer(false)}
        task={selectedTask}
        taskType="onboarding"
        onUpdate={() => {
          loadData();
        }}
      />
    </div>
  );
}
