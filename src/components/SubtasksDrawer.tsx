import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Mail, Upload, FileText, Clock, AlertCircle, Loader2, Download, Edit3, Send, FolderOpen, Trash2, Package, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_URL = '';

// Check if employment type represents full-time (handles "Full Time", "FT", "Regular Full Time", etc.)
const isFullTimeType = (type: string | null | undefined): boolean => {
  if (!type) return false;
  const lower = type.toLowerCase().trim();
  return lower === 'ft' || lower.includes('full time') || lower.includes('full-time');
};

// Format phone number as (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Format date as MM/DD/YYYY
const formatDateInput = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

interface ExitDocument {
  id: number;
  form_type: string;
  template_name: string;
  file_path: string;
  file_size: number | null;
  file_exists: boolean;
  generated_at: string | null;
  generated_by: string | null;
  status: string;
  delivered_at: string | null;
  delivery_method: string | null;
  delivered_to: string | null;
  form_data: Record<string, unknown> | null;
}

interface ExitDocumentsResponse {
  employee_id: string;
  employee_name: string;
  termination_type: string | null;
  employment_type: string | null;
  termination_date: string | null;
  documents: ExitDocument[];
}

interface ExitDocumentFormData {
  // Employee Info
  employee_name: string;
  employee_first_name: string;
  employee_last_name: string;
  date_of_birth: string;
  ssn_full: string;  // Full SSN for document generation (stored temporarily in memory)
  ssn_last_four: string;  // Masked display version
  ssn_is_complete: boolean;  // Whether full SSN has been entered
  employee_class: string;
  // Contact Info
  personal_email: string;
  personal_phone: string;
  // Address
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  // Termination Details
  termination_date: string;
  pto_hours: number;
  last_pay_date: string;
  last_coverage_date: string;
  // Supervisor Info
  supervisor_name: string;
  supervisor_email: string;
  // Compensation Info (for Conversion/Portability)
  annual_salary: number | null;
  date_last_salary_increase: string;
  // Insurance Info
  insurance_effective_date: string;
  date_insurance_terminated: string;
  benefits_status: string;
  // Termination Circumstances
  stopped_due_to_injury: boolean;
  stopped_due_to_retirement: boolean;
  waiver_of_premium_filed: boolean;
  waiver_determination: string;
  premiums_paid_by_employer: boolean;
  // Coverage Amounts
  has_employee_basic_life: boolean;
  employee_basic_life_amount: number | null;
  has_spouse_basic_life: boolean;
  spouse_basic_life_amount: number | null;
  has_child_basic_life: boolean;
  child_basic_life_amount: number | null;
  has_employee_voluntary_life: boolean;
  employee_voluntary_life_amount: number | null;
  has_spouse_voluntary_life: boolean;
  spouse_voluntary_life_amount: number | null;
  has_child_voluntary_life: boolean;
  child_voluntary_life_amount: number | null;
  // Meta info for display
  employment_type?: string;
  termination_type?: string;
}

interface EquipmentAssignment {
  assignment_id: number;
  equipment_id: number | null;
  equipment_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  asset_tag: string;
  assigned_date: string | null;
  shipping_label_requested: boolean;
  shipping_label_sent: boolean;
  return_requested: boolean;
  equipment_received: boolean;
  equipment_received_date: string | null;
}

interface Subtask {
  id: number;
  task_id: string;
  task_name: string;
  task_description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to_role: string | null;
  completed_date: string | null;
  task_details?: {
    has_file_upload?: boolean;
    file_url?: string;
  };
  notes?: string;
  notes_history?: Array<{
    note: string;
    timestamp: string;
    created_by: string;
  }>;
  uncheck_history?: Array<{
    action: string;
    timestamp: string;
    reason: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

interface ParentTask {
  id: number;
  task_name: string;
  task_description: string | null;
  category: string;
  status: string;
  priority: string;
  assigned_to_role: string | null;
  due_date: string | null;
  completed_date: string | null;
  days_from_termination: number | null;
  notes: string | null;
  notes_history?: Array<{
    note: string;
    timestamp: string;
    created_by: string;
  }>;
  task_details?: {
    has_action_button?: boolean;
    action_button_label?: string;
    is_toggle?: boolean;
  };
  uncheck_history?: Array<{
    action: string;
    timestamp: string;
    reason: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface SubtasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentTask: ParentTask | null;
  subtasks: Subtask[];
  onUpdateSubtask: (subtaskId: number, newStatus: string) => void;
  onCheckAll: () => void;
  onActionButton?: () => void;
  onAddNote?: (taskId: number, note: string) => void;
  onFileUpload?: (subtaskId: number, file: File) => void;
  isActionLoading?: boolean;
  employeeId?: string;
}

export default function SubtasksDrawer({
  isOpen,
  onClose,
  parentTask,
  subtasks,
  onUpdateSubtask,
  onCheckAll,
  onActionButton,
  onAddNote,
  onFileUpload,
  isActionLoading = false,
  employeeId
}: SubtasksDrawerProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isEditingParentNotes, setIsEditingParentNotes] = useState(false);
  const [parentNoteText, setParentNoteText] = useState('');
  const [isDownloadingExitDoc, setIsDownloadingExitDoc] = useState(false);
  const [showExitDocForm, setShowExitDocForm] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [exitDocFormData, setExitDocFormData] = useState<ExitDocumentFormData>({
    // Employee Info
    employee_name: '',
    employee_first_name: '',
    employee_last_name: '',
    date_of_birth: '',
    ssn_full: '',
    ssn_last_four: '',
    ssn_is_complete: false,
    employee_class: 'Regular',
    // Contact Info
    personal_email: '',
    personal_phone: '',
    // Address
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    // Termination Details
    termination_date: '',
    pto_hours: 0,
    last_pay_date: '',
    last_coverage_date: '',
    // Supervisor Info
    supervisor_name: '',
    supervisor_email: '',
    // Compensation Info
    annual_salary: null,
    date_last_salary_increase: '',
    // Insurance Info
    insurance_effective_date: '',
    date_insurance_terminated: '',
    benefits_status: 'Terminated',
    // Termination Circumstances
    stopped_due_to_injury: false,
    stopped_due_to_retirement: false,
    waiver_of_premium_filed: false,
    waiver_determination: 'N/A',
    premiums_paid_by_employer: false,
    // Coverage Amounts
    has_employee_basic_life: true,
    employee_basic_life_amount: 50000,
    has_spouse_basic_life: false,
    spouse_basic_life_amount: null,
    has_child_basic_life: false,
    child_basic_life_amount: null,
    has_employee_voluntary_life: false,
    employee_voluntary_life_amount: null,
    has_spouse_voluntary_life: false,
    spouse_voluntary_life_amount: null,
    has_child_voluntary_life: false,
    child_voluntary_life_amount: null
  });
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(['important_info']);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);

  // Exit Documents section state
  const [exitDocuments, setExitDocuments] = useState<ExitDocument[]>([]);
  const [documentsInfo, setDocumentsInfo] = useState<{
    termination_type: string | null;
    employment_type: string | null;
    employee_name: string;
  } | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailTemplateType, setEmailTemplateType] = useState<'standard' | 'voluntary' | 'involuntary'>('standard');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [isSavingDocument, setIsSavingDocument] = useState(false);

