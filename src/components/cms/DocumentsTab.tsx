import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, FileText, Users, Upload, Link, X, ChevronDown } from 'lucide-react';
import { API_URL } from '@/config/api';

interface EmployeeSummary {
  id: number;
  employee_id: string;
  full_name: string;
  department: string;
}

interface EmployeeDoc {
  id: number;
  employee_id: number;
  employee_name: string;
  name: string;
  document_type: string;
  category: string;
  document_date: string;
  file_size: string;
  download_url: string;
  is_active: boolean;
}

const DOC_TYPES = [
  { value: 'pay_stub', label: 'Pay Stub' },
  { value: 'w2', label: 'W-2' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'benefits_summary', label: 'Benefits Summary' },
  { value: 'tax_form', label: 'Tax Form' },
  { value: 'other', label: 'Other' },
];

const CATEGORIES = ['Pay Stubs', 'Tax Forms', 'Benefits', 'Offer Letters', 'Other'];

const TYPE_TO_CATEGORY: Record<string, string> = {
  pay_stub: 'Pay Stubs', w2: 'Tax Forms', offer_letter: 'Offer Letters',
  benefits_summary: 'Benefits', tax_form: 'Tax Forms', other: 'Other',
};

const typeColors: Record<string, string> = {
  pay_stub: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  w2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  offer_letter: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  benefits_summary: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  tax_form: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function DocumentsTab() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<EmployeeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDoc, setEditingDoc] = useState<EmployeeDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formEmployeeId, setFormEmployeeId] = useState(0);
  const [formName, setFormName] = useState('');
  const [formDocType, setFormDocType] = useState('other');
  const [formCategory, setFormCategory] = useState('Other');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceMode, setSourceMode] = useState<'upload' | 'url'>('upload');
  const [formUrl, setFormUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/content-management/documents/employees`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch employees');
      setEmployees(await res.json());
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const fetchDocuments = async (empId?: number | null) => {
    try {
      const url = empId
        ? `${API_URL}/content-management/documents?employee_id=${empId}`
        : `${API_URL}/content-management/documents`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      setDocuments(await res.json());
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDocuments();
  }, []);

  const handleSelectEmployee = (empId: number | null) => {
    setSelectedEmployeeId(empId);
    setLoading(true);
    fetchDocuments(empId);
  };

  const filteredDocs = documents.filter(d => {
    const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.employee_name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || d.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const resetForm = () => {
    setFormEmployeeId(selectedEmployeeId || 0);
    setFormName('');
    setFormDocType('other');
    setFormCategory('Other');
    setFormDate(new Date().toISOString().split('T')[0]);
    setSourceMode('upload');
    setFormUrl('');
    setSelectedFile(null);
    setEmpModalQuery('');
    setEmpModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingDoc(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (doc: EmployeeDoc) => {
    setModalMode('edit');
    setEditingDoc(doc);
    setFormEmployeeId(doc.employee_id);
    setFormName(doc.name);
    setFormDocType(doc.document_type);
    setFormCategory(doc.category);
    setFormDate(doc.document_date);
    setSourceMode(doc.download_url && !doc.download_url.startsWith('/content-management/') ? 'url' : 'upload');
    setFormUrl(doc.download_url || '');
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (modalMode === 'create' && sourceMode === 'upload' && selectedFile) {
        // File upload via multipart form
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('employee_id', String(formEmployeeId));
        fd.append('name', formName);
        fd.append('document_type', formDocType);
        fd.append('category', formCategory);
        fd.append('document_date', formDate);
        const res = await fetch(`${API_URL}/content-management/documents/upload`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        if (!res.ok) throw new Error('Failed to upload');
      } else if (modalMode === 'create') {
        // URL-based creation
        const res = await fetch(`${API_URL}/content-management/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            employee_id: formEmployeeId,
            name: formName,
            document_type: formDocType,
            category: formCategory,
            document_date: formDate,
            download_url: formUrl,
          }),
        });
        if (!res.ok) throw new Error('Failed to create');
      } else if (editingDoc) {
        const res = await fetch(`${API_URL}/content-management/documents/${editingDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formName,
            document_type: formDocType,
            category: formCategory,
            document_date: formDate,
            download_url: sourceMode === 'url' ? formUrl : undefined,
          }),
        });
        if (!res.ok) throw new Error('Failed to update');
      }
      setShowModal(false);
      await fetchDocuments(selectedEmployeeId);
    } catch (err) {
      alert('Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch(`${API_URL}/content-management/documents/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchDocuments(selectedEmployeeId);
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    // Auto-fill name from filename if empty
    if (file && !formName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFormName(nameWithoutExt);
    }
  };

  const canSubmit = () => {
    if (!formName.trim()) return false;
    if (modalMode === 'create') {
      if (!formEmployeeId) return false;
      if (sourceMode === 'upload' && !selectedFile) return false;
      if (sourceMode === 'url' && !formUrl.trim()) return false;
    }
    return true;
  };

  // Employee search combobox state (top filter)
  const [empFilterQuery, setEmpFilterQuery] = useState('');
  const [empFilterOpen, setEmpFilterOpen] = useState(false);
  const empFilterRef = useRef<HTMLDivElement>(null);

  // Employee search combobox state (modal)
  const [empModalQuery, setEmpModalQuery] = useState('');
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const empModalRef = useRef<HTMLDivElement>(null);

  const filteredEmployeesFilter = useMemo(() => {
    if (!empFilterQuery.trim()) return employees;
    const q = empFilterQuery.toLowerCase();
    return employees.filter(e => e.full_name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
  }, [employees, empFilterQuery]);

  const filteredEmployeesModal = useMemo(() => {
    if (!empModalQuery.trim()) return employees;
    const q = empModalQuery.toLowerCase();
    return employees.filter(e => e.full_name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
  }, [employees, empModalQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (empFilterRef.current && !empFilterRef.current.contains(e.target as Node)) setEmpFilterOpen(false);
      if (empModalRef.current && !empModalRef.current.contains(e.target as Node)) setEmpModalOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedFilterEmployee = employees.find(e => e.id === selectedEmployeeId);
  const selectedModalEmployee = employees.find(e => e.id === formEmployeeId);

  if (loading && documents.length === 0) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Employee Selector + Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative" ref={empFilterRef}>
          <div
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm min-w-[280px] cursor-pointer"
            onClick={() => { setEmpFilterOpen(true); setEmpFilterQuery(''); }}
          >
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {selectedFilterEmployee ? (
              <>
                <span className="text-gray-900 dark:text-white truncate flex-1">{selectedFilterEmployee.full_name} — {selectedFilterEmployee.department}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectEmployee(null); setEmpFilterQuery(''); }}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-500 dark:text-gray-400 flex-1">All Employees</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </>
            )}
          </div>
          {empFilterOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-64 flex flex-col">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                  autoFocus
                  type="text"
                  value={empFilterQuery}
                  onChange={e => setEmpFilterQuery(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                <button
                  onClick={() => { handleSelectEmployee(null); setEmpFilterOpen(false); setEmpFilterQuery(''); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All Employees
                </button>
                {filteredEmployeesFilter.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { handleSelectEmployee(e.id); setEmpFilterOpen(false); setEmpFilterQuery(''); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      e.id === selectedEmployeeId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {e.full_name} <span className="text-gray-400">— {e.department}</span>
                  </button>
                ))}
                {filteredEmployeesFilter.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-400">No employees found</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
        {selectedEmployeeId && employees.find(e => e.id === selectedEmployeeId) &&
          ` for ${employees.find(e => e.id === selectedEmployeeId)!.full_name}`
        }
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {!selectedEmployeeId && <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Employee</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Document</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Size</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={selectedEmployeeId ? 6 : 7} className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>{selectedEmployeeId ? 'No documents for this employee.' : 'No documents found.'}</p>
                  <p className="text-xs mt-1">Click "Add Document" to create one.</p>
                </td>
              </tr>
            ) : (
              filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  {!selectedEmployeeId && (
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{doc.employee_name}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900 dark:text-white">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[doc.document_type] || typeColors.other}`}>
                      {DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{doc.category}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{doc.document_date}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{doc.file_size}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(doc)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {modalMode === 'create' ? 'Add Document' : 'Edit Document'}
            </h3>
            <div className="space-y-4">
              {/* Employee selector (create only) */}
              {modalMode === 'create' && (
                <div ref={empModalRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
                  <div
                    className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm cursor-pointer"
                    onClick={() => { setEmpModalOpen(true); setEmpModalQuery(''); }}
                  >
                    {selectedModalEmployee ? (
                      <>
                        <span className="text-gray-900 dark:text-white truncate flex-1">{selectedModalEmployee.full_name} — {selectedModalEmployee.department}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFormEmployeeId(0); setEmpModalQuery(''); }}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-500 dark:text-gray-400 flex-1">Select employee...</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </>
                    )}
                  </div>
                  {empModalOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-30 max-h-48 flex flex-col">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                          autoFocus
                          type="text"
                          value={empModalQuery}
                          onChange={e => setEmpModalQuery(e.target.value)}
                          placeholder="Search employees..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {filteredEmployeesModal.map(e => (
                          <button
                            key={e.id}
                            onClick={() => { setFormEmployeeId(e.id); setEmpModalOpen(false); setEmpModalQuery(''); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              e.id === formEmployeeId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {e.full_name} <span className="text-gray-400">— {e.department}</span>
                          </button>
                        ))}
                        {filteredEmployeesModal.length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">No employees found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Pay Stub - January 2026"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={formDocType}
                    onChange={e => {
                      const t = e.target.value;
                      setFormDocType(t);
                      setFormCategory(TYPE_TO_CATEGORY[t] || 'Other');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Source: Upload File or Link URL */}
              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setSourceMode('upload')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        sourceMode === 'upload'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceMode('url')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        sourceMode === 'url'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      Link URL
                    </button>
                  </div>

                  {sourceMode === 'upload' ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
                      />
                      {selectedFile && (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formUrl}
                      onChange={e => setFormUrl(e.target.value)}
                      placeholder="https://example.com/document.pdf"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit() || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Document' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
