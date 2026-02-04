import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '@/utils/api';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface AccommodationFormData {
  accommodation_type: string;
  description: string;
  medical_condition: string;
  current_limitations: string;
  requested_accommodations: string;
  start_date: string;
  duration: string;
  has_documentation: boolean;
  additional_notes: string;
}

const accommodationTypes = [
  { value: 'physical', label: 'Physical/Mobility', description: 'Ergonomic equipment, accessible workspace, modified duties' },
  { value: 'sensory', label: 'Sensory', description: 'Visual or hearing accommodations, assistive technology' },
  { value: 'cognitive', label: 'Cognitive/Mental Health', description: 'Flexible scheduling, quiet workspace, task modifications' },
  { value: 'medical', label: 'Medical Condition', description: 'Schedule modifications, breaks, treatment accommodations' },
  { value: 'religious', label: 'Religious', description: 'Schedule adjustments, dress code modifications, prayer time' },
  { value: 'other', label: 'Other', description: 'Other workplace accommodation needs' },
];

const durationOptions = [
  { value: 'temporary_30', label: 'Temporary (up to 30 days)' },
  { value: 'temporary_90', label: 'Temporary (up to 90 days)' },
  { value: 'temporary_indefinite', label: 'Temporary (duration unknown)' },
  { value: 'permanent', label: 'Permanent/Ongoing' },
];

export default function AccommodationRequest() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccommodationFormData>({
    accommodation_type: '',
    description: '',
    medical_condition: '',
    current_limitations: '',
    requested_accommodations: '',
    start_date: '',
    duration: '',
    has_documentation: false,
    additional_notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await apiPost('/portal/requests/accommodation', formData);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = formData.accommodation_type !== '';
  const canProceedStep2 = formData.description !== '' && formData.requested_accommodations !== '';
  const canSubmit = canProceedStep1 && canProceedStep2 && formData.start_date !== '' && formData.duration !== '';

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request Submitted</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your accommodation request has been submitted successfully. HR will review your request and
            contact you within 3-5 business days to discuss next steps.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Info className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>HR will review your request</li>
                  <li>You may be asked to provide medical documentation</li>
                  <li>An interactive process meeting may be scheduled</li>
                  <li>A decision will be communicated in writing</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate('/requests/new')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/requests/new')}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workplace Accommodation Request</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Request a workplace accommodation under the ADA or for other qualifying needs
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-16 h-1 mx-2 rounded ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center text-sm text-gray-500 dark:text-gray-400">
        <span className="w-24 text-center">Type</span>
        <span className="w-24 text-center">Details</span>
        <span className="w-24 text-center">Review</span>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
          <div>
            <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Type Selection */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Accommodation Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accommodationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, accommodation_type: type.value })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.accommodation_type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedStep1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Accommodation Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brief Description of Your Request *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Briefly describe what accommodation you are requesting..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Medical Condition or Reason (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.medical_condition}
                onChange={(e) => setFormData({ ...formData, medical_condition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="If applicable, describe the condition requiring accommodation..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This information is confidential and only shared with HR.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Work Limitations
              </label>
              <textarea
                rows={2}
                value={formData.current_limitations}
                onChange={(e) => setFormData({ ...formData, current_limitations: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe any current limitations affecting your work..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Requested Accommodations *
              </label>
              <textarea
                required
                rows={3}
                value={formData.requested_accommodations}
                onChange={(e) => setFormData({ ...formData, requested_accommodations: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="List the specific accommodations you are requesting..."
              />
            </div>

            <div className="flex gap-3 justify-between mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedStep2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Review & Submit
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Requested Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expected Duration *
                </label>
                <select
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select duration</option>
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has_documentation"
                checked={formData.has_documentation}
                onChange={(e) => setFormData({ ...formData, has_documentation: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="has_documentation" className="text-sm text-gray-700 dark:text-gray-300">
                I have medical documentation to support this request
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Any additional information..."
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Request Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Type:</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">
                    {accommodationTypes.find(t => t.value === formData.accommodation_type)?.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Description:</dt>
                  <dd className="text-gray-900 dark:text-white mt-1">{formData.description}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Requested Accommodations:</dt>
                  <dd className="text-gray-900 dark:text-white mt-1">{formData.requested_accommodations}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Privacy Notice:</strong> All accommodation requests are handled confidentially.
                Medical information is protected and only shared with those who need to know to process your request.
              </p>
            </div>

            <div className="flex gap-3 justify-between mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
