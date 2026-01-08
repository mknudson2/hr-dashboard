import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserMinus, CheckCircle, Clock, AlertTriangle, Plus, MessageSquare,
  FileText, Calendar, User, Briefcase, ChevronDown, ChevronUp, ChevronRight, Mail, Download, X, MailCheck
} from 'lucide-react';
import { OffboardingModal } from '@/components/OnboardingOffboardingModals';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import AccessRemovalEmailModal from '@/components/AccessRemovalEmailModal';
import ExitDocumentsEmailModal from '@/components/ExitDocumentsEmailModal';
import SubtasksDrawer from '@/components/SubtasksDrawer';
import OffboardingTaskDrawer from '@/components/OffboardingTaskDrawer';

const BASE_URL = '';

interface OffboardingTask {
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
  days_from_termination: number | null;
  notes?: string;
  task_details?: any;
  parent_task_id?: number | null;
  has_subtasks?: boolean;
  is_subtask?: boolean;
  subtasks?: OffboardingTask[];
}

interface DashboardStats {
  active_offboarding: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  exit_interviews_completed: number;
  exit_interviews_pending: number;
  recent_terminations: any[];
}

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  termination_date: string;
  department: string;
  exit_docs_sent?: boolean;
  exit_docs_sent_at?: string;
  exit_docs_sent_to?: string;
  exit_docs_attachment_count?: number;
}

