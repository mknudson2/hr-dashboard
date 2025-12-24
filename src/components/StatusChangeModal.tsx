import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserMinus, UserCheck, RotateCcw, Calendar, FileText } from 'lucide-react';

// Export the StatusChangeData type first
export type StatusChangeData = {
  newStatus: string;
  reason?: 'mistakenly_terminated' | 'rehired' | 'termination_cancelled';
  rehireDate?: string;
  cancellationReason?: string;
  notes?: string;
};

interface Employee {
  employee_id: string;
  full_name: string;
  status: string;
  termination_date?: string | null;
}

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  changeType: 'to_terminated' | 'to_active';
  onConfirm: (data: StatusChangeData) => Promise<void>;
}

export default function StatusChangeModal({
  isOpen,
  onClose,
  employee,
  changeType,
  onConfirm,
}: StatusChangeModalProps) {
  const [selectedReason, setSelectedReason] = useState<StatusChangeData['reason']>();
  const [rehireDate, setRehireDate] = useState(new Date().toISOString().split('T')[0]);
  const [cancellationReason, setCancellationReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (changeType === 'to_active' && !selectedReason) {
      setError('Please select a reason for reactivating this employee.');
      return;
    }

    if (selectedReason === 'termination_cancelled' && !cancellationReason.trim()) {
      setError('Please provide a reason for the cancellation.');
      return;
    }

    if (selectedReason === 'rehired' && !rehireDate) {
      setError('Please provide a rehire date.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data: StatusChangeData = {
        newStatus: changeType === 'to_terminated' ? 'Terminated' : 'Active',
        reason: changeType === 'to_active' ? selectedReason : undefined,
        rehireDate: selectedReason === 'rehired' ? rehireDate : undefined,
        cancellationReason: selectedReason === 'termination_cancelled' ? cancellationReason : undefined,
        notes: notes.trim() || undefined,
      };

      await onConfirm(data);
      handleClose();
    } catch (err) {
      setError('Failed to update employee status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(undefined);
    setRehireDate(new Date().toISOString().split('T')[0]);
    setCancellationReason('');
    setNotes('');
    setError(null);
    onClose();
  };

  if (!employee) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${
                changeType === 'to_terminated'
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      changeType === 'to_terminated'
                        ? 'bg-red-100 dark:bg-red-800'
                        : 'bg-green-100 dark:bg-green-800'
                    }`}>
                      {changeType === 'to_terminated' ? (
                        <UserMinus className="w-6 h-6 text-red-600 dark:text-red-400" />
                      ) : (
                        <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {changeType === 'to_terminated' ? 'Confirm Termination' : 'Reactivate Employee'}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.full_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {changeType === 'to_terminated' ? (
                  /* Termination Confirmation */
                  <>
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-medium mb-1">Please confirm this action</p>
                        <p>Setting this employee's status to Terminated will:</p>
                        <ul className="list-disc ml-4 mt-2 space-y-1">
                          <li>Create a new offboarding checklist with all required tasks</li>
                          <li>Set the termination date to today</li>
                          <li>Trigger offboarding workflows</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this termination..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </>
                ) : (
                  /* Reactivation Options */
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Why is this employee being reactivated?
                      </label>
                      <div className="space-y-3">
                        {/* Mistakenly Terminated */}
                        <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                          selectedReason === 'mistakenly_terminated'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>
                          <input
                            type="radio"
                            name="reason"
                            value="mistakenly_terminated"
                            checked={selectedReason === 'mistakenly_terminated'}
                            onChange={() => setSelectedReason('mistakenly_terminated')}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                Mistakenly Terminated
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              The termination was entered in error. All termination data and offboarding tasks will be removed.
                            </p>
                          </div>
                        </label>

                        {/* Rehired */}
                        <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                          selectedReason === 'rehired'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>
                          <input
                            type="radio"
                            name="reason"
                            value="rehired"
                            checked={selectedReason === 'rehired'}
                            onChange={() => setSelectedReason('rehired')}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                Rehired
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              The employee is being rehired. Previous termination data will be archived for historical records.
                            </p>
                          </div>
                        </label>

                        {/* Termination Cancelled */}
                        <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                          selectedReason === 'termination_cancelled'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>
                          <input
                            type="radio"
                            name="reason"
                            value="termination_cancelled"
                            checked={selectedReason === 'termination_cancelled'}
                            onChange={() => setSelectedReason('termination_cancelled')}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                Termination Cancelled
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              The termination was planned but has been cancelled. A reason must be provided.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Rehire Date Input */}
                    {selectedReason === 'rehired' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Rehire Date
                        </label>
                        <input
                          type="date"
                          value={rehireDate}
                          onChange={(e) => setRehireDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </motion.div>
                    )}

                    {/* Cancellation Reason Input */}
                    {selectedReason === 'termination_cancelled' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Reason for Cancellation <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                          placeholder="Explain why the termination was cancelled..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </motion.div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional notes..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-white rounded-lg transition flex items-center gap-2 ${
                    changeType === 'to_terminated'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : changeType === 'to_terminated' ? (
                    'Confirm Termination'
                  ) : (
                    'Reactivate Employee'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
