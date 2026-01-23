import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost } from '@/utils/api';
import { Clock, CheckCircle, AlertCircle, FileText, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface Case {
  id: number;
  case_number: string;
  status: string;
  leave_type: string;
  hours_remaining: number;
}

interface MyCasesData {
  cases: Case[];
}

export default function SubmitTime() {
  const navigate = useNavigate();
  const { isSupervisor } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);

  // Form state
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('');
  const [leaveDate, setLeaveDate] = useState('');
  const [hoursRequested, setHoursRequested] = useState('');
  const [entryType, setEntryType] = useState('Full Day');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        setNoEmployeeRecord(false);
        const result = await apiGet<MyCasesData>('/portal/my-cases');
        // Filter to only active/approved cases
        const activeCases = result.cases.filter(c =>
          c.status.toLowerCase() === 'active' || c.status.toLowerCase() === 'approved'
        );
        setCases(activeCases);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load cases';
        if (errMsg.includes('not linked to an employee record')) {
          setNoEmployeeRecord(true);
        } else {
          setError(errMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiPost('/portal/submit-time', {
        case_id: selectedCaseId,
        leave_date: leaveDate,
        hours_requested: parseFloat(hoursRequested),
        entry_type: entryType,
        employee_notes: notes || null,
      });

      setSuccess(true);
      // Reset form
      setSelectedCaseId('');
      setLeaveDate('');
      setHoursRequested('');
      setEntryType('Full Day');
      setNotes('');

      // Redirect after delay
      setTimeout(() => {
        navigate('/my-submissions');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit time entry');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Time Entry Submitted!</h2>
          <p className="text-gray-600 mt-2">Your submission is pending supervisor approval.</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting to My Submissions...</p>
        </div>
      </motion.div>
    );
  }

  if (noEmployeeRecord) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Time Entry</h1>
          <p className="text-gray-600 mt-1">Log your FMLA time for supervisor approval</p>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center max-w-md">
            <Users className="mx-auto text-blue-500 mb-4" size={48} />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Employee Record Linked</h2>
            <p className="text-gray-600 mb-4">
              Your account is not linked to an employee record, so you cannot submit time entries.
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

  if (cases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Time Entry</h1>
          <p className="text-gray-600 mt-1">Log your FMLA time for supervisor approval</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900">No Active Cases</h3>
          <p className="text-gray-500 mt-1">
            You need an active FMLA case to submit time entries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Time Entry</h1>
        <p className="text-gray-600 mt-1">Log your FMLA time for supervisor approval</p>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Case Selection */}
          <div>
            <label htmlFor="case" className="block text-sm font-medium text-gray-700 mb-2">
              FMLA Case <span className="text-red-500">*</span>
            </label>
            <select
              id="case"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} - {c.leave_type} ({c.hours_remaining.toFixed(1)} hrs remaining)
                </option>
              ))}
            </select>
          </div>

          {/* Selected case info */}
          {selectedCase && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <FileText size={18} />
                <span className="font-medium">{selectedCase.case_number}</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                {selectedCase.leave_type} • {selectedCase.hours_remaining.toFixed(1)} hours remaining
              </p>
            </div>
          )}

          {/* Date and Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Leave Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
                Hours Requested <span className="text-red-500">*</span>
              </label>
              <input
                id="hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hoursRequested}
                onChange={(e) => setHoursRequested(e.target.value)}
                placeholder="8"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Entry Type */}
          <div>
            <label htmlFor="entryType" className="block text-sm font-medium text-gray-700 mb-2">
              Entry Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entryType"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="Full Day">Full Day</option>
              <option value="Partial Day">Partial Day</option>
              <option value="Intermittent">Intermittent</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any additional notes for your supervisor..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCaseId}
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
                  <Clock size={20} />
                  Submit Time Entry
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