export default function OffboardingPage() {
  const [searchParams] = useSearchParams();
  const employeeFromUrl = searchParams.get('employee');
  const [tasks, setTasks] = useState<OffboardingTask[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeFromUrl || '');
  // Default to "All" when viewing a specific employee, otherwise "Active" to hide completed
  const [statusFilter, setStatusFilter] = useState<string>(employeeFromUrl ? 'All' : 'Active');
  const [showModal, setShowModal] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<OffboardingTask | null>(null);
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [showAccessRemovalModal, setShowAccessRemovalModal] = useState(false);
  const [showExitDocumentsModal, setShowExitDocumentsModal] = useState(false);
  const [selectedEmployeeForEmail, setSelectedEmployeeForEmail] = useState<Employee | null>(null);
  const [showSubtasksDrawer, setShowSubtasksDrawer] = useState(false);
  const [selectedParentTask, setSelectedParentTask] = useState<OffboardingTask | null>(null);
  const [showUncheckModal, setShowUncheckModal] = useState(false);
  const [uncheckNote, setUncheckNote] = useState('');
  const [taskToUncheck, setTaskToUncheck] = useState<OffboardingTask | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [taskForNotes, setTaskForNotes] = useState<OffboardingTask | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showOffboardingTaskDrawer, setShowOffboardingTaskDrawer] = useState(false);
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<OffboardingTask | null>(null);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  useEffect(() => {
    loadData();
  }, []);

  // Auto-expand the employee if coming from a direct link (e.g., from Employee Detail page)
  // Also auto-create offboarding tasks if they don't exist for this employee
  useEffect(() => {
    const employeeParam = searchParams.get('employee');
    if (!employeeParam || loading) return;

    // Check if this employee has any tasks
    const employeeTasks = tasks.filter(t => t.employee_id === employeeParam);

    if (employeeTasks.length > 0) {
      // Tasks exist, just expand
      setExpandedEmployees(new Set([employeeParam]));
    } else {
      // No tasks exist - try to create them
      const ensureOffboardingTasks = async () => {
        try {
          const response = await fetch(`${BASE_URL}/offboarding/tasks/ensure/${employeeParam}`, {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            if (result.created) {
              // Tasks were created, reload data
              await loadData();
              setExpandedEmployees(new Set([employeeParam]));
            }
          }
        } catch (error) {
          console.error('Error ensuring offboarding tasks:', error);
        }
      };

      ensureOffboardingTasks();
    }
  }, [searchParams, loading, tasks.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes, employeesRes] = await Promise.all([
        fetch(`${BASE_URL}/offboarding/tasks`, { credentials: 'include' }),
        fetch(`${BASE_URL}/offboarding/dashboard`, { credentials: 'include' }),
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
      console.error('Error loading offboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string, uncheckReason?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        completed_date: newStatus === 'Completed' ? new Date().toISOString() : null
      };

      // If unchecking, add the reason to history
      if (newStatus === 'Not Started' && uncheckReason) {
        const historyEntry = {
          action: 'unchecked',
          timestamp: new Date().toISOString(),
          reason: uncheckReason
        };
        updateData.uncheck_history = historyEntry;
      }

      const response = await fetch(`${BASE_URL}/offboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Reload all data
        await loadData();

        // If SubtasksDrawer is open, refresh the selectedParentTask with updated subtasks
        if (selectedParentTask) {
          const tasksRes = await fetch(`${BASE_URL}/offboarding/tasks`, { credentials: 'include' });
          if (tasksRes.ok) {
            const data = await tasksRes.json();
            const updatedParentTask = data.tasks?.find((t: OffboardingTask) => t.id === selectedParentTask.id);
            if (updatedParentTask) {
              setSelectedParentTask(updatedParentTask);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskDrawerUpdate = async (taskId: number, updates: any) => {
    try {
      const response = await fetch(`${BASE_URL}/offboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Reload all data
        await loadData();

        // Fetch the updated task directly from the API to ensure we have the latest data
        const taskResponse = await fetch(`${BASE_URL}/offboarding/tasks?employee_id=${selectedTaskForDrawer?.employee_id || ''}`, { credentials: 'include' });
        if (taskResponse.ok) {
          const data = await taskResponse.json();
          // Search for the task in top-level tasks or within subtasks
          let updatedTask = data.tasks?.find((t: OffboardingTask) => t.id === taskId);

          // If not found in top-level, search in subtasks
          if (!updatedTask) {
            for (const parentTask of data.tasks || []) {
              if (parentTask.subtasks) {
                const subtask = parentTask.subtasks.find((st: OffboardingTask) => st.id === taskId);
                if (subtask) {
                  updatedTask = subtask;
                  break;
                }
              }
            }
          }

          if (updatedTask) {
            setSelectedTaskForDrawer(updatedTask);
          }
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCheckboxChange = (task: OffboardingTask, checked: boolean) => {
    if (!checked) {
      // If unchecking, show modal to require a note
      setTaskToUncheck(task);
      setUncheckNote('');
      setShowUncheckModal(true);
    } else {
      // If checking, proceed normally
      handleUpdateTaskStatus(task.id, 'Completed');
    }
  };

  const handleConfirmUncheck = async () => {
    if (!taskToUncheck || !uncheckNote.trim()) {
      alert('Please provide a reason for unchecking this task.');
      return;
    }

    await handleUpdateTaskStatus(taskToUncheck.id, 'Not Started', uncheckNote);
    setShowUncheckModal(false);
    setTaskToUncheck(null);
    setUncheckNote('');
  };

  const handleOpenNotesModal = (task: OffboardingTask) => {
    setTaskForNotes(task);
    setNoteText(task.notes || '');
    setShowNotesModal(true);
  };

  const handleSaveTaskNote = async () => {
    if (!taskForNotes) return;

    await handleAddNote(taskForNotes.id, noteText);
    setShowNotesModal(false);
    setTaskForNotes(null);
    setNoteText('');
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

  const handleOpenSubtasksDrawer = (task: OffboardingTask) => {
    setSelectedParentTask(task);
    setShowSubtasksDrawer(true);
  };

  const handleCheckAllSubtasks = async () => {
    if (!selectedParentTask || !selectedParentTask.subtasks) return;

    try {
      // Check all subtasks
      const updatePromises = selectedParentTask.subtasks.map(subtask =>
        fetch(`${BASE_URL}/offboarding/tasks/${subtask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: 'Completed',
            completed_date: new Date().toISOString().split('T')[0]
          })
        })
      );

      // Also mark parent as completed
      updatePromises.push(
        fetch(`${BASE_URL}/offboarding/tasks/${selectedParentTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: 'Completed',
            completed_date: new Date().toISOString().split('T')[0]
          })
        })
      );

      await Promise.all(updatePromises);

      // Reload data and update the selected parent task with fresh data
      await loadData();

      // Close the drawer after successful update
      setShowSubtasksDrawer(false);
      setSelectedParentTask(null);
    } catch (error) {
      console.error('Error checking all subtasks:', error);
      alert('Failed to check all subtasks. Please try again.');
    }
  };

  const handleSendAllNBSEmails = async () => {
    if (!selectedParentTask || !selectedParentTask.subtasks) return;

    setIsSendingEmails(true);

    try {
      // Get the employee_id from the selected parent task
      const employeeId = selectedParentTask.employee_id;

      if (!employeeId) {
        alert('Employee ID not found for this task');
        setIsSendingEmails(false);
        return;
      }

      // Send all NBS termination emails using the new endpoint
      const response = await fetch(`${BASE_URL}/emails/offboarding/nbs-term-all-by-employee/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send emails');
      }

      const result = await response.json();

      // Mark all subtasks as completed
      const updatePromises = selectedParentTask.subtasks.map(subtask =>
        fetch(`${BASE_URL}/offboarding/tasks/${subtask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: 'Completed',
            completed_date: new Date().toISOString()
          })
        })
      );

      // Also mark parent as completed
      updatePromises.push(
        fetch(`${BASE_URL}/offboarding/tasks/${selectedParentTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: 'Completed',
            completed_date: new Date().toISOString()
          })
        })
      );

      await Promise.all(updatePromises);
      await loadData();
      setShowSubtasksDrawer(false);

      // Show success message
      const successMessage = result.errors && result.errors.length > 0
        ? `${result.message} - Some emails failed to send. Check console for details.`
        : `Successfully sent all 10 NBS termination emails to michaelknudsonphd@gmail.com!`;

      setEmailSuccess({ show: true, message: successMessage });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setEmailSuccess({ show: false, message: '' });
      }, 5000);

      if (result.errors && result.errors.length > 0) {
        console.error('Email errors:', result.errors);
      }
    } catch (error) {
      console.error('Error sending NBS emails:', error);
      alert(`Failed to send NBS emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingEmails(false);
    }
  };

  const handleAddNote = async (taskId: number, note: string) => {
    try {
      await fetch(`${BASE_URL}/offboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: note })
      });
      await loadData();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
    }
  };

  const handleFileUpload = async (taskId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      await fetch(`${BASE_URL}/offboarding/tasks/${taskId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      await loadData();
      alert(`File "${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleTaskClick = (task: OffboardingTask) => {
    setSelectedTask(task);
    setShowTaskDrawer(true);
  };

  const handleDownloadPackage = async (employeeId: string, employeeName: string) => {
    try {
      const response = await fetch(`${BASE_URL}/offboarding/export-package/${employeeId}`, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob from the response
      const blob = await response.blob();

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Offboarding_Package_${employeeName.replace(' ', '_')}_${employeeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading package:', error);
      alert('Failed to download offboarding package. Please try again.');
    }
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

  // For grouping, we want ALL tasks for an employee (not filtered by completion status)
  // This ensures we can see completed tasks within an employee's section
  const tasksForGrouping = tasks.filter(task => {
    if (selectedEmployee && task.employee_id !== selectedEmployee) return false;
    // Apply specific status filters (skip filtering for 'Active' and 'All')
    if (statusFilter && statusFilter !== 'Active' && statusFilter !== 'All' && task.status !== statusFilter) return false;
    return true;
  });

  // Group tasks by employee
  // Note: The API already returns subtasks nested under parent tasks
  const groupedTasks = tasksForGrouping.reduce((acc, task) => {
    const key = task.employee_id;
    if (!acc[key]) acc[key] = [];

    // Add all tasks (API already filtered out subtasks and nested them)
    acc[key].push(task);

    return acc;
  }, {} as Record<string, OffboardingTask[]>);

  // If "Active" filter is selected, remove employees who have ALL tasks completed
  // But keep employees who have at least one incomplete task (showing all their tasks)
  if (statusFilter === 'Active') {
    Object.keys(groupedTasks).forEach(employeeId => {
      const employeeTasks = groupedTasks[employeeId];
      const hasAnyIncomplete = employeeTasks.some(task => task.status !== 'Completed');

      // Remove this employee if all their tasks are completed
      if (!hasAnyIncomplete) {
        delete groupedTasks[employeeId];
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast Notification */}
      {emailSuccess.show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-start gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Emails Sent Successfully!</p>
              <p className="text-sm text-green-100">{emailSuccess.message}</p>
            </div>
            <button
              onClick={() => setEmailSuccess({ show: false, message: '' })}
              className="text-white hover:text-green-100 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Offboarding</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage employee departures and exit processes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Offboarding
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Offboarding</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.active_offboarding}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <UserMinus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Exit Interviews</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.exit_interviews_completed}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.exit_interviews_pending} pending
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.completed_tasks}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  of {stats.total_tasks} total
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
                {stats.overdue_tasks > 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {stats.overdue_tasks} overdue
                  </p>
                )}
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              {employees.filter(e => e.termination_date).map((emp) => (
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
              <option value="Active">Active (Not Completed)</option>
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
            Offboarding Tasks
          </h2>

          {Object.keys(groupedTasks).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No offboarding tasks found. Create a new offboarding to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTasks).map(([employeeId, employeeTasks]) => {
                const employee = employees.find(e => e.employee_id === employeeId);
                const isExpanded = expandedEmployees.has(employeeId);
                const completedCount = employeeTasks.filter(t => t.status === 'Completed').length;
                const totalCount = employeeTasks.length;
                const isFullyCompleted = completedCount === totalCount;

                return (
                  <div key={employeeId} className={`border rounded-lg ${isFullyCompleted ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    {/* Employee Header - Clickable to collapse/expand */}
                    <div
                      onClick={() => toggleEmployeeExpanded(employeeId)}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-colors rounded-t-lg cursor-pointer ${isFullyCompleted ? 'hover:bg-green-100 dark:hover:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        )}
                        {isFullyCompleted && (
                          <div className="p-1 bg-green-500 rounded-full">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {employee ? `${employee.first_name} ${employee.last_name}` : employeeId}
                          </h3>
                          {employee && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {employee.department} • Last Day: {new Date(employee.termination_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {employee && employee.termination_date && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeForEmail(employee);
                                setShowAccessRemovalModal(true);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                              title="Send Access Removal Checklist"
                            >
                              <Mail className="w-4 h-4" />
                              Access Removal
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeForEmail(employee);
                                setShowExitDocumentsModal(true);
                              }}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                employee.exit_docs_sent
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title={
                                employee.exit_docs_sent && employee.exit_docs_sent_at
                                  ? `Exit docs sent on ${new Date(employee.exit_docs_sent_at).toLocaleDateString()} to ${employee.exit_docs_sent_to || 'employee'}`
                                  : 'Send Exit Documents Package'
                              }
                            >
                              {employee.exit_docs_sent ? (
                                <MailCheck className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              {employee.exit_docs_sent ? 'Docs Sent' : 'Exit Documents'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPackage(employee.employee_id, `${employee.first_name} ${employee.last_name}`);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                              title="Download Offboarding Package PDF"
                            >
                              <Download className="w-4 h-4" />
                              Download Package
                            </button>
                          </>
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {employeeTasks.filter(t => t.status === 'Completed').length} / {employeeTasks.length} completed
                        </div>
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(employeeTasks.filter(t => t.status === 'Completed').length / employeeTasks.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tasks - Collapsible */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {employeeTasks.sort((a, b) => (a.days_from_termination || 0) - (b.days_from_termination || 0)).map((task) => {
                          const hasSubtasks = task.has_subtasks && task.subtasks && task.subtasks.length > 0;

                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                              onClick={() => {
                                if (hasSubtasks) {
                                  // Open SubtasksDrawer for tasks with subtasks
                                  handleOpenSubtasksDrawer(task);
                                } else {
                                  // Open OffboardingTaskDrawer for task details
                                  setSelectedTaskForDrawer(task);
                                  setShowOffboardingTaskDrawer(true);
                                }
                              }}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <input
                                  type="checkbox"
                                  checked={task.status === 'Completed'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleCheckboxChange(task, e.target.checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-medium ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                      {task.task_name}
                                    </p>
                                    {hasSubtasks && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                        {task.subtasks?.filter(st => st.status === 'Completed').length}/{task.subtasks?.length} items
                                      </span>
                                    )}
                                  </div>
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
                                    {task.days_from_termination !== null && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        • Day {task.days_from_termination >= 0 ? '+' : ''}{task.days_from_termination}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {hasSubtasks ? (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    View {task.subtasks?.length} items →
                                  </span>
                                ) : (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    Click for details →
                                  </span>
                                )}
                                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Offboarding Modal */}
      <OffboardingModal
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
        taskType="offboarding"
        onUpdate={() => {
          loadData();
        }}
      />

      <AccessRemovalEmailModal
        isOpen={showAccessRemovalModal}
        onClose={() => {
          setShowAccessRemovalModal(false);
          setSelectedEmployeeForEmail(null);
        }}
        employee={selectedEmployeeForEmail}
      />

      <ExitDocumentsEmailModal
        isOpen={showExitDocumentsModal}
        onClose={() => {
          setShowExitDocumentsModal(false);
          setSelectedEmployeeForEmail(null);
        }}
        employee={selectedEmployeeForEmail}
        onSuccess={() => {
          // Refresh employee data to show updated sent status
          loadData();
        }}
      />

      {/* Subtasks Drawer */}
      <SubtasksDrawer
        isOpen={showSubtasksDrawer}
        onClose={() => {
          setShowSubtasksDrawer(false);
          setSelectedParentTask(null);
        }}
        parentTask={selectedParentTask}
        subtasks={selectedParentTask?.subtasks || []}
        onUpdateSubtask={(subtaskId, newStatus) => {
          handleUpdateTaskStatus(subtaskId, newStatus);
        }}
        onCheckAll={handleCheckAllSubtasks}
        onActionButton={selectedParentTask?.task_details?.has_action_button ? handleSendAllNBSEmails : undefined}
        onAddNote={handleAddNote}
        onFileUpload={handleFileUpload}
        isActionLoading={isSendingEmails}
        employeeId={(selectedParentTask as any)?.employee_id}
      />

      {/* Uncheck Confirmation Modal */}
      {showUncheckModal && taskToUncheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowUncheckModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Uncheck Task</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You are about to uncheck "{taskToUncheck.task_name}". Please provide a reason for unchecking this task.
            </p>
            <textarea
              value={uncheckNote}
              onChange={(e) => setUncheckNote(e.target.value)}
              placeholder="Enter reason for unchecking..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowUncheckModal(false);
                  setTaskToUncheck(null);
                  setUncheckNote('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (uncheckNote.trim()) {
                    handleUpdateTaskStatus(taskToUncheck.id, 'Not Started', uncheckNote);
                    setShowUncheckModal(false);
                    setTaskToUncheck(null);
                    setUncheckNote('');
                  } else {
                    alert('Please provide a reason for unchecking this task.');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Confirm Uncheck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal for Main Tasks */}
      {showNotesModal && taskForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNotesModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {taskForNotes.notes ? 'Edit Note' : 'Add Note'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Task: <span className="font-medium">{taskForNotes.task_name}</span>
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note here..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px]"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setTaskForNotes(null);
                  setNoteText('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (taskForNotes && handleAddNote) {
                    handleAddNote(taskForNotes.id, noteText);
                    setShowNotesModal(false);
                    setTaskForNotes(null);
                    setNoteText('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offboarding Task Drawer */}
      <OffboardingTaskDrawer
        isOpen={showOffboardingTaskDrawer}
        onClose={() => {
          setShowOffboardingTaskDrawer(false);
          setSelectedTaskForDrawer(null);
        }}
        task={selectedTaskForDrawer}
        onUpdate={handleTaskDrawerUpdate}
      />
    </div>
  );
}
