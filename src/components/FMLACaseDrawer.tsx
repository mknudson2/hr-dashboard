import { X, Calendar, Clock, User, FileText, TrendingUp, Activity, Plus, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import FMLADocuments from "./FMLADocuments";

interface LeaveEntry {
  id: number;
  leave_date: string;
  hours_taken: number;
  entry_type: string;
  notes: string | null;
}

interface CaseNote {
  id: number;
  note_text: string;
  created_at: string;
}

interface FMLACaseDetail {
  id: number;
  case_number: string;
  employee_id: string;
  employee_name: string;
  department: string | null;
  status: string;
  leave_type: string;
  reason: string | null;
  request_date: string | null;
  start_date: string | null;
  end_date: string | null;
  hours_approved: number;
  hours_used: number;
  hours_remaining: number;
  intermittent: boolean;
  reduced_schedule: boolean;
  certification_date: string | null;
  recertification_date: string | null;
  return_to_work_date: string | null;
  notes: string | null;
  leave_entries: LeaveEntry[];
  case_notes: CaseNote[];
}

interface FMLACaseDrawerProps {
  caseId: number | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function FMLACaseDrawer({ caseId, onClose, onUpdate }: FMLACaseDrawerProps) {
  const [caseDetail, setCaseDetail] = useState<FMLACaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (caseId) {
      fetchCaseDetail();
    }
  }, [caseId]);

  const fetchCaseDetail = async () => {
    if (!caseId) return;

    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/fmla/cases/${caseId}`);
      const data = await response.json();
      setCaseDetail(data);
    } catch (error) {
      console.error("Error fetching FMLA case details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !caseId) return;

    setAddingNote(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/fmla/cases/${caseId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          case_id: caseId,
          note_text: newNote,
        }),
      });

      if (response.ok) {
        setNewNote("");
        // Refresh case details to get updated notes
        fetchCaseDetail();
      }
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!caseId) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/fmla/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        // Refresh case details to show updated status
        fetchCaseDetail();
        // Notify parent component to refresh the cases list
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Denied": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate usage patterns
  const getUsagePattern = () => {
    if (!caseDetail || !caseDetail.leave_entries.length) return null;

    const entries = caseDetail.leave_entries;
    const totalEntries = entries.length;
    const avgHoursPerEntry = entries.reduce((sum, e) => sum + e.hours_taken, 0) / totalEntries;

    // Calculate frequency (average days between entries)
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.leave_date).getTime() - new Date(b.leave_date).getTime()
    );

    let totalDaysBetween = 0;
    for (let i = 1; i < sortedEntries.length; i++) {
      const days = Math.abs(
        (new Date(sortedEntries[i].leave_date).getTime() -
         new Date(sortedEntries[i - 1].leave_date).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      totalDaysBetween += days;
    }
    const avgDaysBetween = sortedEntries.length > 1 ? totalDaysBetween / (sortedEntries.length - 1) : 0;

    // Determine pattern
    let pattern = "Irregular";
    if (avgDaysBetween < 10) pattern = "Frequent (Weekly)";
    else if (avgDaysBetween < 20) pattern = "Moderate (Bi-weekly)";
    else if (avgDaysBetween < 35) pattern = "Monthly";

    return {
      totalEntries,
      avgHoursPerEntry: avgHoursPerEntry.toFixed(1),
      avgDaysBetween: avgDaysBetween.toFixed(0),
      pattern,
    };
  };

  const usagePattern = getUsagePattern();

  // ESC key support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <AnimatePresence>
      {caseId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-600 dark:text-gray-400">Loading case details...</div>
              </div>
            ) : caseDetail ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b dark:border-gray-700 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {caseDetail.case_number}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      FMLA Case Details
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Status Management */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Case Status:
                    </label>
                    <select
                      value={caseDetail.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updatingStatus}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border-2 focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${getStatusColor(caseDetail.status)} ${
                        updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Closed">Closed</option>
                      <option value="Denied">Denied</option>
                    </select>
                    {updatingStatus && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Updating...</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {caseDetail.intermittent && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Intermittent
                      </span>
                    )}
                    {caseDetail.reduced_schedule && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                        Reduced Schedule
                      </span>
                    )}
                  </div>
                </div>

                {/* Employee Information */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Employee Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{caseDetail.employee_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{caseDetail.employee_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{caseDetail.department || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Supervisor:</span>
                      <p className="font-medium text-gray-900 dark:text-white">TBD</p>
                    </div>
                  </div>
                </div>

                {/* Case Details */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Case Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Leave Type:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{caseDetail.leave_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Request Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(caseDetail.request_date)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{caseDetail.reason || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Important Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(caseDetail.start_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Anticipated End Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(caseDetail.end_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Certification Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(caseDetail.certification_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Return to Work Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(caseDetail.return_to_work_date)}</p>
                    </div>
                  </div>
                </div>

                {/* FMLA Documents */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <FMLADocuments
                    caseId={caseDetail.id}
                    employeeId={caseDetail.employee_id.toString()}
                    leaveReason={caseDetail.reason || caseDetail.leave_type}
                    onDocumentUpdate={fetchCaseDetail}
                  />
                </div>

                {/* Hours Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Hours Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{caseDetail.hours_approved}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Approved</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{caseDetail.hours_used.toFixed(1)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Used</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{caseDetail.hours_remaining.toFixed(1)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Remaining</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Usage Progress</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {((caseDetail.hours_used / caseDetail.hours_approved) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full transition-all ${
                            caseDetail.hours_remaining < 40
                              ? "bg-red-500"
                              : caseDetail.hours_remaining < 120
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${(caseDetail.hours_used / caseDetail.hours_approved) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Pattern */}
                {usagePattern && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Usage Pattern Analysis
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total Entries:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{usagePattern.totalEntries}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Avg Hours/Entry:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{usagePattern.avgHoursPerEntry} hrs</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Frequency:</span>
                        <p className="font-medium text-gray-900 dark:text-white">Every ~{usagePattern.avgDaysBetween} days</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Pattern:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{usagePattern.pattern}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leave Entries */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    Leave Entry History ({caseDetail.leave_entries.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {caseDetail.leave_entries.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                        No leave entries recorded yet
                      </p>
                    ) : (
                      caseDetail.leave_entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatDate(entry.leave_date)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {entry.entry_type}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{entry.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">{entry.hours_taken.toFixed(2)} hrs</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Case Notes Log */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Case Notes
                  </h3>

                  {/* Add Note Input */}
                  <div className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a new note..."
                      className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                      rows={3}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addingNote}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      {addingNote ? (
                        "Adding Note..."
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Add Note
                        </>
                      )}
                    </button>
                  </div>

                  {/* Notes History */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {caseDetail.case_notes && caseDetail.case_notes.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                        No notes added yet
                      </p>
                    ) : (
                      caseDetail.case_notes && caseDetail.case_notes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(note.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{note.note_text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Original Case Notes (if any) */}
                {caseDetail.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-2 border border-yellow-200 dark:border-yellow-800">
                    <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Original Case Notes</h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{caseDetail.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
