import { X, Calendar, User, FileText, MessageSquare, History, Upload, Trash2, Download, Plus, Send, AlertTriangle, CheckCircle, Clock, Target, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

type TabType = "details" | "notes" | "development" | "audit" | "documents";

interface PIPNote {
  id: number;
  note_text: string;
  note_type: string;
  created_by: string | null;
  created_at: string;
}

interface PIPMilestone {
  id: number;
  milestone_title: string;
  description: string | null;
  due_date: string;
  status: string;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
}

interface PIpAuditEntry {
  id: number;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
}

interface PIPDocument {
  id: number;
  document_name: string;
  document_type: string;
  file_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

interface PIPDetail {
  id: number;
  pip_id: string;
  employee_id: string;
  employee_name?: string;
  manager_id: string | null;
  manager_name: string | null;
  hr_partner: string | null;
  title: string;
  reason: string;
  performance_issues: string;
  start_date: string;
  end_date: string;
  review_frequency: string | null;
  next_review_date: string | null;
  status: string;
  expectations: string;
  success_criteria: string;
  support_provided: string | null;
  progress_notes: string | null;
  milestones_met: string | null;
  areas_of_concern: string | null;
  outcome: string | null;
  outcome_date: string | null;
  outcome_notes: string | null;
  consequences_of_failure: string | null;
  employee_acknowledged: boolean;
  employee_acknowledgment_date: string | null;
  created_at: string;
  updated_at: string | null;
  notes?: PIPNote[];
  milestones?: PIPMilestone[];
  audit_trail?: PIpAuditEntry[];
  documents?: PIPDocument[];
}

interface PIPDetailDrawerProps {
  pipId: number | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PIPDetailDrawer({ pipId, onClose, onUpdate }: PIPDetailDrawerProps) {
  const [pipDetail, setPipDetail] = useState<PIPDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("details");

  // Notes state
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("General");
  const [addingNote, setAddingNote] = useState(false);

  // Milestone state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    milestone_title: "",
    description: "",
    due_date: "",
  });
  const [addingMilestone, setAddingMilestone] = useState(false);

  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pipId) {
      fetchPIPDetail();
    }
  }, [pipId]);

  const fetchPIPDetail = async () => {
    if (!pipId) return;

    setLoading(true);
    try {
      const response = await fetch(`/performance/pips/${pipId}/full`);
      const data = await response.json();
      setPipDetail(data);
    } catch (error) {
      console.error("Error fetching PIP details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!pipId) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/performance/pips/${pipId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchPIPDetail();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !pipId) return;

    setAddingNote(true);
    try {
      const response = await fetch(`/performance/pips/${pipId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note_text: newNote,
          note_type: noteType,
        }),
      });

      if (response.ok) {
        setNewNote("");
        fetchPIPDetail();
      }
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.milestone_title.trim() || !newMilestone.due_date || !pipId) return;

    setAddingMilestone(true);
    try {
      const response = await fetch(`/performance/pips/${pipId}/milestones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newMilestone),
      });

      if (response.ok) {
        setNewMilestone({ milestone_title: "", description: "", due_date: "" });
        setShowMilestoneForm(false);
        fetchPIPDetail();
      }
    } catch (error) {
      console.error("Error adding milestone:", error);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId: number, status: string) => {
    try {
      const response = await fetch(`/performance/pips/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchPIPDetail();
      }
    } catch (error) {
      console.error("Error updating milestone:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pipId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", "Supporting Document");

    try {
      const response = await fetch(`/performance/pips/${pipId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        fetchPIPDetail();
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/performance/pips/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPIPDetail();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Extended": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Successful": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Terminated": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "In Progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Pending": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ESC key support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const tabs = [
    { id: "details" as const, label: "Details", icon: FileText },
    { id: "notes" as const, label: "Notes", icon: MessageSquare },
    { id: "development" as const, label: "Development", icon: Target },
    { id: "audit" as const, label: "Audit Trail", icon: History },
    { id: "documents" as const, label: "Documents", icon: Upload },
  ];

  return (
    <AnimatePresence>
      {pipId && (
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
            className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-600 dark:text-gray-400">Loading PIP details...</div>
              </div>
            ) : pipDetail ? (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-6 h-6 text-orange-500" />
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {pipDetail.pip_id}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {pipDetail.title}
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
                <div className="px-6 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status:
                      </label>
                      <select
                        value={pipDetail.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                        className={`px-3 py-1 rounded-lg text-sm font-medium border-2 focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${getStatusColor(pipDetail.status)} ${
                          updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Extended">Extended</option>
                        <option value="Successful">Successful</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    {pipDetail.employee_acknowledged && (
                      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Employee Acknowledged
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b dark:border-gray-700">
                  <nav className="flex gap-1 px-6 overflow-x-auto">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Details Tab */}
                  {activeTab === "details" && (
                    <div className="space-y-6">
                      {/* Employee Information */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          Employee Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Employee:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {pipDetail.employee_name || pipDetail.employee_id}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Manager:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {pipDetail.manager_name || pipDetail.manager_id || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">HR Partner:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {pipDetail.hr_partner || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                          Timeline
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatDate(pipDetail.start_date)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatDate(pipDetail.end_date)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Review Frequency:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {pipDetail.review_frequency || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Next Review:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatDate(pipDetail.next_review_date)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reason & Issues */}
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 space-y-3 border border-orange-200 dark:border-orange-800">
                        <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                          Reason for PIP
                        </h3>
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          {pipDetail.reason}
                        </p>
                        {pipDetail.performance_issues && (
                          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                            <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                              Performance Issues
                            </h4>
                            <p className="text-sm text-orange-800 dark:text-orange-200">
                              {pipDetail.performance_issues}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Expectations */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3 border border-blue-200 dark:border-blue-800">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                          Expectations
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {pipDetail.expectations}
                        </p>
                      </div>

                      {/* Success Criteria */}
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-3 border border-green-200 dark:border-green-800">
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                          Success Criteria
                        </h3>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          {pipDetail.success_criteria}
                        </p>
                      </div>

                      {/* Support Provided */}
                      {pipDetail.support_provided && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-3 border border-purple-200 dark:border-purple-800">
                          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                            Support Provided
                          </h3>
                          <p className="text-sm text-purple-800 dark:text-purple-200">
                            {pipDetail.support_provided}
                          </p>
                        </div>
                      )}

                      {/* Consequences */}
                      {pipDetail.consequences_of_failure && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-3 border border-red-200 dark:border-red-800">
                          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                            Consequences of Non-Compliance
                          </h3>
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {pipDetail.consequences_of_failure}
                          </p>
                        </div>
                      )}

                      {/* Outcome */}
                      {pipDetail.outcome && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Outcome
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Result:</span>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {pipDetail.outcome}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Outcome Date:</span>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatDate(pipDetail.outcome_date)}
                              </p>
                            </div>
                          </div>
                          {pipDetail.outcome_notes && (
                            <div className="mt-3">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Notes:</span>
                              <p className="text-sm text-gray-900 dark:text-white mt-1">
                                {pipDetail.outcome_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes Tab */}
                  {activeTab === "notes" && (
                    <div className="space-y-6">
                      {/* Add Note */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          Add Note
                        </h3>
                        <div className="space-y-3">
                          <select
                            value={noteType}
                            onChange={(e) => setNoteType(e.target.value)}
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="General">General Note</option>
                            <option value="Progress Update">Progress Update</option>
                            <option value="Check-in Meeting">Check-in Meeting</option>
                            <option value="Concern">Area of Concern</option>
                            <option value="Improvement">Improvement Observed</option>
                            <option value="Action Item">Action Item</option>
                          </select>
                          <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a new note..."
                            className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={4}
                          />
                          <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || addingNote}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            {addingNote ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Adding Note...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Add Note
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Notes History */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Note History ({pipDetail.notes?.length || 0})
                        </h3>
                        {(!pipDetail.notes || pipDetail.notes.length === 0) ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                            No notes added yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {pipDetail.notes.map((note) => (
                              <div
                                key={note.id}
                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    note.note_type === "Concern" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" :
                                    note.note_type === "Improvement" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
                                    note.note_type === "Progress Update" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" :
                                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                  }`}>
                                    {note.note_type}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDateTime(note.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {note.note_text}
                                </p>
                                {note.created_by && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Added by: {note.created_by}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Development Tab */}
                  {activeTab === "development" && (
                    <div className="space-y-6">
                      {/* Add Milestone */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            Milestones & Follow-ups
                          </h3>
                          {!showMilestoneForm && (
                            <button
                              onClick={() => setShowMilestoneForm(true)}
                              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                            >
                              <Plus className="w-4 h-4" />
                              Add Milestone
                            </button>
                          )}
                        </div>

                        {showMilestoneForm && (
                          <div className="space-y-3 pt-3 border-t dark:border-gray-700">
                            <input
                              type="text"
                              value={newMilestone.milestone_title}
                              onChange={(e) => setNewMilestone({ ...newMilestone, milestone_title: e.target.value })}
                              placeholder="Milestone title"
                              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <textarea
                              value={newMilestone.description}
                              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                              placeholder="Description (optional)"
                              rows={2}
                              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                            <input
                              type="date"
                              value={newMilestone.due_date}
                              onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowMilestoneForm(false);
                                  setNewMilestone({ milestone_title: "", description: "", due_date: "" });
                                }}
                                className="flex-1 px-4 py-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleAddMilestone}
                                disabled={!newMilestone.milestone_title.trim() || !newMilestone.due_date || addingMilestone}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                              >
                                {addingMilestone ? "Adding..." : "Add Milestone"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Milestones List */}
                      {(!pipDetail.milestones || pipDetail.milestones.length === 0) ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                          No milestones defined yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {pipDetail.milestones.map((milestone) => (
                            <div
                              key={milestone.id}
                              className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {milestone.milestone_title}
                                  </h4>
                                  {milestone.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {milestone.description}
                                    </p>
                                  )}
                                </div>
                                <select
                                  value={milestone.status}
                                  onChange={(e) => handleUpdateMilestoneStatus(milestone.id, e.target.value)}
                                  className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getMilestoneStatusColor(milestone.status)}`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Overdue">Overdue</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Due: {formatDate(milestone.due_date)}
                                </span>
                                {milestone.completed_date && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    Completed: {formatDate(milestone.completed_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Progress Notes */}
                      {pipDetail.progress_notes && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Overall Progress Notes
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {pipDetail.progress_notes}
                          </p>
                        </div>
                      )}

                      {/* Areas of Concern */}
                      {pipDetail.areas_of_concern && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                            Areas of Concern
                          </h3>
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {pipDetail.areas_of_concern}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit Trail Tab */}
                  {activeTab === "audit" && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Activity History
                      </h3>

                      {(!pipDetail.audit_trail || pipDetail.audit_trail.length === 0) ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                          No activity recorded yet
                        </p>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                          <div className="space-y-4">
                            {pipDetail.audit_trail.map((entry) => (
                              <div key={entry.id} className="relative pl-10">
                                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400 border-2 border-white dark:border-gray-800" />
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {entry.action}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDateTime(entry.created_at)}
                                    </span>
                                  </div>
                                  {entry.field_changed && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      <span className="font-medium">{entry.field_changed}:</span>{" "}
                                      {entry.old_value && (
                                        <>
                                          <span className="line-through text-red-600 dark:text-red-400">{entry.old_value}</span>
                                          {" → "}
                                        </>
                                      )}
                                      <span className="text-green-600 dark:text-green-400">{entry.new_value}</span>
                                    </div>
                                  )}
                                  {entry.changed_by && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                      By: {entry.changed_by}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documents Tab */}
                  {activeTab === "documents" && (
                    <div className="space-y-6">
                      {/* Upload Section */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                          Upload Document
                        </h3>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin" />
                              <span className="text-sm">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8" />
                              <span className="text-sm">Click to upload a document</span>
                              <span className="text-xs">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Documents List */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Attached Documents ({pipDetail.documents?.length || 0})
                        </h3>
                        {(!pipDetail.documents || pipDetail.documents.length === 0) ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                            No documents attached yet
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {pipDetail.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700"
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {doc.document_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {doc.document_type} • Uploaded {formatDate(doc.uploaded_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`/performance/pips/documents/${doc.id}/download`}
                                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
