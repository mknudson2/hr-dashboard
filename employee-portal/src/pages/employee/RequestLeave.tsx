import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost } from '@/utils/api';
import { Send, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const LEAVE_TYPES = [
  { value: 'Employee Medical', label: 'Employee Medical', description: 'For your own serious health condition' },
  { value: 'Family Care', label: 'Family Care', description: 'To care for a family member with a serious health condition' },
  { value: 'Military Family', label: 'Military Family Leave', description: 'Qualifying exigency for military family members' },
  { value: 'Bonding', label: 'Bonding Leave', description: 'For birth, adoption, or foster care placement' },
];

export default function RequestLeave() {
  const navigate = useNavigate();
  const { isEmployee, isSupervisor } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [intermittent, setIntermittent] = useState(false);
  const [reducedSchedule, setReducedSchedule] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState('');

  // Show message if user doesn't have employee record
  if (!isEmployee) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request FMLA Leave</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Submit a new FMLA leave request for HR review</p>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center max-w-md">
            <Users className="mx-auto text-blue-500 mb-4" size={48} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Employee Record Linked</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your account is not linked to an employee record, so you cannot submit leave requests.
            </p>
            {isSupervisor && (
              <Link
                to="/team"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users size={18} />
                View Team Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiPost('/portal/request-leave', {
        leave_type: leaveType,
        reason: reason || null,
        requested_start_date: startDate,
        requested_end_date: endDate || null,
        intermittent,
        reduced_schedule: reducedSchedule,
        estimated_hours_per_week: estimatedHours ? parseFloat(estimatedHours) : null,
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Request Submitted!</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your FMLA leave request has been submitted to HR for review. You will be notified once a decision has been made.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request FMLA Leave</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Submit a new FMLA leave request for HR review</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> This form initiates a new FMLA leave request. HR will review your request and may contact you for additional documentation. Approval typically takes 5-7 business days.
        </p>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LEAVE_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                    leaveType === type.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="leaveType"
                    value={type.value}
                    checked={leaveType === type.value}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="sr-only"
                    required
                  />
                  <div className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">{type.label}</span>
                    <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{type.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requested Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requested End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave blank if unknown or ongoing</p>
            </div>
          </div>

          {/* Leave Schedule Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Leave Schedule</label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={intermittent}
                  onChange={(e) => setIntermittent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Intermittent Leave</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leave taken in separate blocks of time (e.g., medical appointments, flare-ups)
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedSchedule}
                  onChange={(e) => setReducedSchedule(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Reduced Schedule</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Working fewer hours per day or days per week
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Estimated Hours (if intermittent/reduced) */}
          {(intermittent || reducedSchedule) && (
            <div>
              <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Hours Per Week
              </label>
              <input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                max="40"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="e.g., 8"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Approximate hours of leave needed per week
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason / Additional Information
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Please provide any additional details about your leave request. Do not include specific medical diagnoses - HR will contact you if certification is required."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !leaveType || !startDate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
