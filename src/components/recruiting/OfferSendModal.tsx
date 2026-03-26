import { useState, useEffect } from 'react';
import { X, FileDown, Send, Eye } from 'lucide-react';
import { apiGet, apiPost, apiFetch } from '@/utils/api';

interface OfferSendModalProps {
  offerId: number;
  applicantName: string;
  applicantEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

interface OfferLetterTemplate {
  id: number;
  template_id: string;
  name: string;
  description: string | null;
  fillable_placeholders: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    default_value: string | null;
  }>;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  category: string;
}

export default function OfferSendModal({
  offerId,
  applicantName,
  applicantEmail,
  isOpen,
  onClose,
  onSent,
}: OfferSendModalProps) {
  const [offerLetterTemplates, setOfferLetterTemplates] = useState<OfferLetterTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedOLTemplate, setSelectedOLTemplate] = useState<number | null>(null);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<number | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Set defaults from fillable placeholders when template changes
  useEffect(() => {
    const template = offerLetterTemplates.find(t => t.id === selectedOLTemplate);
    if (template?.fillable_placeholders) {
      const defaults: Record<string, string> = {};
      template.fillable_placeholders.forEach(fp => {
        if (fp.default_value) defaults[fp.key] = fp.default_value;
      });
      setCustomValues(prev => ({ ...defaults, ...prev }));
    }
  }, [selectedOLTemplate, offerLetterTemplates]);

  async function loadTemplates() {
    try {
      const [olTemplates, emTemplates] = await Promise.all([
        apiGet<OfferLetterTemplate[]>('/recruiting/offer-letter-templates/'),
        apiGet<EmailTemplate[]>('/email-templates/?category=offer'),
      ]);
      setOfferLetterTemplates(olTemplates);
      setEmailTemplates(emTemplates);
    } catch {
      // Email templates endpoint may return all templates if no category filter
      try {
        const olTemplates = await apiGet<OfferLetterTemplate[]>('/recruiting/offer-letter-templates/');
        setOfferLetterTemplates(olTemplates);
      } catch {
        setError('Failed to load templates');
      }
    }
  }

  async function handlePreviewPdf() {
    if (!selectedOLTemplate) return;
    try {
      const response = await apiFetch('/recruiting/offer-letter-templates/render-pdf', {
        method: 'POST',
        body: JSON.stringify({
          template_id: selectedOLTemplate,
          offer_id: offerId,
          custom_values: customValues,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setError('Failed to generate PDF preview');
    }
  }

  async function handlePreviewEmail() {
    if (!selectedOLTemplate) return;
    try {
      const result = await apiPost<{ html_content: string }>('/recruiting/offer-letter-templates/render', {
        template_id: selectedOLTemplate,
        offer_id: offerId,
        custom_values: customValues,
      });
      setPreviewHtml(result.html_content);
    } catch {
      setError('Failed to render preview');
    }
  }

  async function handleSend() {
    setSending(true);
    setError('');
    try {
      await apiFetch(`/recruiting/offers/${offerId}/send`, {
        method: 'PATCH',
        body: JSON.stringify({
          offer_letter_template_id: selectedOLTemplate || null,
          email_template_id: selectedEmailTemplate || null,
          custom_values: customValues,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      onSent();
      onClose();
    } catch {
      setError('Failed to send offer');
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  const selectedOL = offerLetterTemplates.find(t => t.id === selectedOLTemplate);
  const fillableFields = selectedOL?.fillable_placeholders || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Send Offer</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              To: {applicantName} ({applicantEmail})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Offer Letter Template */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Offer Letter (PDF Attachment)
            </h3>
            <select
              value={selectedOLTemplate || ''}
              onChange={e => setSelectedOLTemplate(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No offer letter template (send without PDF)</option>
              {offerLetterTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.template_id})
                </option>
              ))}
            </select>

            {/* Fillable fields */}
            {fillableFields.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fill in custom fields for this template:
                </p>
                {fillableFields.map(fp => (
                  <div key={fp.key} className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 dark:text-gray-300 w-36 flex-shrink-0">
                      {fp.label}
                      {fp.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type="text"
                      value={customValues[fp.key] || ''}
                      onChange={e =>
                        setCustomValues(prev => ({ ...prev, [fp.key]: e.target.value }))
                      }
                      placeholder={fp.default_value || ''}
                      className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedOLTemplate && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handlePreviewPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                >
                  <FileDown className="w-4 h-4" />
                  Preview PDF
                </button>
                <button
                  onClick={handlePreviewEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                  Preview HTML
                </button>
              </div>
            )}
          </div>

          {/* Email Template */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Email Template
            </h3>
            <select
              value={selectedEmailTemplate || ''}
              onChange={e => setSelectedEmailTemplate(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Default offer notification email</option>
              {emailTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {previewHtml && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Rendered Preview
                </h3>
                <button
                  onClick={() => setPreviewHtml('')}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Close
                </button>
              </div>
              <div
                className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm max-h-60 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}

          {/* Summary */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Send Summary
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-0.5">
              <li>
                Recipient: <strong>{applicantName}</strong> ({applicantEmail})
              </li>
              <li>
                Offer letter PDF:{' '}
                <strong>{selectedOL ? selectedOL.name : 'None (no attachment)'}</strong>
              </li>
              <li>
                Email:{' '}
                <strong>
                  {selectedEmailTemplate
                    ? emailTemplates.find(t => t.id === selectedEmailTemplate)?.name
                    : 'Default notification'}
                </strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
