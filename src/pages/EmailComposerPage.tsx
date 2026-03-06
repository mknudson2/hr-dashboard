import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiPost } from '@/utils/api';

export default function EmailComposerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('applicationId');
  const applicantEmail = searchParams.get('email') || '';
  const applicantName = searchParams.get('name') || '';

  const [toEmail, setToEmail] = useState(applicantEmail);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const TEMPLATES = [
    {
      label: 'Follow-up',
      subject: `Follow-up: Your Application`,
      body: `<p>Hi ${applicantName || '[Name]'},</p>\n<p>Thank you for your interest. We wanted to follow up regarding your application.</p>\n<p>Please don't hesitate to reach out if you have any questions.</p>\n<p>Best regards,<br>HR Team</p>`,
    },
    {
      label: 'Additional Info Needed',
      subject: `Additional Information Needed`,
      body: `<p>Hi ${applicantName || '[Name]'},</p>\n<p>We are reviewing your application and need some additional information to proceed.</p>\n<p>Could you please provide:</p>\n<ul>\n<li>[Detail needed]</li>\n</ul>\n<p>Best regards,<br>HR Team</p>`,
    },
    {
      label: 'Next Steps',
      subject: `Next Steps in Your Application`,
      body: `<p>Hi ${applicantName || '[Name]'},</p>\n<p>We're pleased to inform you that we'd like to move forward with your application.</p>\n<p>Here are the next steps:</p>\n<ol>\n<li>[Step 1]</li>\n<li>[Step 2]</li>\n</ol>\n<p>Best regards,<br>HR Team</p>`,
    },
  ];

  function applyTemplate(idx: number) {
    const t = TEMPLATES[idx];
    setSubject(t.subject);
    setBodyHtml(t.body);
  }

  async function handleSend() {
    if (!applicationId || !toEmail || !subject || !bodyHtml) return;
    setSending(true);
    setError('');
    try {
      await apiPost('/recruiting/send-email', {
        application_id: parseInt(applicationId),
        to_email: toEmail,
        subject,
        body_html: bodyHtml,
      });
      setSent(true);
    } catch {
      setError('Failed to send email');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Sent</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Your email to {toEmail} has been sent successfully.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => { setSent(false); setSubject(''); setBodyHtml(''); }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Compose Another
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Composer</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
        {/* Quick Templates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Templates</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(i)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input
            type="email"
            value={toEmail}
            onChange={e => setToEmail(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
            placeholder="applicant@example.com"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
            placeholder="Email subject..."
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body (HTML)</label>
          <textarea
            value={bodyHtml}
            onChange={e => setBodyHtml(e.target.value)}
            rows={10}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="<p>Your email content...</p>"
          />
        </div>

        {/* Preview */}
        {bodyHtml && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</label>
            <div
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSend}
            disabled={sending || !toEmail || !subject || !bodyHtml}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
