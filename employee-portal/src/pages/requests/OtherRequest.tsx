import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '@/utils/api';
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  Paperclip,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface OtherRequestFormData {
  category: string;
  subject: string;
  description: string;
  urgency: string;
  preferred_contact: string;
  attachments: File[];
}

const requestCategories = [
  { value: 'employment_verification', label: 'Employment Verification', description: 'Letter for loan, rental, or other verification needs' },
  { value: 'salary_verification', label: 'Salary Verification', description: 'Income verification for mortgage or financial purposes' },
  { value: 'policy_question', label: 'Policy Question', description: 'Questions about company policies or procedures' },
  { value: 'benefits_question', label: 'Benefits Question', description: 'Questions about health, retirement, or other benefits' },
  { value: 'payroll_issue', label: 'Payroll Issue', description: 'Questions or issues with pay, deductions, or tax forms' },
  { value: 'job_change', label: 'Job Change Request', description: 'Transfer, schedule change, or role modification' },
  { value: 'complaint', label: 'Complaint/Concern', description: 'Workplace concerns or formal complaints' },
  { value: 'general', label: 'General Inquiry', description: 'Other HR-related questions or requests' },
];

const urgencyLevels = [
  { value: 'low', label: 'Low', description: 'Can be addressed within 1-2 weeks', color: 'text-green-600 dark:text-green-400' },
  { value: 'medium', label: 'Medium', description: 'Would like response within 1 week', color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'high', label: 'High', description: 'Time-sensitive, need response ASAP', color: 'text-red-600 dark:text-red-400' },
];

export default function OtherRequest() {
  const navigate = useNavigate();
  const { viewMode } = useEmployeeFeatures();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<OtherRequestFormData>({
    category: '',
    subject: '',
    description: '',
    urgency: 'medium',
    preferred_contact: 'email',
    attachments: [],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData({ ...formData, attachments: [...formData.attachments, ...newFiles] });
    }
  };

  const removeFile = (index: number) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // In a real app, you'd use FormData for file uploads
      const requestData = {
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        urgency: formData.urgency,
        preferred_contact: formData.preferred_contact,
        has_attachments: formData.attachments.length > 0,
      };

      await apiPost('/portal/requests/other', requestData);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = formData.category !== '' && formData.subject !== '' && formData.description !== '';

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
            Your request has been submitted successfully. An HR representative will respond based on
            the urgency level you selected.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected Response Time</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li><span className="text-red-600 dark:text-red-400 font-medium">High urgency:</span> Within 24-48 hours</li>
              <li><span className="text-yellow-600 dark:text-yellow-400 font-medium">Medium urgency:</span> Within 3-5 business days</li>
              <li><span className="text-green-600 dark:text-green-400 font-medium">Low urgency:</span> Within 1-2 weeks</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  category: '',
                  subject: '',
                  description: '',
                  urgency: 'medium',
                  preferred_contact: 'email',
                  attachments: [],
                });
              }}
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
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Other HR Request"
          subtitle="Submit a general HR request or question"
          rightContent={
            <button
              onClick={() => navigate('/requests/new')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-lg transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          }
        />
      ) : (
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/requests/new')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Other HR Request</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Submit a general HR request or question
            </p>
          </div>
        </div>
      )}

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            What type of request is this? *
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requestCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.value })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.category === cat.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <p className="font-medium text-gray-900 dark:text-white">{cat.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cat.description}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Request Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Request Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Brief summary of your request"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Please provide as much detail as possible about your request or question..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="text-gray-400" size={32} />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB each
                </p>
              </label>
            </div>
            {formData.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="text-gray-400" size={16} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Urgency & Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Urgency & Contact Preference
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How urgent is this request?
            </label>
            <div className="flex flex-wrap gap-3">
              {urgencyLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: level.value })}
                  className={`flex-1 min-w-[120px] p-3 rounded-lg border text-center transition-all ${
                    formData.urgency === level.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <p className={`font-medium ${level.color}`}>{level.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Contact Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contact"
                  value="email"
                  checked={formData.preferred_contact === 'email'}
                  onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contact"
                  value="phone"
                  checked={formData.preferred_contact === 'phone'}
                  onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Phone</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contact"
                  value="meeting"
                  checked={formData.preferred_contact === 'meeting'}
                  onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">In-Person Meeting</span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end gap-3"
        >
          <button
            type="button"
            onClick={() => navigate('/requests/new')}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
