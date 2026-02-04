import { FileText, Download, Send, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface FMLADocument {
  type: 'notification' | 'medical_employee' | 'medical_family' | 'designation';
  id: number | null;
  status: 'not_created' | 'generating' | 'created' | 'sent';
  file_path: string | null;
  created_at: string | null;
  sent_at: string | null;
}

interface FMLADocumentsProps {
  caseId: number;
  employeeId: string;
  leaveReason: string;
  onDocumentUpdate?: () => void;
}

export default function FMLADocuments({ caseId, employeeId, leaveReason, onDocumentUpdate }: FMLADocumentsProps) {
  // Authentication is handled via httpOnly cookies (credentials: 'include')

  // Map case reason to API leave_reason format
  const mapLeaveReason = (reason: string): string => {
    const reasonLower = reason.toLowerCase();
    if (reasonLower.includes('adoption') || reasonLower.includes('birth') || reasonLower.includes('bonding')) {
      return 'birth_adoption';
    } else if (reasonLower.includes('own') || reasonLower.includes('self') || reasonLower.includes('personal')) {
      return 'own_health';
    } else if (reasonLower.includes('family') || reasonLower.includes('care')) {
      return 'family_care';
    } else if (reasonLower.includes('military') && reasonLower.includes('exigency')) {
      return 'military_exigency';
    } else if (reasonLower.includes('military') && reasonLower.includes('caregiver')) {
      return 'military_caregiver';
    }
    // Default to own_health if can't determine
    return 'own_health';
  };

  const [documents, setDocuments] = useState<{
    notification: FMLADocument;
    medical: FMLADocument;
    designation: FMLADocument;
  }>({
    notification: { type: 'notification', id: null, status: 'not_created', file_path: null, created_at: null, sent_at: null },
    medical: {
      type: leaveReason === 'own_health' ? 'medical_employee' : 'medical_family',
      id: null,
      status: 'not_created',
      file_path: null,
      created_at: null,
      sent_at: null
    },
    designation: { type: 'designation', id: null, status: 'not_created', file_path: null, created_at: null, sent_at: null },
  });

  const [sendingEmail, setSendingEmail] = useState(false);

  // Generate notification document (WH-381)
  const handleGenerateNotification = async () => {
    setDocuments(prev => ({
      ...prev,
      notification: { ...prev.notification, status: 'generating' }
    }));

    try {
      // First, get the employee database ID from the employee_id string
      const employeeResponse = await fetch(`/employees/`, {
        credentials: 'include',
      });

      if (!employeeResponse.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employees = await employeeResponse.json();
      const employee = employees.find((emp: any) => emp.employee_id === employeeId);

      if (!employee) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      const requestPayload = {
        employee_id: employee.id,  // Use the database ID, not the employee_id string
        request_date: new Date().toISOString().split('T')[0],
        leave_start_date: new Date().toISOString().split('T')[0],
        leave_reason: mapLeaveReason(leaveReason),  // Map to API format
        certification_required: true,
        generate_notice: true,
      };

      const response = await fetch('/fmla/create-notice', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();

        setDocuments(prev => ({
          ...prev,
          notification: {
            ...prev.notification,
            id: data.id,
            status: 'created',
            file_path: data.filled_form_path,
            created_at: new Date().toISOString(),
          }
        }));
      } else {
        const errorData = await response.json();
        throw new Error(`Failed to generate notification: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error generating notification:', error);
      setDocuments(prev => ({
        ...prev,
        notification: { ...prev.notification, status: 'not_created' }
      }));
      alert('Failed to generate notification. Please try again.');
    }
  };

  // Download document
  const handleDownload = async (docType: 'notification' | 'medical' | 'designation') => {
    const doc = documents[docType === 'medical' ? 'medical' : docType];

    if (!doc.id) return;

    try {
      const response = await fetch(`/fmla/notices/${doc.id}/download`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FMLA_${docType}_${employeeId}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  // View document in new tab
  const handleView = async (docType: 'notification' | 'medical' | 'designation') => {
    const doc = documents[docType === 'medical' ? 'medical' : docType];

    if (!doc.id) return;

    try {
      const response = await fetch(`/fmla/notices/${doc.id}/download`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Don't revoke the URL immediately - let the browser open it first
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document. Please try again.');
    }
  };

  // Send documents via email
  const handleSendEmail = async () => {
    const notificationDoc = documents.notification;

    if (!notificationDoc.id) {
      alert('Please generate the notification document first.');
      return;
    }

    setSendingEmail(true);

    try {
      const response = await fetch(`/fmla/notices/${notificationDoc.id}/send-email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        setDocuments(prev => ({
          ...prev,
          notification: {
            ...prev.notification,
            status: 'sent',
            sent_at: data.sent_at,
          },
          medical: {
            ...prev.medical,
            status: 'sent',
            sent_at: data.sent_at,
          }
        }));

        alert(`Documents sent successfully to ${data.sent_to}`);
        if (onDocumentUpdate) onDocumentUpdate();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(error.message || 'Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <Clock className="w-3 h-3 animate-spin" />
            Generating...
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            <Send className="w-3 h-3" />
            Sent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <AlertCircle className="w-3 h-3" />
            Not Created
          </span>
        );
    }
  };

  // Get document title
  const getDocumentTitle = (docType: 'notification' | 'medical' | 'designation') => {
    switch (docType) {
      case 'notification':
        return 'Notice of Eligibility (WH-381)';
      case 'medical':
        return leaveReason === 'own_health'
          ? 'Medical Certification (Employee)'
          : 'Medical Certification (Family Member)';
      case 'designation':
        return 'Designation Notice (WH-382)';
    }
  };

  // Get document description
  const getDocumentDescription = (docType: 'notification' | 'medical' | 'designation') => {
    switch (docType) {
      case 'notification':
        return 'Official notice of FMLA eligibility and rights';
      case 'medical':
        return 'Medical certification form for healthcare provider';
      case 'designation':
        return 'Designation of FMLA leave';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          FMLA Documents
        </h3>

        {/* Send All Button */}
        {documents.notification.status === 'created' && documents.notification.status !== 'sent' && (
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sendingEmail ? 'Sending...' : 'Send Documents'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Notification Document */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {getDocumentTitle('notification')}
                </h4>
                {getStatusBadge(documents.notification.status)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getDocumentDescription('notification')}
              </p>
              {documents.notification.created_at && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Created: {new Date(documents.notification.created_at).toLocaleString()}
                </p>
              )}
              {documents.notification.sent_at && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Sent: {new Date(documents.notification.sent_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {documents.notification.status === 'not_created' && (
              <button
                onClick={handleGenerateNotification}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Generate Document
              </button>
            )}

            {(documents.notification.status === 'created' || documents.notification.status === 'sent') && (
              <>
                <button
                  onClick={() => handleDownload('notification')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => handleView('notification')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  View
                </button>
              </>
            )}
          </div>
        </div>

        {/* Medical Certification Document */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {getDocumentTitle('medical')}
                </h4>
                {getStatusBadge(documents.medical.status)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getDocumentDescription('medical')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                📄 Will be sent together with notification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Coming Soon
            </button>
          </div>
        </div>

        {/* Designation Document */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {getDocumentTitle('designation')}
                </h4>
                {getStatusBadge(documents.designation.status)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getDocumentDescription('designation')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> The notification and medical certification will be sent together via email when you click "Send Documents".
        </p>
      </div>
    </div>
  );
}
