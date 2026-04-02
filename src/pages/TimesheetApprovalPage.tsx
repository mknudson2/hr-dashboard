import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Users, Calendar, Eye, MessageSquare } from 'lucide-react';
import axios from 'axios';

const API_URL = '';

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
  approved_at: string | null;
  rejection_reason: string | null;
  time_entries?: TimeEntry[];
}

interface TimeEntry {
  id: number;
  project_id: number;
  project_name: string;
  work_date: string;
  hours: number;
  labor_type: string;
  is_overtime: boolean;
  task_description: string;
  is_capitalizable: boolean;
  is_approved: boolean;
}

interface TimesheetStats {
  pending: number;
  approved: number;
  needsRevision: number;
  total: number;
}

const TimesheetApprovalPage: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('submitted');
  const [stats, setStats] = useState<TimesheetStats>({ pending: 0, approved: 0, needsRevision: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [timesheetToReject, setTimesheetToReject] = useState<number | null>(null);

  // Mock manager ID (in real app, from auth context)
  const currentManagerId = 1;

  useEffect(() => {
    fetchTimesheets();
  }, [filterStatus]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await axios.get(`${API_URL}/timesheets`, { params });
      const fetchedTimesheets = response.data.timesheets || [];
      setTimesheets(fetchedTimesheets);

      // Calculate stats
      const statsData = {
        pending: fetchedTimesheets.filter((ts: Timesheet) => ts.status === 'submitted').length,
        approved: fetchedTimesheets.filter((ts: Timesheet) => ts.status === 'approved').length,
        needsRevision: fetchedTimesheets.filter((ts: Timesheet) => ts.status === 'needs_revision').length,
        total: fetchedTimesheets.length
      };
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching timesheets:', err);
      setError('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheetDetails = async (timesheetId: number) => {
    try {
      const response = await axios.get(`${API_URL}/timesheets/${timesheetId}`);
      setSelectedTimesheet(response.data);
    } catch (err) {
      console.error('Error fetching timesheet details:', err);
      setError('Failed to load timesheet details');
    }
  };

  const handleApprove = async (timesheetId: number) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/timesheets/${timesheetId}/approve?manager_id=${currentManagerId}`);
      setSuccessMessage('Timesheet approved successfully');

      // Refresh data
      await fetchTimesheets();
      if (selectedTimesheet?.id === timesheetId) {
        await fetchTimesheetDetails(timesheetId);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error approving timesheet:', err);
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to approve timesheet');
    }
  };

  const handleRejectClick = (timesheetId: number) => {
    setTimesheetToReject(timesheetId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!timesheetToReject || !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setError(null);
      await axios.post(
        `${API_URL}/timesheets/${timesheetToReject}/reject?manager_id=${currentManagerId}`,
        { rejection_reason: rejectionReason }
      );

      setSuccessMessage('Timesheet rejected - employee has been notified');
      setShowRejectModal(false);
      setTimesheetToReject(null);
      setRejectionReason('');

      // Refresh data
      await fetchTimesheets();
      if (selectedTimesheet?.id === timesheetToReject) {
        await fetchTimesheetDetails(timesheetToReject);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error rejecting timesheet:', err);
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to reject timesheet');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: JSX.Element; text: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: <Clock className="w-4 h-4" />, text: 'Draft' },
      submitted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: <AlertCircle className="w-4 h-4" />, text: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle className="w-4 h-4" />, text: 'Approved' },
      needs_revision: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: <XCircle className="w-4 h-4" />, text: 'Needs Revision' },
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

  if (loading && timesheets.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading timesheets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Users className="w-7 h-7" />
          Timesheet Approval
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Review and approve team timesheets</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Needs Revision</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.needsRevision}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Timesheets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { value: 'all', label: 'All' },
            { value: 'submitted', label: 'Pending Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'needs_revision', label: 'Needs Revision' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterStatus === filter.value
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timesheets List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timesheets</h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {timesheets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No timesheets found
              </div>
            ) : (
              timesheets.map((timesheet) => (
                <div
                  key={timesheet.id}
                  onClick={() => fetchTimesheetDetails(timesheet.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedTimesheet?.id === timesheet.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{timesheet.employee_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(timesheet.pay_period_start).toLocaleDateString()} - {new Date(timesheet.pay_period_end).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(timesheet.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {timesheet.total_hours.toFixed(1)}h total
                    </span>
                    {timesheet.overtime_hours > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">
                        {timesheet.overtime_hours.toFixed(1)}h OT
                      </span>
                    )}
                  </div>

                  {timesheet.status === 'submitted' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(timesheet.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectClick(timesheet.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {selectedTimesheet ? (
            <>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTimesheet.employee_name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(selectedTimesheet.pay_period_start).toLocaleDateString()} - {new Date(selectedTimesheet.pay_period_end).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedTimesheet.status)}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Hours</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedTimesheet.total_hours.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Regular</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedTimesheet.regular_hours.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Overtime</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{selectedTimesheet.overtime_hours.toFixed(2)}</p>
                  </div>
                </div>

                {selectedTimesheet.rejection_reason && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{selectedTimesheet.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Time Entries</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedTimesheet.time_entries && selectedTimesheet.time_entries.length > 0 ? (
                    selectedTimesheet.time_entries.map((entry) => (
                      <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">{entry.project_name}</span>
                              {entry.is_capitalizable && (
                                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded">
                                  Capitalizable
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(entry.work_date).toLocaleDateString()} • {entry.labor_type}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">{entry.hours.toFixed(2)}h</p>
                            {entry.is_overtime && (
                              <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-0.5 rounded">
                                OT
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.task_description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{entry.task_description}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No time entries</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a timesheet to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Timesheet</h3>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Rejection
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Explain why this timesheet needs revision..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setTimesheetToReject(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject Timesheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetApprovalPage;
