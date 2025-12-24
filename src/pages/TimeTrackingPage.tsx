import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, Save, Send, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

interface Project {
  id: number;
  project_code: string;
  project_name: string;
  is_capitalizable: boolean;
  capitalization_type: string | null;
  status: string;
}

interface TimeEntry {
  id?: number;
  project_id: number;
  work_date: string;
  hours: number;
  labor_type: string;
  is_overtime: boolean;
  task_description: string;
  project_name?: string;
  is_capitalizable?: boolean;
}

interface Timesheet {
  id: number;
  employee_id: number;
  employee_name: string;
  pay_period_id: number;
  pay_period_start: string;
  pay_period_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  status: string;
  submitted_at: string | null;
  time_entries?: TimeEntry[];
}

const TimeTrackingPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [newEntry, setNewEntry] = useState<TimeEntry>({
    project_id: 0,
    work_date: new Date().toISOString().split('T')[0],
    hours: 0,
    labor_type: 'direct',
    is_overtime: false,
    task_description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get current user from auth context (in a real app, this would come from auth)
  const currentEmployeeId = 1; // Mock employee ID

  useEffect(() => {
    fetchProjects();
    fetchCurrentTimesheet();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects?status=active`);
      setProjects(response.data.projects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    }
  };

  const fetchCurrentTimesheet = async () => {
    try {
      setLoading(true);
      // Get current timesheet for employee
      const response = await axios.get(`${API_URL}/timesheets?employee_id=${currentEmployeeId}`);

      if (response.data.timesheets && response.data.timesheets.length > 0) {
        // Get the most recent timesheet
        const timesheet = response.data.timesheets[0];
        setCurrentTimesheet(timesheet);

        // Fetch detailed timesheet with entries
        const detailResponse = await axios.get(`${API_URL}/timesheets/${timesheet.id}`);
        setCurrentTimesheet(detailResponse.data);
        setTimeEntries(detailResponse.data.time_entries || []);
      }
    } catch (err) {
      console.error('Error fetching timesheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.project_id || !newEntry.work_date || newEntry.hours <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError(null);
      await axios.post(
        `${API_URL}/time-entries?employee_id=${currentEmployeeId}`,
        newEntry
      );

      setSuccessMessage('Time entry added successfully');

      // Reset form
      setNewEntry({
        project_id: 0,
        work_date: new Date().toISOString().split('T')[0],
        hours: 0,
        labor_type: 'direct',
        is_overtime: false,
        task_description: ''
      });

      // Refresh timesheet
      await fetchCurrentTimesheet();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error adding time entry:', err);
      setError(err.response?.data?.detail || 'Failed to add time entry');
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!currentTimesheet) return;

    try {
      setError(null);
      await axios.post(`${API_URL}/timesheets/${currentTimesheet.id}/submit`);
      setSuccessMessage('Timesheet submitted for approval');
      await fetchCurrentTimesheet();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error submitting timesheet:', err);
      setError(err.response?.data?.detail || 'Failed to submit timesheet');
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await axios.delete(`${API_URL}/time-entries/${entryId}?user_id=${currentEmployeeId}`);
      setSuccessMessage('Time entry deleted');
      await fetchCurrentTimesheet();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      setError(err.response?.data?.detail || 'Failed to delete entry');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: JSX.Element; text: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: <Clock className="w-4 h-4" />, text: 'Draft' },
      submitted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: <Send className="w-4 h-4" />, text: 'Submitted' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle className="w-4 h-4" />, text: 'Approved' },
      needs_revision: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: <AlertCircle className="w-4 h-4" />, text: 'Needs Revision' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: <XCircle className="w-4 h-4" />, text: 'Rejected' }
    };

    const badge = badges[status] || badges.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Time Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400">Log your hours and manage your timesheet</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Current Timesheet Summary */}
      {currentTimesheet && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Timesheet</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pay Period: {new Date(currentTimesheet.pay_period_start).toLocaleDateString()} - {new Date(currentTimesheet.pay_period_end).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge(currentTimesheet.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentTimesheet.total_hours.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Regular Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentTimesheet.regular_hours.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overtime Hours</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentTimesheet.overtime_hours.toFixed(2)}</p>
            </div>
          </div>

          {currentTimesheet.status === 'draft' && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmitTimesheet}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add New Time Entry */}
      {(!currentTimesheet || currentTimesheet.status === 'draft' || currentTimesheet.status === 'needs_revision') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Time Entry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project
              </label>
              <select
                value={newEntry.project_id}
                onChange={(e) => setNewEntry({ ...newEntry, project_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={0}>Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_name} ({project.project_code})
                    {project.is_capitalizable && ' 🔒'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={newEntry.work_date}
                onChange={(e) => setNewEntry({ ...newEntry, work_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hours
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={newEntry.hours}
                onChange={(e) => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labor Type
              </label>
              <select
                value={newEntry.labor_type}
                onChange={(e) => setNewEntry({ ...newEntry, labor_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="direct">Direct Labor</option>
                <option value="indirect">Indirect Labor</option>
                <option value="overhead">Overhead</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEntry.is_overtime}
                  onChange={(e) => setNewEntry({ ...newEntry, is_overtime: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overtime</span>
              </label>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Description
              </label>
              <textarea
                value={newEntry.task_description}
                onChange={(e) => setNewEntry({ ...newEntry, task_description: e.target.value })}
                rows={3}
                placeholder="Describe what you worked on..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddEntry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>
      )}

      {/* Time Entries List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Time Entries
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                {currentTimesheet?.status === 'draft' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No time entries yet. Add your first entry above!
                  </td>
                </tr>
              ) : (
                timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(entry.work_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {entry.project_name}
                        {entry.is_capitalizable && (
                          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded">
                            Capitalizable
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {entry.hours.toFixed(2)}
                        {entry.is_overtime && (
                          <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-0.5 rounded">
                            OT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {entry.labor_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {entry.task_description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {entry.is_approved ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Approved
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Pending</span>
                      )}
                    </td>
                    {currentTimesheet?.status === 'draft' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => entry.id && handleDeleteEntry(entry.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingPage;
