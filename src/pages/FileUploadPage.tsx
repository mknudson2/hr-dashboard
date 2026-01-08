import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Eye,
  Trash2,
  Filter,
  X,
  Download,
  AlertCircle,
  Play,
  Settings
} from 'lucide-react';

const BASE_URL = '';

interface FileUpload {
  id: number;
  file_name: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploaded_by: string;
  uploaded_at: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
}

interface UploadStats {
  total_uploads: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total_size_mb: number;
}

interface PreviewData {
  columns: string[];
  sample_data: any[];
  row_count: number;
  file_type: string;
}

interface ProcessingLog {
  id: number;
  log_level: 'info' | 'warning' | 'error' | 'debug';
  log_message: string;
  log_details: any;
  row_number: number | null;
  column_name: string | null;
  created_at: string;
}

export default function FileUploadPage() {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [processing, setProcessing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Column Mapping Modal
  const [showColumnMappingModal, setShowColumnMappingModal] = useState(false);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modals
  const [previewModal, setPreviewModal] = useState<{ open: boolean; fileId: number | null }>({ open: false, fileId: null });
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [logsModal, setLogsModal] = useState<{ open: boolean; fileId: number | null }>({ open: false, fileId: null });
  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  useEffect(() => {
    fetchUploads();
    fetchStats();
  }, [statusFilter, typeFilter]);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      let url = `${BASE_URL}/file-uploads/`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('file_type', typeFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BASE_URL}/file-uploads/stats/summary`, { credentials: 'include' });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const response = await fetch(`${BASE_URL}/file-uploads/upload?uploaded_by=system`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[file.name];
              return newProgress;
            });
          }, 2000);
        } else {
          const error = await response.json();
          console.error('Upload failed:', error);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    setUploading(false);
    fetchUploads();
    fetchStats();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handlePreview = async (fileId: number) => {
    setPreviewModal({ open: true, fileId });
    try {
      const response = await fetch(`${BASE_URL}/file-uploads/${fileId}/preview`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      setPreviewData(null);
    }
  };

  const handleViewLogs = async (fileId: number) => {
    setLogsModal({ open: true, fileId });
    try {
      const response = await fetch(`${BASE_URL}/file-uploads/${fileId}/logs`, { credentials: 'include' });
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;

    try {
      const response = await fetch(`${BASE_URL}/file-uploads/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchUploads();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting upload:', error);
    }
  };

  const loadColumnMappings = async () => {
    setIsLoadingMappings(true);
    try {
      const response = await fetch(`${BASE_URL}/file-uploads/column-mappings/default-employee`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setColumnMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error loading column mappings:', error);
    } finally {
      setIsLoadingMappings(false);
    }
  };

  const openColumnMappingModal = () => {
    setShowColumnMappingModal(true);
    loadColumnMappings();
  };

  const handleProcess = async (fileId: number) => {
    if (!confirm('Process this file and import employee data to the database?')) return;

    setProcessing(fileId);
    try {
      const response = await fetch(`${BASE_URL}/file-uploads/${fileId}/process`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          type: 'success',
          message: `${data.message} - ${data.stats.processed} processed, ${data.stats.failed} failed, ${data.stats.skipped} skipped`
        });
        setTimeout(() => setToast({ type: null, message: '' }), 5000);
        fetchUploads();
        fetchStats();
      } else {
        setToast({
          type: 'error',
          message: data.detail || 'Failed to process file'
        });
        setTimeout(() => setToast({ type: null, message: '' }), 5000);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setToast({
        type: 'error',
        message: 'Error processing file: ' + (error as Error).message
      });
      setTimeout(() => setToast({ type: null, message: '' }), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending' },
      processing: { icon: Loader, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Processing' },
      completed: { icon: CheckCircle, color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Completed' },
      failed: { icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Failed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
        <Icon className={`h-3.5 w-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    );
  };

  const getFileTypeIcon = (type: string) => {
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toast.type && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <p className={`text-sm font-medium ${
              toast.type === 'success'
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => setToast({ type: null, message: '' })}
              className="ml-4 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">File Upload Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload and manage CSV, XLSX, DOCX, and PDF files for data processing
          </p>
        </div>
        <a
          href={`${BASE_URL}/file-uploads/templates/download?template_type=employee`}
          download
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Template
        </a>
        <button
          onClick={openColumnMappingModal}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          <Settings className="h-4 w-4" />
          Column Mappings
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Uploads</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_uploads}</div>
          </div>
          <div className="bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/20">
            <div className="text-sm text-yellow-700 dark:text-yellow-400">Pending</div>
            <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-lg p-4 border border-blue-500/20">
            <div className="text-sm text-blue-700 dark:text-blue-400">Processing</div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">{stats.processing}</div>
          </div>
          <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-4 border border-green-500/20">
            <div className="text-sm text-green-700 dark:text-green-400">Completed</div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-300 mt-1">{stats.completed}</div>
          </div>
          <div className="bg-red-500/10 dark:bg-red-500/20 rounded-lg p-4 border border-red-500/20">
            <div className="text-sm text-red-700 dark:text-red-400">Failed</div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-300 mt-1">{stats.failed}</div>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Supports CSV, XLSX, DOCX, PDF (max 50MB)
        </p>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Uploading Files...</h3>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-md">{fileName}</span>
                <span className="text-gray-500 dark:text-gray-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All File Types</option>
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
          <option value="docx">DOCX</option>
          <option value="pdf">PDF</option>
        </select>

        {(statusFilter || typeFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
            }}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Uploads Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : uploads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No uploads found
                  </td>
                </tr>
              ) : (
                uploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getFileTypeIcon(upload.file_type)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                          {upload.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                        {upload.file_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(upload.file_size)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(upload.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {upload.status === 'completed' || upload.status === 'failed' ? (
                        <div>
                          <div className="text-green-600 dark:text-green-400">
                            {upload.records_processed} processed
                          </div>
                          {upload.records_failed > 0 && (
                            <div className="text-red-600 dark:text-red-400">
                              {upload.records_failed} failed
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(upload.uploaded_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(upload.file_type === 'csv' || upload.file_type === 'xlsx') && (
                          <>
                            <button
                              onClick={() => handlePreview(upload.id)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {upload.status === 'pending' && (
                              <button
                                onClick={() => handleProcess(upload.id)}
                                disabled={processing === upload.id}
                                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Process Employee Data"
                              >
                                {processing === upload.id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleViewLogs(upload.id)}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="View Logs"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(upload.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Preview</h3>
              <button
                onClick={() => setPreviewModal({ open: false, fileId: null })}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {previewData ? (
                <div>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Showing first 10 rows of {previewData.row_count} total rows
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 dark:border-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          {previewData.columns.map((col, idx) => (
                            <th
                              key={idx}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sample_data.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            {previewData.columns.map((col, colIdx) => (
                              <td
                                key={colIdx}
                                className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                              >
                                {row[col]?.toString() || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Logs</h3>
              <button
                onClick={() => setLogsModal({ open: false, fileId: null })}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No logs available
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border ${
                        log.log_level === 'error'
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                          : log.log_level === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {log.log_level === 'error' && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />}
                        {log.log_level === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium uppercase ${
                              log.log_level === 'error'
                                ? 'text-red-700 dark:text-red-400'
                                : log.log_level === 'warning'
                                ? 'text-yellow-700 dark:text-yellow-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {log.log_level}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white mb-1">
                            {log.log_message}
                          </p>
                          {log.row_number !== null && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Row: {log.row_number}
                              {log.column_name && `, Column: ${log.column_name}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {showColumnMappingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Employee Data Column Mappings
              </h3>
              <button
                onClick={() => setShowColumnMappingModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              {isLoadingMappings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    These column mappings define how fields in your Paylocity CSV files are mapped to employee database fields. This is the default configuration used during file processing.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">Default Paylocity Mapping</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          This configuration matches the standard Paylocity employee export format. Make sure your CSV files use these exact column names.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Source Column (CSV)
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            →
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Target Field (Database)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(columnMappings).map(([source, target]) => (
                          <tr key={source} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {source}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-500">
                              →
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                              {target}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      <strong>Note:</strong> Custom column mapping configuration will be available in a future update. Currently, all files must match this standard Paylocity format.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowColumnMappingModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
