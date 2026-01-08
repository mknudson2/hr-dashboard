import { X, Upload, FileText, CheckCircle, AlertTriangle, AlertCircle as AlertCircleIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const BASE_URL = '';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReconciliationResults {
  summary: {
    total_uploaded: number;
    total_compared: number;
    matches: number;
    discrepancies: number;
    missing_in_system: number;
    missing_in_file: number;
    accuracy_rate: number;
  };
  matches: any[];
  discrepancies: any[];
  missing_in_system: any[];
  missing_in_file: any[];
}

export default function ContributionReconciliationModal({ isOpen, onClose }: ReconciliationModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ReconciliationResults | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'discrepancies' | 'missing'>('summary');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isCSV = file.name.endsWith('.csv');
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (!isCSV && !isExcel) {
        setError('Please select a CSV or Excel file');
        return;
      }
      setSelectedFile(file);
      setError('');
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${BASE_URL}/employees/contributions/reconcile`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reconcile contributions');
      }

      const data = await response.json();
      setResults(data);
      setActiveTab('summary');
    } catch (err: any) {
      setError(err.message || 'Failed to reconcile contributions');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Employee ID', 'HSA Employee', 'HSA Employer', 'HRA Employer', 'FSA', 'LFSA', 'Dependent Care FSA', '401k'];
    const sampleData = [
      ['1000', '100.00', '50.00', '25.00', '50.00', '0.00', '0.00', '308.72'],
      ['1001', '200.00', '100.00', '50.00', '0.00', '0.00', '100.00', '861.81'],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'contribution_template.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setError('');
    setActiveTab('summary');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Contribution Reconciliation
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Upload a CSV or Excel file to compare with system data
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {!results ? (
                  <>
                    {/* File Upload Section */}
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                            <Upload className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Upload Contribution File
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            CSV file with columns: Employee ID, HSA Employee, HSA Employer, HRA Employer, FSA, LFSA, Dependent Care FSA, 401k
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <FileText className="w-5 h-5" />
                            {selectedFile ? 'Change File' : 'Select CSV or Excel File'}
                            <input
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </label>

                          <button
                            onClick={handleDownloadTemplate}
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download Template CSV
                          </button>
                        </div>

                        {selectedFile && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                              Selected: {selectedFile.name}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={onClose}
                        disabled={uploading}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Reconcile Contributions
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Results Section */}
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Matches</p>
                        </div>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {results.summary.matches}
                        </p>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Discrepancies</p>
                        </div>
                        <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                          {results.summary.discrepancies}
                        </p>
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Missing in System</p>
                        </div>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                          {results.summary.missing_in_system}
                        </p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Missing in File</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {results.summary.missing_in_file}
                        </p>
                      </div>
                    </div>

                    {/* Accuracy Rate */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accuracy Rate:</span>
                        <span className={`text-2xl font-bold ${
                          results.summary.accuracy_rate >= 95
                            ? 'text-green-600 dark:text-green-400'
                            : results.summary.accuracy_rate >= 80
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {results.summary.accuracy_rate}%
                        </span>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex gap-4">
                        <button
                          onClick={() => setActiveTab('summary')}
                          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            activeTab === 'summary'
                              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Summary
                        </button>
                        <button
                          onClick={() => setActiveTab('discrepancies')}
                          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            activeTab === 'discrepancies'
                              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Discrepancies ({results.summary.discrepancies})
                        </button>
                        <button
                          onClick={() => setActiveTab('missing')}
                          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            activeTab === 'missing'
                              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Missing ({results.summary.missing_in_system + results.summary.missing_in_file})
                        </button>
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                      {activeTab === 'summary' && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Reconciliation Complete</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Total Uploaded:</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{results.summary.total_uploaded}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Total Compared:</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{results.summary.total_compared}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {results.summary.discrepancies > 0
                              ? `Found ${results.summary.discrepancies} discrepancies that need review. Please check the Discrepancies tab.`
                              : 'All contribution data matches perfectly! No discrepancies found.'}
                          </p>
                        </div>
                      )}

                      {activeTab === 'discrepancies' && (
                        <div className="space-y-3">
                          {results.discrepancies.length === 0 ? (
                            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                              No discrepancies found. All data matches!
                            </p>
                          ) : (
                            results.discrepancies.map((disc, idx) => (
                              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{disc.employee_name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {disc.employee_id} • {disc.department}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(disc.differences).map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex items-center justify-between text-sm bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded">
                                      <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {key.replace(/_/g, ' ').toUpperCase()}:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600 dark:text-gray-400">${value.system}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">${value.file}</span>
                                        <span className={`text-xs ${value.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          ({value.difference > 0 ? '+' : ''}{value.difference})
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {activeTab === 'missing' && (
                        <div className="space-y-4">
                          {results.summary.missing_in_system > 0 && (
                            <div>
                              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                                Missing in System ({results.summary.missing_in_system})
                              </h4>
                              <div className="space-y-2">
                                {results.missing_in_system.map((emp, idx) => (
                                  <div key={idx} className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                    <p className="font-semibold text-red-900 dark:text-red-100">{emp.employee_id}</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                      This employee ID is in the uploaded file but not found in the system.
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {results.summary.missing_in_file > 0 && (
                            <div>
                              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Missing in File ({results.summary.missing_in_file})
                              </h4>
                              <div className="space-y-2">
                                {results.missing_in_file.map((emp, idx) => (
                                  <div key={idx} className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                    <p className="font-semibold text-blue-900 dark:text-blue-100">{emp.employee_name}</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                      {emp.employee_id} • {emp.department}
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                      Has contributions in system but not in uploaded file
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {results.summary.missing_in_system === 0 && results.summary.missing_in_file === 0 && (
                            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                              No missing employees. All employees accounted for!
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Upload Another File
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
