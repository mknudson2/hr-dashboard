import { X, Calendar, DollarSign, User, FileText, Building2, Activity, Plus, Send, Upload, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import GarnishmentCalculationModal from "./GarnishmentCalculationModal";

interface Payment {
  id: number;
  payment_date: string;
  pay_period_start: string;
  pay_period_end: string;
  amount: number;
  check_number: string | null;
  gross_wages: number | null;
  pretax_deductions: number | null;
  taxes_withheld: number | null;
  disposable_income: number | null;
  notes: string | null;
}

interface Document {
  id: number;
  document_type: string;
  document_name: string;
  file_path: string;
  uploaded_date: string;
  notes: string | null;
}

interface CaseNote {
  id: number;
  note_text: string;
  created_at: string;
}

interface GarnishmentDetail {
  id: number;
  case_number: string;
  employee_id: string;
  employee_name: string;
  employee_wage: number | null;
  employee_wage_type: string | null;
  department: string | null;
  status: string;
  garnishment_type: string;
  agency_name: string;
  agency_address: string | null;
  agency_phone: string | null;
  agency_fax: string | null;
  agency_email: string | null;
  case_reference: string | null;
  received_date: string | null;
  start_date: string | null;
  end_date: string | null;
  release_date: string | null;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  deduction_type: string | null;
  deduction_amount: number | null;
  deduction_percentage: number | null;
  priority_order: number;
  notes: string | null;
  payments: Payment[];
  documents: Document[];
  case_notes: CaseNote[];
}

interface GarnishmentDrawerProps {
  garnishmentId: number | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function GarnishmentDrawer({ garnishmentId, onClose, onUpdate }: GarnishmentDrawerProps) {
  const [garnishmentDetail, setGarnishmentDetail] = useState<GarnishmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    document_type: "Writ",
    document_name: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (garnishmentId) {
      fetchGarnishmentDetail();
    }
  }, [garnishmentId]);

  const fetchGarnishmentDetail = async () => {
    if (!garnishmentId) return;

    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/garnishments/cases/${garnishmentId}`);
      const data = await response.json();
      setGarnishmentDetail(data);
    } catch (error) {
      console.error("Error fetching garnishment details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !garnishmentId) return;

    setAddingNote(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/garnishments/cases/${garnishmentId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          garnishment_id: garnishmentId,
          note_text: newNote,
        }),
      });

      if (response.ok) {
        setNewNote("");
        fetchGarnishmentDetail();
      }
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!garnishmentId) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/garnishments/cases/${garnishmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        fetchGarnishmentDetail();
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name from filename if empty
      if (!uploadData.document_name) {
        setUploadData({ ...uploadData, document_name: file.name });
      }
    }
  };

  const handleDocumentUpload = async () => {
    if (!garnishmentId || !selectedFile) return;

    setUploadingDocument(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("document_type", uploadData.document_type);
      formData.append("document_name", uploadData.document_name);
      if (uploadData.notes) {
        formData.append("notes", uploadData.notes);
      }

      const response = await fetch(`http://127.0.0.1:8000/garnishments/cases/${garnishmentId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Reset form
        setUploadData({
          document_type: "Writ",
          document_name: "",
          notes: "",
        });
        setSelectedFile(null);
        setShowUploadForm(false);
        fetchGarnishmentDetail();
      } else {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploadingDocument(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "Released": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // ESC key support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <AnimatePresence>
      {garnishmentId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-600 dark:text-gray-400">Loading garnishment details...</div>
              </div>
            ) : garnishmentDetail ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b dark:border-gray-700 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {garnishmentDetail.case_number}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Garnishment Case Details
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Status Management */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status:
                  </label>
                  <select
                    value={garnishmentDetail.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updatingStatus}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${getStatusColor(garnishmentDetail.status)} ${
                      updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                    <option value="Released">Released</option>
                  </select>
                  {updatingStatus && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">Updating...</span>
                  )}
                  <button
                    onClick={() => setShowCalculator(true)}
                    className="ml-auto flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculate Payment
                  </button>
                </div>

                {/* Employee Information */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Employee Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.employee_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.employee_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.department || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Current Wage:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {garnishmentDetail.employee_wage ? `${formatCurrency(garnishmentDetail.employee_wage)} ${garnishmentDetail.employee_wage_type}` : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agency Information */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Agency/Office Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Agency Name:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.agency_name}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Address:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.agency_address || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.agency_phone || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Fax:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.agency_fax || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.agency_email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Case Reference:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.case_reference || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Garnishment Details */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Garnishment Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.garnishment_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                      <p className="font-medium text-gray-900 dark:text-white">#{garnishmentDetail.priority_order}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Deduction Type:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{garnishmentDetail.deduction_type || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Deduction Amount:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {garnishmentDetail.deduction_amount ? formatCurrency(garnishmentDetail.deduction_amount) :
                         garnishmentDetail.deduction_percentage ? `${garnishmentDetail.deduction_percentage}%` : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important Dates */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Important Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Received Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(garnishmentDetail.received_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(garnishmentDetail.start_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(garnishmentDetail.end_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Release Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(garnishmentDetail.release_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Financial Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(garnishmentDetail.total_amount)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Amount</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(garnishmentDetail.amount_paid)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Paid</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(garnishmentDetail.amount_remaining)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Remaining</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Payment Progress</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {((garnishmentDetail.amount_paid / garnishmentDetail.total_amount) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full transition-all ${
                            garnishmentDetail.amount_remaining < garnishmentDetail.total_amount * 0.25
                              ? "bg-green-500"
                              : garnishmentDetail.amount_remaining < garnishmentDetail.total_amount * 0.75
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${(garnishmentDetail.amount_paid / garnishmentDetail.total_amount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    Payment History ({garnishmentDetail.payments.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {garnishmentDetail.payments.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                        No payments recorded yet
                      </p>
                    ) : (
                      garnishmentDetail.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatDate(payment.payment_date)}
                              </span>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Pay Period: {formatDate(payment.pay_period_start)} - {formatDate(payment.pay_period_end)}
                              </p>
                            </div>
                            <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</p>
                          </div>
                          {payment.check_number && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">Check #: {payment.check_number}</p>
                          )}
                          {payment.disposable_income && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Disposable Income: {formatCurrency(payment.disposable_income)}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{payment.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Documents ({garnishmentDetail.documents.length})
                    </h3>
                    <button
                      onClick={() => setShowUploadForm(!showUploadForm)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      {showUploadForm ? 'Cancel' : 'Upload'}
                    </button>
                  </div>

                  {/* Upload Form */}
                  {showUploadForm && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3 border-2 border-blue-500">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Upload New Document</h4>

                      {/* Document Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Document Type *
                        </label>
                        <select
                          value={uploadData.document_type}
                          onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="Writ">Writ</option>
                          <option value="Release">Release</option>
                          <option value="Answer to Interrogatories">Answer to Interrogatories</option>
                          <option value="Calculation">Calculation</option>
                          <option value="Correspondence">Correspondence</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Document Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Document Name *
                        </label>
                        <input
                          type="text"
                          value={uploadData.document_name}
                          onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                          placeholder="Enter document name"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* File Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Select File *
                        </label>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="w-full text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
                        />
                        {selectedFile && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={uploadData.notes}
                          onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                          placeholder="Add any additional notes about this document"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>

                      {/* Upload Button */}
                      <button
                        onClick={handleDocumentUpload}
                        disabled={!selectedFile || !uploadData.document_name || uploadingDocument}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                      >
                        {uploadingDocument ? (
                          "Uploading..."
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Document
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Documents List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {garnishmentDetail.documents.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                        No documents uploaded yet
                      </p>
                    ) : (
                      garnishmentDetail.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{doc.document_name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {doc.document_type} • Uploaded {formatDate(doc.uploaded_date)}
                            </p>
                            {doc.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{doc.notes}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Case Notes */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Case Notes
                  </h3>

                  {/* Add Note Input */}
                  <div className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a new note..."
                      className="w-full rounded-lg border dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      rows={3}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addingNote}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      {addingNote ? (
                        "Adding Note..."
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Add Note
                        </>
                      )}
                    </button>
                  </div>

                  {/* Notes History */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {garnishmentDetail.case_notes && garnishmentDetail.case_notes.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                        No notes added yet
                      </p>
                    ) : (
                      garnishmentDetail.case_notes && garnishmentDetail.case_notes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(note.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{note.note_text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Original Notes (if any) */}
                {garnishmentDetail.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-2 border border-yellow-200 dark:border-yellow-800">
                    <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Original Case Notes</h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{garnishmentDetail.notes}</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Garnishment Calculation Modal */}
            {showCalculator && garnishmentDetail && (
              <GarnishmentCalculationModal
                isOpen={showCalculator}
                onClose={() => setShowCalculator(false)}
                garnishmentId={garnishmentDetail.id}
                garnishmentType={garnishmentDetail.garnishment_type}
                employeeName={garnishmentDetail.employee_name}
                currentBalance={garnishmentDetail.amount_remaining}
                onSuccess={() => {
                  fetchGarnishmentDetail();
                  if (onUpdate) {
                    onUpdate();
                  }
                }}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