  // Equipment return state
  const [equipmentAssignments, setEquipmentAssignments] = useState<EquipmentAssignment[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [isSendingLabelRequest, setIsSendingLabelRequest] = useState(false);
  const [isSendingReturnEmail, setIsSendingReturnEmail] = useState(false);
  const [labelUploadedFile, setLabelUploadedFile] = useState<string | null>(null);
  const [isUploadingLabel, setIsUploadingLabel] = useState(false);
  const [equipmentEmployeeEmail, setEquipmentEmployeeEmail] = useState('');

  // Determine if this is an "Equipment to Return?" task
  const isEquipmentReturnTask = parentTask?.task_name === "Equipment to Return?";

  // Determine if this is a "Prepare Exit Documents" task
  const isPrepareExitDocumentsTask = parentTask?.task_name?.toLowerCase().includes('prepare exit documents');

  // Determine if this is the "Send Email to Contractor to Terminate Employee" task
  const isContractorTask = parentTask?.task_name === "Send Email to Contractor to Terminate Employee";
  const [contractorConfirmed, setContractorConfirmed] = useState(false);
  const [contractorConfirmedAt, setContractorConfirmedAt] = useState<string | null>(null);
  const [contractorEmailSent, setContractorEmailSent] = useState(false);
  const [contractorEmailLoading, setContractorEmailLoading] = useState(false);
  const [contractorProofUploaded, setContractorProofUploaded] = useState(false);
  const [contractorProofName, setContractorProofName] = useState<string | null>(null);
  const [contractorConfirmLoading, setContractorConfirmLoading] = useState(false);

  // Initialize contractor task state from task_details when drawer opens
  useEffect(() => {
    if (isOpen && isContractorTask && parentTask) {
      const details = parentTask.task_details as Record<string, unknown> | undefined;
      setContractorConfirmed(!!details?.contractor_confirmed);
      setContractorConfirmedAt((details?.confirmed_at as string) || null);
      setContractorEmailSent(!!details?.email_sent);
      setContractorProofUploaded(!!details?.proof_uploaded);
      setContractorProofName((details?.proof_file_name as string) || null);
    }
  }, [isOpen, isContractorTask, parentTask]);

  // Load equipment assignments when drawer opens for equipment return task
  useEffect(() => {
    if (isOpen && isEquipmentReturnTask && employeeId) {
      loadEquipmentAssignments();
    }
  }, [isOpen, isEquipmentReturnTask, employeeId]);

  const loadEquipmentAssignments = async () => {
    if (!employeeId) return;
    setIsLoadingEquipment(true);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/equipment-assignments/${employeeId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setEquipmentAssignments(data.assignments || []);
        // Select all by default
        setSelectedEquipmentIds((data.assignments || []).map((a: EquipmentAssignment) => a.assignment_id));
        // Try to pre-populate employee email
        if (!equipmentEmployeeEmail) {
          try {
            const empResp = await fetch(`${BASE_URL}/offboarding/unified-form-data/${employeeId}`, { credentials: 'include' });
            if (empResp.ok) {
              const empData = await empResp.json();
              if (empData.personal_email) setEquipmentEmployeeEmail(empData.personal_email);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error('Error loading equipment assignments:', error);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  // Contractor task handlers
  const handleSendContractorEmail = async () => {
    if (!employeeId) return;
    setContractorEmailLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/contractor-termination-email/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: '' }),
      });
      if (response.ok) {
        setContractorEmailSent(true);
      } else {
        const err = await response.json();
        alert(err.detail || 'Failed to send contractor email');
      }
    } catch {
      alert('Failed to send contractor email');
    } finally {
      setContractorEmailLoading(false);
    }
  };

  const handleContractorConfirmToggle = async () => {
    if (!parentTask) return;
    const newValue = !contractorConfirmed;
    setContractorConfirmLoading(true);
    try {
      const taskId = (parentTask as unknown as { task_id: string }).task_id;
      const response = await fetch(`${BASE_URL}/offboarding/tasks/${taskId}/contractor-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: newValue }),
      });
      if (response.ok) {
        const data = await response.json();
        setContractorConfirmed(newValue);
        setContractorConfirmedAt(data.confirmed_at || null);
        // Auto-complete if both confirmed and proof uploaded
        if (newValue && contractorProofUploaded) {
          onUpdateSubtask(parentTask.id, 'Completed');
        }
      }
    } catch {
      // revert
    } finally {
      setContractorConfirmLoading(false);
    }
  };

  const handleContractorProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!parentTask || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const taskId = (parentTask as unknown as { task_id: string }).task_id;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${BASE_URL}/offboarding/tasks/${taskId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (response.ok) {
        setContractorProofUploaded(true);
        setContractorProofName(file.name);
        // Auto-complete if both confirmed and proof uploaded
        if (contractorConfirmed) {
          onUpdateSubtask(parentTask.id, 'Completed');
        }
      }
    } catch {
      alert('Failed to upload proof');
    }
  };

  const toggleEquipmentSelection = (assignmentId: number) => {
    setSelectedEquipmentIds(prev =>
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const handleSendLabelRequest = async () => {
    if (!employeeId || selectedEquipmentIds.length === 0) return;
    setIsSendingLabelRequest(true);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/equipment-label-request/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: selectedEquipmentIds }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send label request');
      }
      const result = await response.json();
      alert(`Label request email sent to ${result.contact_email}`);
      // Auto-check the "Request Return Label" subtask
      const requestSubtask = subtasks.find(st => st.task_name.toLowerCase().includes('request return label'));
      if (requestSubtask && requestSubtask.status !== 'Completed') {
        onUpdateSubtask(requestSubtask.id, 'Completed');
      }
      // Reload equipment to see updated flags
      await loadEquipmentAssignments();
    } catch (error) {
      console.error('Error sending label request:', error);
      alert(`Failed to send label request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingLabelRequest(false);
    }
  };

  const handleUploadShippingLabel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !employeeId) return;

    // Find the "Send Return Label to Employee" subtask to use its task ID for the upload
    const sendSubtask = subtasks.find(st => st.task_name.toLowerCase().includes('send return label'));
    if (!sendSubtask) {
      alert('Could not find the send return label subtask');
      return;
    }

    setIsUploadingLabel(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BASE_URL}/offboarding/tasks/${sendSubtask.id}/upload-label`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        // Fall back to standard upload endpoint
        const response2 = await fetch(`${BASE_URL}/offboarding/tasks/${sendSubtask.id}/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!response2.ok) {
          throw new Error('Failed to upload shipping label');
        }
        const result = await response2.json();
        setLabelUploadedFile(result.filename || file.name);
      } else {
        const result = await response.json();
        setLabelUploadedFile(result.filename || file.name);
      }
    } catch (error) {
      console.error('Error uploading label:', error);
      alert(`Failed to upload shipping label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploadingLabel(false);
    }
  };

  const handleSendReturnEmail = async () => {
    if (!employeeId || selectedEquipmentIds.length === 0) return;
    const email = equipmentEmployeeEmail.trim();
    if (!email) {
      alert('Please enter the employee\'s email address');
      return;
    }
    setIsSendingReturnEmail(true);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/equipment-return-email/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipient_email: email, items: selectedEquipmentIds }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send return email');
      }
      const result = await response.json();
      alert(`Return instructions sent to ${result.recipient}${result.label_attached ? ' with shipping label attached' : ''}`);
      // Auto-check the "Send Return Label to Employee" subtask
      const sendSubtask = subtasks.find(st => st.task_name.toLowerCase().includes('send return label'));
      if (sendSubtask && sendSubtask.status !== 'Completed') {
        onUpdateSubtask(sendSubtask.id, 'Completed');
      }
      await loadEquipmentAssignments();
    } catch (error) {
      console.error('Error sending return email:', error);
      alert(`Failed to send return email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingReturnEmail(false);
    }
  };

  // Load exit documents when drawer opens for exit documents task
  useEffect(() => {
    if (isOpen && isPrepareExitDocumentsTask && employeeId) {
      loadExitDocuments();
    }
  }, [isOpen, isPrepareExitDocumentsTask, employeeId]);

  const loadExitDocuments = async () => {
    if (!employeeId) return;

    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/exit-documents/${employeeId}`);
      if (response.ok) {
        const data: ExitDocumentsResponse = await response.json();
        setExitDocuments(data.documents);
        setDocumentsInfo({
          termination_type: data.termination_type,
          employment_type: data.employment_type,
          employee_name: data.employee_name
        });
        // Set default email recipient from personal email if we have form data
        if (data.documents.length > 0 && data.documents[0].form_data?.personal_email) {
          setEmailRecipient(data.documents[0].form_data.personal_email as string);
        }
        // Set default template type based on termination type
        if (data.termination_type?.toLowerCase() === 'voluntary') {
          setEmailTemplateType('voluntary');
        } else if (data.termination_type?.toLowerCase() === 'involuntary') {
          setEmailTemplateType('involuntary');
        }
      }
    } catch (error) {
      console.error('Error loading exit documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleSaveAndTrackDocument = async () => {
    if (!employeeId) {
      alert('Employee ID not available');
      return;
    }

    if (selectedDocuments.length === 0) {
      alert('Please select at least one document to generate');
      return;
    }

    setIsSavingDocument(true);
    try {
      // Use unified generate documents endpoint
      const response = await fetch(`${BASE_URL}/offboarding/unified-generate-documents/${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          form_data: exitDocFormData,
          documents_to_generate: selectedDocuments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate documents');
      }

      const result = await response.json();

      // Close form and reload documents
      setShowExitDocForm(false);
      await loadExitDocuments();
      alert(`Successfully generated ${result.documents_generated} document(s)!`);
    } catch (error) {
      console.error('Error saving documents:', error);
      alert(`Failed to generate documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingDocument(false);
    }
  };

  const handleToggleDocumentSelection = (docType: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docType)
        ? prev.filter(d => d !== docType)
        : [...prev, docType]
    );
  };

  const handleDownloadSavedDocument = async (documentId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/offboarding/exit-document-download/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      // Extract filename from Content-Disposition header
      const disposition = response.headers.get('content-disposition');
      let filename = `exit_document_${documentId}.pdf`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleQuickDownloadAll = async () => {
    if (exitDocuments.length === 0) {
      alert('No generated documents to download. Please generate documents first.');
      return;
    }

    setIsQuickDownloading(true);
    const blobUrls: string[] = [];
    try {
      for (let i = 0; i < exitDocuments.length; i++) {
        const doc = exitDocuments[i];
        const response = await fetch(`${BASE_URL}/offboarding/exit-document-download/${doc.id}`);
        if (!response.ok) continue;

        const disposition = response.headers.get('content-disposition');
        let filename = `${doc.template_name || doc.form_type}.pdf`;
        if (disposition) {
          const match = disposition.match(/filename="?(.+?)"?$/);
          if (match) filename = match[1];
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        blobUrls.push(blobUrl);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Small delay between downloads so the browser doesn't throttle them
        if (i < exitDocuments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Error downloading documents:', error);
      alert('Failed to download some documents. Please try again.');
    } finally {
      // Revoke blob URLs after all downloads have had time to start
      setTimeout(() => blobUrls.forEach(url => window.URL.revokeObjectURL(url)), 5000);
      setIsQuickDownloading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setDeletingDocumentId(documentId);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/exit-document/${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Refresh the documents list
      await loadExitDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleSendExitDocumentsEmail = async () => {
    if (!employeeId || !emailRecipient) {
      alert('Please enter a recipient email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch(`${BASE_URL}/offboarding/exit-documents-email/${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_email: emailRecipient,
          template_type: emailTemplateType,
          custom_message: emailCustomMessage || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }

      const result = await response.json();
      alert(`Email sent successfully to ${result.recipient}. ${result.documents_sent} document(s) attached.`);
      setShowEmailModal(false);
      setEmailCustomMessage('');
      // Reload documents to see updated delivery status
      await loadExitDocuments();
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getFormTypeDisplayName = (formType: string): string => {
    switch (formType) {
      case 'exit_important_info':
        return 'Important Information for Terminating Employee';
      case 'exit_portability':
        return 'Equitable Portability Form';
      case 'exit_conversion':
        return 'Equitable Conversion Form';
      case 'exit_non_solicitation':
        return 'Non-Solicitation and Confidentiality Document';
      default:
        return formType;
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenExitDocForm = async () => {
    if (!employeeId) {
      alert('Employee ID not available');
      return;
    }

    setIsLoadingFormData(true);
    try {
      // Use the unified form data endpoint
      const response = await fetch(`${BASE_URL}/offboarding/unified-form-data/${employeeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch employee data');
      }
      const data = await response.json();
      // If we have SSN last 4 from database, show it masked but allow re-entry
      const hasExistingSsn = !!(data.ssn_last_four && data.ssn_last_four.length === 4);
      setExitDocFormData({
        // Employee Info
        employee_name: data.employee_name || '',
        employee_first_name: data.employee_first_name || '',
        employee_last_name: data.employee_last_name || '',
        date_of_birth: data.date_of_birth || '',
        ssn_full: '',  // Never pre-populate full SSN for security
        ssn_last_four: data.ssn_last_four || '',
        ssn_is_complete: hasExistingSsn,  // Mark as complete if we have last 4 from DB
        employee_class: data.employee_class || 'Regular',
        // Contact Info
        personal_email: data.personal_email || '',
        personal_phone: data.personal_phone || '',
        // Address
        address_street: data.address_street || '',
        address_city: data.address_city || '',
        address_state: data.address_state || '',
        address_zip: data.address_zip || '',
        // Termination Details
        termination_date: data.termination_date || '',
        pto_hours: data.pto_hours || 0,
        last_pay_date: data.last_pay_date || '',
        last_coverage_date: data.last_coverage_date || '',
        // Supervisor Info
        supervisor_name: data.supervisor_name || '',
        supervisor_email: data.supervisor_email || '',
        // Compensation Info
        annual_salary: data.annual_salary || null,
        date_last_salary_increase: data.date_last_salary_increase || '',
        // Insurance Info
        insurance_effective_date: data.insurance_effective_date || '',
        date_insurance_terminated: data.date_insurance_terminated || '',
        benefits_status: data.benefits_status || 'Terminated',
        // Termination Circumstances
        stopped_due_to_injury: data.stopped_due_to_injury || false,
        stopped_due_to_retirement: data.stopped_due_to_retirement || false,
        waiver_of_premium_filed: data.waiver_of_premium_filed || false,
        waiver_determination: data.waiver_determination || 'N/A',
        premiums_paid_by_employer: data.premiums_paid_by_employer || false,
        // Coverage Amounts
        has_employee_basic_life: data.has_employee_basic_life ?? true,
        employee_basic_life_amount: data.employee_basic_life_amount ?? 50000,
        has_spouse_basic_life: data.has_spouse_basic_life || false,
        spouse_basic_life_amount: data.spouse_basic_life_amount || null,
        has_child_basic_life: data.has_child_basic_life || false,
        child_basic_life_amount: data.child_basic_life_amount || null,
        has_employee_voluntary_life: data.has_employee_voluntary_life || false,
        employee_voluntary_life_amount: data.employee_voluntary_life_amount || null,
        has_spouse_voluntary_life: data.has_spouse_voluntary_life || false,
        spouse_voluntary_life_amount: data.spouse_voluntary_life_amount || null,
        has_child_voluntary_life: data.has_child_voluntary_life || false,
        child_voluntary_life_amount: data.child_voluntary_life_amount || null,
        // Meta info
        employment_type: data.employment_type,
        termination_type: data.termination_type
      });
      // Default to selecting Important Info, and Conversion for full-time employees
      const defaultDocs = ['important_info'];
      if (isFullTimeType(data.employment_type)) {
        defaultDocs.push('conversion');
        defaultDocs.push('portability');
      }
      setSelectedDocuments(defaultDocs);
      setShowExitDocForm(true);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      alert('Failed to load employee data. Please try again.');
    } finally {
      setIsLoadingFormData(false);
    }
  };

  const handleDownloadExitDocument = async (useFormData: boolean = false) => {
    if (!employeeId) {
      alert('Employee ID not available');
      return;
    }

    setIsDownloadingExitDoc(true);
    try {
      let url = `${BASE_URL}/offboarding/exit-document/${employeeId}`;

      // If using form data, add query parameters
      if (useFormData) {
        const params = new URLSearchParams();
        if (exitDocFormData.personal_email) params.append('personal_email', exitDocFormData.personal_email);
        if (exitDocFormData.personal_phone) params.append('personal_phone', exitDocFormData.personal_phone);
        if (exitDocFormData.address_street) params.append('address_street', exitDocFormData.address_street);
        if (exitDocFormData.address_city) params.append('address_city', exitDocFormData.address_city);
        if (exitDocFormData.address_state) params.append('address_state', exitDocFormData.address_state);
        if (exitDocFormData.address_zip) params.append('address_zip', exitDocFormData.address_zip);
        if (exitDocFormData.pto_hours !== undefined) params.append('pto_hours', exitDocFormData.pto_hours.toString());
        if (exitDocFormData.last_pay_date) params.append('last_pay_date', exitDocFormData.last_pay_date);
        if (exitDocFormData.last_coverage_date) params.append('last_coverage_date', exitDocFormData.last_coverage_date);
        if (exitDocFormData.supervisor_name) params.append('supervisor_name', exitDocFormData.supervisor_name);
        if (exitDocFormData.supervisor_email) params.append('supervisor_email', exitDocFormData.supervisor_email);

        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to generate exit document');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Exit_Information_${employeeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      // Close the form modal if it's open
      if (useFormData) {
        setShowExitDocForm(false);
      }
    } catch (error) {
      console.error('Error downloading exit document:', error);
      alert('Failed to download exit document. Please try again.');
    } finally {
      setIsDownloadingExitDoc(false);
    }
  };

  const handleAddNote = (taskId: number) => {
    setEditingTaskId(taskId);
    setNoteText('');
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (editingTaskId && onAddNote) {
      onAddNote(editingTaskId, noteText);
    }
    setShowNoteModal(false);
    setNoteText('');
    setEditingTaskId(null);
  };

  const handleFileChange = (subtaskId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(subtaskId, file);
    }
  };

  if (!isOpen || !parentTask) return null;

  const completedCount = subtasks.filter(st => st.status === 'Completed').length;
  const allCompleted = completedCount === subtasks.length;
  const hasActionButton = parentTask.task_details?.has_action_button;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'In Progress':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'Not Started':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-600 dark:text-red-400';
      case 'High':
        return 'text-orange-600 dark:text-orange-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && parentTask && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white dark:bg-gray-800 shadow-2xl z-50"
          >
        {/* Bifröst shimmer edge */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bifrost-shimmer-v z-20" />
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {parentTask.task_name}
              </h2>
              {parentTask.task_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {parentTask.task_description}
                </p>
              )}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {completedCount} of {subtasks.length} completed
                </span>
                <div className="flex-1 max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(parentTask.status)}`}>
                  {parentTask.status}
                </span>
                <span className={`text-xs font-medium ${getPriorityColor(parentTask.priority)}`}>
                  {parentTask.priority} Priority
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {parentTask.category}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Parent Task Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Parent Task Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {parentTask.assigned_to_role && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Assigned to:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{parentTask.assigned_to_role}</p>
                  </div>
                )}
                {parentTask.due_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(parentTask.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {parentTask.days_from_termination !== null && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Timeline:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Day {parentTask.days_from_termination >= 0 ? '+' : ''}{parentTask.days_from_termination}
                    </p>
                  </div>
                )}
                {parentTask.completed_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {new Date(parentTask.completed_date).toLocaleDateString()} at {new Date(parentTask.completed_date).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Task Notes */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes History
                </h3>
                {!isEditingParentNotes && onAddNote && (
                  <button
                    onClick={() => {
                      setParentNoteText('');
                      setIsEditingParentNotes(true);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Add Note
                  </button>
                )}
              </div>

              {isEditingParentNotes && (
                <div className="space-y-2">
                  <textarea
                    value={parentNoteText}
                    onChange={(e) => setParentNoteText(e.target.value)}
                    placeholder="Add a new note..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[80px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (onAddNote && parentNoteText.trim()) {
                          onAddNote(parentTask.id, parentNoteText);
                        }
                        setIsEditingParentNotes(false);
                        setParentNoteText('');
                      }}
                      disabled={!parentNoteText.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                    >
                      Add Note
                    </button>
                    <button
                      onClick={() => {
                        setParentNoteText('');
                        setIsEditingParentNotes(false);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Notes History List */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {parentTask.notes_history && parentTask.notes_history.length > 0 ? (
                  [...parentTask.notes_history].reverse().map((noteEntry, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {noteEntry.note}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{noteEntry.created_by}</span>
                        <span>•</span>
                        <span>
                          {new Date(noteEntry.timestamp).toLocaleDateString()} at{' '}
                          {new Date(noteEntry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No notes yet. Add your first note above.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!allCompleted && (
                <button
                  onClick={onCheckAll}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Check All Subtasks
                </button>
              )}

              {hasActionButton && onActionButton && (
                <button
                  onClick={onActionButton}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending emails...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      {parentTask.task_details?.action_button_label || 'Execute Action'}
                    </>
                  )}
                </button>
              )}

              {/* Exit Documents Form Button - shown for Prepare Exit Documents tasks */}
              {isPrepareExitDocumentsTask && employeeId && (
                <>
                  <button
                    onClick={handleOpenExitDocForm}
                    disabled={isLoadingFormData}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isLoadingFormData ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                    {isLoadingFormData ? 'Loading...' : 'Complete Exit Documents Form'}
                  </button>
                  <button
                    onClick={handleQuickDownloadAll}
                    disabled={isQuickDownloading || exitDocuments.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {isQuickDownloading ? 'Downloading...' : `Quick Download${exitDocuments.length > 0 ? ` (${exitDocuments.length})` : ''}`}
                  </button>
                </>
              )}
            </div>

            {/* Contractor Termination Panel — only for "Send Email to Contractor" task */}
            {isContractorTask && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contractor Termination Request
                </h3>

                {/* Send Email Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendContractorEmail}
                    disabled={contractorEmailLoading || contractorEmailSent}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      contractorEmailSent
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {contractorEmailLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : contractorEmailSent ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {contractorEmailSent ? 'Email Sent' : 'Send Termination Request Email'}
                  </button>
                </div>

                {/* Confirmation Toggle */}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Contractor has confirmed termination
                    </p>
                    {contractorConfirmedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Confirmed: {new Date(contractorConfirmedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleContractorConfirmToggle}
                    disabled={contractorConfirmLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                      contractorConfirmed ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        contractorConfirmed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Proof Upload */}
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Upload Contractor Confirmation
                  </p>
                  {contractorProofUploaded && contractorProofName ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      <span>{contractorProofName}</span>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300">
                      <Upload className="w-4 h-4" />
                      <span>Choose file (.pdf, .png, .jpg, .eml)</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.eml"
                        onChange={handleContractorProofUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Equipment Return Panel — only for "Equipment to Return?" task */}
            {isEquipmentReturnTask && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Assigned Equipment
                  </h3>
                  <button
                    onClick={loadEquipmentAssignments}
                    disabled={isLoadingEquipment}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {isLoadingEquipment ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {isLoadingEquipment ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading equipment...</span>
                  </div>
                ) : equipmentAssignments.length === 0 ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-blue-400 opacity-50" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">No equipment currently assigned to this employee.</p>
                  </div>
                ) : (
                  <>
                    {/* Equipment Table */}
                    <div className="space-y-2">
                      {equipmentAssignments.map((assignment) => (
                        <div
                          key={assignment.assignment_id}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEquipmentIds.includes(assignment.assignment_id)}
                            onChange={() => toggleEquipmentSelection(assignment.assignment_id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {assignment.equipment_type}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {assignment.manufacturer} {assignment.model}
                              {assignment.serial_number && ` | S/N: ${assignment.serial_number}`}
                              {assignment.asset_tag && ` | Tag: ${assignment.asset_tag}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {assignment.equipment_received ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Received</span>
                            ) : assignment.shipping_label_sent ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Label Sent</span>
                            ) : assignment.shipping_label_requested ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Label Requested</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected count */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedEquipmentIds.length} of {equipmentAssignments.length} item(s) selected
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Equipment Return Actions — inline with subtasks */}
            {isEquipmentReturnTask && equipmentAssignments.length > 0 && (
              <div className="space-y-3">
                {/* Subtask 1: Request Return Label */}
                {subtasks.some(st => st.task_name.toLowerCase().includes('request return label')) && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-500" />
                      Request Prepaid Shipping Label
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Send an email to the equipment return contact with the employee's address and equipment list.
                    </p>
                    <button
                      onClick={handleSendLabelRequest}
                      disabled={isSendingLabelRequest || selectedEquipmentIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      {isSendingLabelRequest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Label Request Email
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Subtask 2: Send Return Label to Employee */}
                {subtasks.some(st => st.task_name.toLowerCase().includes('send return label')) && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-green-500" />
                      Send Return Label to Employee
                    </h4>

                    {/* Upload Label */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Upload the shipping label received from the contact, then send it to the employee.
                      </p>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm cursor-pointer transition-colors">
                          {isUploadingLabel ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {isUploadingLabel ? 'Uploading...' : 'Upload Shipping Label'}
                          <input
                            type="file"
                            onChange={handleUploadShippingLabel}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            disabled={isUploadingLabel}
                          />
                        </label>
                        {labelUploadedFile && (
                          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <Check className="w-4 h-4" />
                            {labelUploadedFile}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Employee Email + Send */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee Email</label>
                        <input
                          type="email"
                          value={equipmentEmployeeEmail}
                          onChange={(e) => setEquipmentEmployeeEmail(e.target.value)}
                          placeholder="employee@personal.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <button
                        onClick={handleSendReturnEmail}
                        disabled={isSendingReturnEmail || selectedEquipmentIds.length === 0 || !equipmentEmployeeEmail.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                      >
                        {isSendingReturnEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Return Instructions
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subtasks List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Subtasks</h3>
              {subtasks.map((subtask, index) => {
                const hasFileUpload = subtask.task_details?.has_file_upload || subtask.task_name.toLowerCase().includes('upload');

                return (
                  <div
                    key={subtask.id}
                    className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 min-w-[30px]">
                          {index + 1}.
                        </span>

                        <input
                          type="checkbox"
                          checked={subtask.status === 'Completed'}
                          onChange={(e) => {
                            const newStatus = e.target.checked ? 'Completed' : 'Not Started';
                            onUpdateSubtask(subtask.id, newStatus);
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />

                        <div className="flex-1">
                          <p className={`font-medium ${subtask.status === 'Completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {subtask.task_name}
                          </p>
                          {subtask.task_description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {subtask.task_description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            {subtask.assigned_to_role && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Assigned to: {subtask.assigned_to_role}
                              </span>
                            )}
                            {subtask.due_date && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • Due: {new Date(subtask.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {subtask.completed_date && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                • Completed: {new Date(subtask.completed_date).toLocaleDateString()} at {new Date(subtask.completed_date).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${getPriorityColor(subtask.priority)}`}>
                          {subtask.priority}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(subtask.status)}`}>
                          {subtask.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-14">
                      {hasFileUpload && onFileUpload && (
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs cursor-pointer transition-colors">
                          <Upload className="w-3 h-3" />
                          Upload File
                          <input
                            type="file"
                            onChange={(e) => handleFileChange(subtask.id, e)}
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                          />
                        </label>
                      )}

                      {onAddNote && (
                        <button
                          onClick={() => handleAddNote(subtask.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          Add Note
                        </button>
                      )}
                    </div>

                    {/* Subtask Notes History */}
                    {subtask.notes_history && subtask.notes_history.length > 0 && (
                      <div className="ml-14 mt-2 space-y-2">
                        {[...subtask.notes_history].reverse().map((noteEntry, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                              {noteEntry.note}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{noteEntry.created_by}</span>
                              <span>•</span>
                              <span>
                                {new Date(noteEntry.timestamp).toLocaleDateString()} at{' '}
                                {new Date(noteEntry.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Parent Task Audit History */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Parent Task Audit History
              </h3>

              <div className="space-y-2">
                {/* Task Creation */}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">Task created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(parentTask.created_at).toLocaleDateString()} at {new Date(parentTask.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Task Completion */}
                {parentTask.completed_date && (
                  <div className="flex items-start gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">Task completed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(parentTask.completed_date).toLocaleDateString()} at {new Date(parentTask.completed_date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Uncheck History */}
                {parentTask.uncheck_history && parentTask.uncheck_history.length > 0 && (
                  <>
                    {parentTask.uncheck_history.map((event, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white">Task unchecked</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            Reason: {event.reason}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleDateString()} at {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Last Updated */}
                {parentTask.updated_at && parentTask.updated_at !== parentTask.created_at && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">Last updated</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(parentTask.updated_at).toLocaleDateString()} at {new Date(parentTask.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Exit Documents Section - Only for Prepare Exit Documents task */}
            {isPrepareExitDocumentsTask && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Generated Documents
                  </h3>
                  <div className="flex items-center gap-2">
                    {exitDocuments.length > 0 && (
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Send via Email
                      </button>
                    )}
                    <button
                      onClick={loadExitDocuments}
                      disabled={isLoadingDocuments}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {isLoadingDocuments ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Documents Info */}
                {documentsInfo && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                    <span>Employee: <strong className="text-gray-700 dark:text-gray-300">{documentsInfo.employee_name}</strong></span>
                    {documentsInfo.termination_type && (
                      <span>Type: <strong className={`${documentsInfo.termination_type.toLowerCase() === 'voluntary' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {documentsInfo.termination_type}
                      </strong></span>
                    )}
                    {documentsInfo.employment_type && (
                      <span>Employment: <strong className="text-gray-700 dark:text-gray-300">{documentsInfo.employment_type}</strong></span>
                    )}
                  </div>
                )}

                {/* Documents List */}
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading documents...</span>
                  </div>
                ) : exitDocuments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No documents generated yet.</p>
                    <p className="text-xs mt-1">Use the "Complete Form" button on the Important Information task to generate and save a document.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exitDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {doc.template_name || getFormTypeDisplayName(doc.form_type)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(doc.file_size)}
                              </span>
                              {doc.generated_at && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  • {new Date(doc.generated_at).toLocaleDateString()}
                                </span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                doc.status === 'delivered'
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}>
                                {doc.status === 'delivered' ? 'Sent' : 'Generated'}
                              </span>
                            </div>
                            {doc.delivered_to && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Sent to: {doc.delivered_to}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {doc.file_exists ? (
                            <button
                              onClick={() => handleDownloadSavedDocument(doc.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-red-500" title="File not found">
                              Missing
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingDocumentId === doc.id}
                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                            title="Delete document"
                          >
                            {deletingDocumentId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
          </motion.div>

          {/* Notes Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNoteModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note here..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px]"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Exit Document Form Modal */}
      {showExitDocForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowExitDocForm(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Exit Documents Form
                </h3>
                {exitDocFormData.employment_type && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      isFullTimeType(exitDocFormData.employment_type)
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {exitDocFormData.employment_type}
                    </span>
                    {exitDocFormData.termination_type && (
                      <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        exitDocFormData.termination_type === 'Voluntary'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                      }`}>
                        {exitDocFormData.termination_type}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowExitDocForm(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Complete the form below. This data will be used to populate all selected exit documents.
            </p>

            {/* Document Selection */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Select Documents to Generate
              </h4>
              <div className="flex justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes('important_info')}
                    onChange={() => handleToggleDocumentSelection('important_info')}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Important Information Form</span>
                </label>
                <label className={`flex items-center gap-2 ${!isFullTimeType(exitDocFormData.employment_type) ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes('conversion')}
                    onChange={() => handleToggleDocumentSelection('conversion')}
                    disabled={!isFullTimeType(exitDocFormData.employment_type)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Equitable Conversion Form</span>
                  {!isFullTimeType(exitDocFormData.employment_type) && (
                    <span className="text-xs text-gray-500">(Full-time only)</span>
                  )}
                </label>
                <label className={`flex items-center gap-2 ${!isFullTimeType(exitDocFormData.employment_type) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes('portability')}
                    onChange={() => handleToggleDocumentSelection('portability')}
                    disabled={!isFullTimeType(exitDocFormData.employment_type)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Equitable Portability Form</span>
                  {!isFullTimeType(exitDocFormData.employment_type) && (
                    <span className="text-xs text-gray-500">(Full-time only)</span>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-5">
              {/* Employee Info Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs">1</span>
                  Employee Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Employee Name</label>
                    <input type="text" value={exitDocFormData.employee_name} disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                    <input
                      type="text"
                      value={exitDocFormData.date_of_birth}
                      onChange={(e) => setExitDocFormData({...exitDocFormData, date_of_birth: formatDateInput(e.target.value)})}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Social Security Number
                      {exitDocFormData.ssn_is_complete && (
                        <span className="ml-2 text-green-600 dark:text-green-400 text-xs font-normal">(entered)</span>
                      )}
                    </label>
                    {exitDocFormData.ssn_is_complete ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={`***-**-${exitDocFormData.ssn_last_four}`}
                          disabled
                          className="min-w-0 flex-1 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setExitDocFormData({...exitDocFormData, ssn_full: '', ssn_last_four: '', ssn_is_complete: false})}
                          className="shrink-0 px-2 py-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={exitDocFormData.ssn_full}
                        onChange={(e) => {
                          // Remove non-digits
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                          // Format as XXX-XX-XXXX
                          let formatted = digits;
                          if (digits.length > 3) {
                            formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                          }
                          if (digits.length > 5) {
                            formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
                          }
                          // When complete (9 digits), mark as complete and store last 4
                          if (digits.length === 9) {
                            setExitDocFormData({
                              ...exitDocFormData,
                              ssn_full: formatted,
                              ssn_last_four: digits.slice(-4),
                              ssn_is_complete: true
                            });
                          } else {
                            setExitDocFormData({
                              ...exitDocFormData,
                              ssn_full: formatted,
                              ssn_last_four: digits.length >= 4 ? digits.slice(-4) : '',
                              ssn_is_complete: false
                            });
                          }
                        }}
                        placeholder="XXX-XX-XXXX"
                        maxLength={11}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Employee Class</label>
                    <select
                      value={exitDocFormData.employee_class}
                      onChange={(e) => setExitDocFormData({...exitDocFormData, employee_class: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Executive">Executive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Email</label>
                    <input
                      type="email"
                      value={exitDocFormData.personal_email}
                      onChange={(e) => setExitDocFormData({...exitDocFormData, personal_email: e.target.value})}
                      placeholder="email@personal.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Phone</label>
                    <input
                      type="tel"
                      value={exitDocFormData.personal_phone}
                      onChange={(e) => setExitDocFormData({...exitDocFormData, personal_phone: formatPhoneNumber(e.target.value)})}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs">2</span>
                  Mailing Address
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                    <input type="text" value={exitDocFormData.address_street} onChange={(e) => setExitDocFormData({...exitDocFormData, address_street: e.target.value})} placeholder="123 Main Street" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                    <input type="text" value={exitDocFormData.address_city} onChange={(e) => setExitDocFormData({...exitDocFormData, address_city: e.target.value})} placeholder="City" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                      <input type="text" value={exitDocFormData.address_state} onChange={(e) => setExitDocFormData({...exitDocFormData, address_state: e.target.value})} placeholder="ST" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP</label>
                      <input type="text" value={exitDocFormData.address_zip} onChange={(e) => setExitDocFormData({...exitDocFormData, address_zip: e.target.value})} placeholder="12345" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Termination Details Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs">3</span>
                  Termination Details
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Termination Date</label>
                    <input type="text" value={exitDocFormData.termination_date} disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">PTO Hours</label>
                    <input type="number" step="0.5" value={exitDocFormData.pto_hours} onChange={(e) => setExitDocFormData({...exitDocFormData, pto_hours: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Pay Date</label>
                    <input type="text" value={exitDocFormData.last_pay_date} onChange={(e) => setExitDocFormData({...exitDocFormData, last_pay_date: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" maxLength={10} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Coverage Date</label>
                    <input type="text" value={exitDocFormData.last_coverage_date} onChange={(e) => setExitDocFormData({...exitDocFormData, last_coverage_date: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" maxLength={10} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Supervisor Name</label>
                    <input type="text" value={exitDocFormData.supervisor_name} onChange={(e) => setExitDocFormData({...exitDocFormData, supervisor_name: e.target.value})} placeholder="Supervisor Name" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Supervisor Email</label>
                    <input type="email" value={exitDocFormData.supervisor_email} onChange={(e) => setExitDocFormData({...exitDocFormData, supervisor_email: e.target.value})} placeholder="supervisor@company.com" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                </div>
              </div>

              {/* Compensation & Insurance Section (for Conversion/Portability) */}
              {(selectedDocuments.includes('conversion') || selectedDocuments.includes('portability')) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-xs">4</span>
                    Compensation & Insurance
                    <span className="text-xs font-normal text-gray-500 ml-2">(for Conversion/Portability forms)</span>
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Salary</label>
                      <input
                        type="number"
                        value={exitDocFormData.annual_salary || ''}
                        onChange={(e) => setExitDocFormData({...exitDocFormData, annual_salary: parseFloat(e.target.value) || null})}
                        placeholder="50000"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Salary Increase</label>
                      <input
                        type="text"
                        value={exitDocFormData.date_last_salary_increase}
                        onChange={(e) => setExitDocFormData({...exitDocFormData, date_last_salary_increase: formatDateInput(e.target.value)})}
                        placeholder="MM/DD/YYYY"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Effective</label>
                      <input
                        type="text"
                        value={exitDocFormData.insurance_effective_date}
                        onChange={(e) => setExitDocFormData({...exitDocFormData, insurance_effective_date: formatDateInput(e.target.value)})}
                        placeholder="MM/DD/YYYY"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Terminated</label>
                      <input
                        type="text"
                        value={exitDocFormData.date_insurance_terminated}
                        onChange={(e) => setExitDocFormData({...exitDocFormData, date_insurance_terminated: formatDateInput(e.target.value)})}
                        placeholder="MM/DD/YYYY"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Coverage Amounts Section (for Conversion/Portability) */}
              {(selectedDocuments.includes('conversion') || selectedDocuments.includes('portability')) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-xs">5</span>
                    Life Insurance Coverage Amounts
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Basic Life */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Basic Life</h5>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exitDocFormData.has_employee_basic_life}
                            onChange={(e) => setExitDocFormData({...exitDocFormData, has_employee_basic_life: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">Employee</span>
                          {exitDocFormData.has_employee_basic_life && (
                            <input
                              type="number"
                              value={exitDocFormData.employee_basic_life_amount || ''}
                              onChange={(e) => setExitDocFormData({...exitDocFormData, employee_basic_life_amount: parseFloat(e.target.value) || null})}
                              placeholder="Amount"
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                          )}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exitDocFormData.has_spouse_basic_life}
                            onChange={(e) => setExitDocFormData({...exitDocFormData, has_spouse_basic_life: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">Spouse</span>
                          {exitDocFormData.has_spouse_basic_life && (
                            <input
                              type="number"
                              value={exitDocFormData.spouse_basic_life_amount || ''}
                              onChange={(e) => setExitDocFormData({...exitDocFormData, spouse_basic_life_amount: parseFloat(e.target.value) || null})}
                              placeholder="Amount"
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                          )}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exitDocFormData.has_child_basic_life}
                            onChange={(e) => setExitDocFormData({...exitDocFormData, has_child_basic_life: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">Child</span>
                          {exitDocFormData.has_child_basic_life && (
                            <input
                              type="number"
                              value={exitDocFormData.child_basic_life_amount || ''}
                              onChange={(e) => setExitDocFormData({...exitDocFormData, child_basic_life_amount: parseFloat(e.target.value) || null})}
                              placeholder="Amount"
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                          )}
                        </label>
                      </div>
                    </div>
                    {/* Voluntary Life */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Voluntary/Supplemental Life</h5>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exitDocFormData.has_employee_voluntary_life}
                            onChange={(e) => setExitDocFormData({...exitDocFormData, has_employee_voluntary_life: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">Employee</span>
                          {exitDocFormData.has_employee_voluntary_life && (
                            <input
                              type="number"
                              value={exitDocFormData.employee_voluntary_life_amount || ''}
                              onChange={(e) => setExitDocFormData({...exitDocFormData, employee_voluntary_life_amount: parseFloat(e.target.value) || null})}
                              placeholder="Amount"
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                          )}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exitDocFormData.has_spouse_voluntary_life}
                            onChange={(e) => setExitDocFormData({...exitDocFormData, has_spouse_voluntary_life: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">Spouse</span>
                          {exitDocFormData.has_spouse_voluntary_life && (
                            <input
                              type="number"
                              value={exitDocFormData.spouse_voluntary_life_amount || ''}
                              onChange={(e) => setExitDocFormData({...exitDocFormData, spouse_voluntary_life_amount: parseFloat(e.target.value) || null})}
                              placeholder="Amount"
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                          )}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exitDocFormData.has_child_voluntary_life}
                            onChange={(e) => setExitDocFormData({...exitDocFormData, has_child_voluntary_life: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">Child</span>
                          {exitDocFormData.has_child_voluntary_life && (
                            <input
                              type="number"
                              value={exitDocFormData.child_voluntary_life_amount || ''}
                              onChange={(e) => setExitDocFormData({...exitDocFormData, child_voluntary_life_amount: parseFloat(e.target.value) || null})}
                              placeholder="Amount"
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedDocuments.length === 0 ? (
                  <span className="text-orange-600 dark:text-orange-400">Select at least one document</span>
                ) : (
                  <span>{selectedDocuments.length} document(s) selected</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitDocForm(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndTrackDocument}
                  disabled={isSavingDocument || selectedDocuments.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSavingDocument ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate & Save Documents
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Documents Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Send Exit Documents
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Recipient Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="employee@personal.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the employee's personal email address
                </p>
              </div>

              {/* Template Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Template
                </label>
                <select
                  value={emailTemplateType}
                  onChange={(e) => setEmailTemplateType(e.target.value as 'standard' | 'voluntary' | 'involuntary')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="voluntary">Voluntary Separation</option>
                  <option value="involuntary">Involuntary Separation</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {documentsInfo?.termination_type && (
                    <>Employee termination type: <strong>{documentsInfo.termination_type}</strong></>
                  )}
                </p>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  placeholder="Add a personal note to the email..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Documents Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Documents to send:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {exitDocuments.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {doc.template_name || getFormTypeDisplayName(doc.form_type)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendExitDocumentsEmail}
                disabled={isSendingEmail || !emailRecipient}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
