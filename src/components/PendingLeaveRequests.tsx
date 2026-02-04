import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  User,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Send,
  Building,
} from "lucide-react";

interface LeaveRequest {
  id: number;
  employee_id: string;
  employee_name: string;
  department: string | null;
  leave_type: string;
  reason: string | null;
  requested_start_date: string | null;
  requested_end_date: string | null;
  intermittent: boolean;
  reduced_schedule: boolean;
  estimated_hours_per_week: number | null;
  status: string;
  submitted_at: string | null;
  hr_notes: string | null;
  linked_case_id: number | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

interface PendingLeaveRequestsProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestReviewed?: () => void;
}

export default function PendingLeaveRequests({
  isOpen,
  onClose,
  onRequestReviewed,
}: PendingLeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewData, setReviewData] = useState({
    decision: "",
    hr_notes: "",
    create_case: true,
    template_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
      fetchEmailTemplates();
    }
  }, [isOpen]);

  const fetchEmailTemplates = async () => {
    try {
      const response = await fetch("/fmla/leave-requests/email-templates", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Error fetching email templates:", err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/fmla/leave-requests?status=submitted", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch leave requests");
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest || !reviewData.decision) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/fmla/leave-requests/${selectedRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(reviewData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit review");
      }

      const result = await response.json();

      // Check for overlap warning
      if (result.warning) {
        // Show warning but still consider it a success
        const warningMsg = `${result.warning.message}\n\n${result.warning.action}`;
        alert(`Review submitted successfully.\n\nNote: ${warningMsg}`);
      }

      // Refresh the list
      fetchRequests();
      setSelectedRequest(null);
      setReviewMode(false);
      setReviewData({ decision: "", hr_notes: "", create_case: true, template_id: "" });

      if (onRequestReviewed) {
        onRequestReviewed();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
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

  const getScheduleType = (request: LeaveRequest) => {
    const types = [];
    if (request.intermittent) types.push("Intermittent");
    if (request.reduced_schedule) types.push("Reduced Schedule");
    return types.length > 0 ? types.join(", ") : "Continuous";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => !reviewMode && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Pending Leave Requests
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review employee FMLA leave requests from the self-service portal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error && !selectedRequest ? (
              <div className="flex items-center justify-center py-12 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mb-4 text-green-500" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm">No pending leave requests to review.</p>
              </div>
            ) : selectedRequest ? (
              /* Request Detail View */
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewMode(false);
                    setError(null);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
                >
                  &larr; Back to list
                </button>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedRequest.employee_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedRequest.employee_id}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-sm rounded-full">
                      Pending Review
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-600">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {selectedRequest.department || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Leave Type</p>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {selectedRequest.leave_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedRequest.requested_start_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedRequest.requested_end_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Type</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getScheduleType(selectedRequest)}
                      </p>
                    </div>
                    {selectedRequest.estimated_hours_per_week && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Est. Hours/Week</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.estimated_hours_per_week}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Submitted</p>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(selectedRequest.submitted_at)}
                      </p>
                    </div>
                  </div>

                  {selectedRequest.reason && (
                    <div className="pt-4 border-t dark:border-gray-600">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Employee Notes / Reason
                      </p>
                      <p className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Review Form */}
                {reviewMode ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Review Decision
                    </h4>

                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          setReviewData({ ...reviewData, decision: "approved" })
                        }
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                          reviewData.decision === "approved"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                            : "border-gray-200 dark:border-gray-600 hover:border-green-300"
                        }`}
                      >
                        <CheckCircle
                          className={`w-6 h-6 mx-auto mb-2 ${
                            reviewData.decision === "approved"
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        />
                        <p
                          className={`font-medium ${
                            reviewData.decision === "approved"
                              ? "text-green-700 dark:text-green-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          Approve
                        </p>
                      </button>
                      <button
                        onClick={() =>
                          setReviewData({ ...reviewData, decision: "denied" })
                        }
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                          reviewData.decision === "denied"
                            ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                            : "border-gray-200 dark:border-gray-600 hover:border-red-300"
                        }`}
                      >
                        <XCircle
                          className={`w-6 h-6 mx-auto mb-2 ${
                            reviewData.decision === "denied"
                              ? "text-red-600"
                              : "text-gray-400"
                          }`}
                        />
                        <p
                          className={`font-medium ${
                            reviewData.decision === "denied"
                              ? "text-red-700 dark:text-red-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          Deny
                        </p>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        HR Notes (sent to employee)
                      </label>
                      <textarea
                        value={reviewData.hr_notes}
                        onChange={(e) =>
                          setReviewData({ ...reviewData, hr_notes: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Optional notes to include in the notification email..."
                      />
                    </div>

                    {emailTemplates.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Template (optional)
                        </label>
                        <select
                          value={reviewData.template_id}
                          onChange={(e) =>
                            setReviewData({ ...reviewData, template_id: e.target.value })
                          }
                          className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Use default email template</option>
                          {emailTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                              {template.is_default && " (Default)"}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Custom templates can be managed in Settings → Email Templates
                        </p>
                      </div>
                    )}

                    {reviewData.decision === "approved" && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewData.create_case}
                          onChange={(e) =>
                            setReviewData({
                              ...reviewData,
                              create_case: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Automatically create FMLA case when approved
                        </span>
                      </label>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setReviewMode(false);
                          setError(null);
                        }}
                        className="flex-1 px-4 py-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReview}
                        disabled={!reviewData.decision || submitting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Review
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReviewMode(true)}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Review This Request
                  </button>
                )}
              </div>
            ) : (
              /* Request List View */
              <div className="space-y-3">
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {request.employee_name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.leave_type} &middot;{" "}
                            {request.department || "No department"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(request.requested_start_date)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Submitted {formatDate(request.submitted_at)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
