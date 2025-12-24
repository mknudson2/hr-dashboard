import { X, Send, Mail, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const BASE_URL = 'http://localhost:8000';

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  termination_date: string;
}

interface AccessRemovalEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function AccessRemovalEmailModal({
  isOpen,
  onClose,
  employee
}: AccessRemovalEmailModalProps) {
  const [toEmails, setToEmails] = useState<string[]>([""]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [requesterName, setRequesterName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAddToEmail = () => {
    setToEmails([...toEmails, ""]);
  };

  const handleRemoveToEmail = (index: number) => {
    setToEmails(toEmails.filter((_, i) => i !== index));
  };

  const handleUpdateToEmail = (index: number, value: string) => {
    const updated = [...toEmails];
    updated[index] = value;
    setToEmails(updated);
  };

  const handleAddCcEmail = () => {
    setCcEmails([...ccEmails, ""]);
  };

  const handleRemoveCcEmail = (index: number) => {
    setCcEmails(ccEmails.filter((_, i) => i !== index));
  };

  const handleUpdateCcEmail = (index: number, value: string) => {
    const updated = [...ccEmails];
    updated[index] = value;
    setCcEmails(updated);
  };

  const handleSend = async () => {
    if (!employee) return;

    // Validate emails
    const validToEmails = toEmails.filter(email => email.trim() && email.includes("@"));
    const validCcEmails = ccEmails.filter(email => email.trim() && email.includes("@"));

    if (validToEmails.length === 0) {
      setError("Please enter at least one valid recipient email address");
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch(`${BASE_URL}/offboarding/send-access-removal-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.employee_id,
          to_emails: validToEmails,
          cc_emails: validCcEmails.length > 0 ? validCcEmails : undefined,
          requester_name: requesterName.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send email");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setToEmails([""]);
        setCcEmails([]);
        setRequesterName("");
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (!employee) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Send Access Removal Checklist
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {employee.first_name} {employee.last_name} ({employee.employee_id})
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Employee Info */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {employee.first_name} {employee.last_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{employee.employee_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{employee.department}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Last Working Day:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(employee.termination_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* To Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Send To (Required) *
                  </label>
                  <div className="space-y-2">
                    {toEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleUpdateToEmail(index, e.target.value)}
                          placeholder="it@company.com"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                        />
                        {toEmails.length > 1 && (
                          <button
                            onClick={() => handleRemoveToEmail(index)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleAddToEmail}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add recipient
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Typically IT team, security team, and facilities
                  </p>
                </div>

                {/* CC Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CC (Optional)
                  </label>
                  <div className="space-y-2">
                    {ccEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleUpdateCcEmail(index, e.target.value)}
                          placeholder="hr@company.com"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                        />
                        <button
                          onClick={() => handleRemoveCcEmail(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddCcEmail}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add CC recipient
                    </button>
                  </div>
                </div>

                {/* Requester Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Will be included in the email for reference
                  </p>
                </div>

                {/* Email Preview Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Email will include:
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• Employee information and termination date</li>
                    <li>• Comprehensive access removal checklist with 12 items</li>
                    <li>• Priority levels (Critical, High, Medium)</li>
                    <li>• Specific actions required for each system</li>
                    <li>• Important deadlines and next steps</li>
                  </ul>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Access removal checklist sent successfully!
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || success}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Access Removal Checklist
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
