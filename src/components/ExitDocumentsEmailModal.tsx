import { X, Send, FileText, Plus, Trash2, DollarSign, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const BASE_URL = 'http://localhost:8000';

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  termination_date: string;
  position?: string;
}

interface ExitDocumentsEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function ExitDocumentsEmailModal({
  isOpen,
  onClose,
  employee
}: ExitDocumentsEmailModalProps) {
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [finalPayDate, setFinalPayDate] = useState("");
  const [ptoBalanceHours, setPtoBalanceHours] = useState("0");
  const [ptoPayoutAmount, setPtoPayoutAmount] = useState("0");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

    // Validate required fields
    if (!employeeEmail.trim() || !employeeEmail.includes("@")) {
      setError("Please enter a valid employee email address");
      return;
    }

    if (!finalPayDate) {
      setError("Please select a final pay date");
      return;
    }

    setSending(true);
    setError("");

    try {
      const validCcEmails = ccEmails.filter(email => email.trim() && email.includes("@"));

      const response = await fetch(`${BASE_URL}/offboarding/send-exit-documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.employee_id,
          employee_email: employeeEmail.trim(),
          final_pay_date: finalPayDate,
          pto_balance_hours: parseFloat(ptoBalanceHours) || 0,
          pto_payout_amount: parseFloat(ptoPayoutAmount) || 0,
          cc_emails: validCcEmails.length > 0 ? validCcEmails : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send exit documents");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setEmployeeEmail("");
        setFinalPayDate("");
        setPtoBalanceHours("0");
        setPtoPayoutAmount("0");
        setCcEmails([]);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send exit documents");
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
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Send Exit Documents
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
                      <span className="text-gray-600 dark:text-gray-400">Position:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{employee.position || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{employee.department}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Last Working Day:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(employee.termination_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employee Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employee Email Address *
                  </label>
                  <input
                    type="email"
                    value={employeeEmail}
                    onChange={(e) => setEmployeeEmail(e.target.value)}
                    placeholder="employee@email.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Exit documents will be sent to this address
                  </p>
                </div>

                {/* Final Pay Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Final Pay Date *
                  </label>
                  <input
                    type="date"
                    value={finalPayDate}
                    onChange={(e) => setFinalPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Date when final paycheck will be available
                  </p>
                </div>

                {/* PTO Information */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    PTO Payout Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        PTO Balance (hours)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={ptoBalanceHours}
                        onChange={(e) => setPtoBalanceHours(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        PTO Payout Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={ptoPayoutAmount}
                        onChange={(e) => setPtoPayoutAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    PTO payout will be included in the final paycheck
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
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add CC recipient
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Typically HR manager, payroll, and direct manager
                  </p>
                </div>

                {/* Email Contents Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Exit documents will include:
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• Final compensation details and pay date</li>
                    <li>• PTO balance and payout information</li>
                    <li>• Benefits continuation (COBRA) information</li>
                    <li>• Company property return checklist</li>
                    <li>• Exit interview scheduling information</li>
                    <li>• Important reminders (confidentiality, non-compete, etc.)</li>
                    <li>• Contact information for questions</li>
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
                      ✓ Exit documents sent successfully!
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Exit Documents
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
