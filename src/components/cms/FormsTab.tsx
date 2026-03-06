import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, FileText, ExternalLink } from 'lucide-react';
import { API_URL } from '@/config/api';

interface FormItem {
  id: number;
  name: string;
  description: string;
  category: string;
  file_type: string;
  file_size: string;
  download_url: string;
  external_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const FORM_CATEGORIES = ['Payroll', 'Tax Forms', 'Benefits', 'Leave', 'Personal Information'];

export default function FormsTab() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', category: '', file_type: 'PDF',
    file_size: '', download_url: '', external_url: '',
  });

  const fetchForms = async () => {
    try {
      const res = await fetch(`${API_URL}/content-management/forms`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      setForms(await res.json());
    } catch (err) {
      console.error('Failed to load forms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForms(); }, []);

  const filtered = forms.filter(f => {
    const matchesSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const openCreate = () => {
    setModalMode('create');
    setForm({ name: '', description: '', category: '', file_type: 'PDF', file_size: '', download_url: '', external_url: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (item: FormItem) => {
    setModalMode('edit');
    setForm({
      name: item.name, description: item.description, category: item.category,
      file_type: item.file_type, file_size: item.file_size,
      download_url: item.download_url, external_url: item.external_url || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const payload = { ...form, external_url: form.external_url || null };
    try {
      if (modalMode === 'create') {
        await fetch(`${API_URL}/content-management/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...payload, sort_order: forms.length + 1 }),
        });
      } else {
        await fetch(`${API_URL}/content-management/forms/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      await fetchForms();
    } catch (err) {
      alert('Failed to save form');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this form?')) return;
    try {
      await fetch(`${API_URL}/content-management/forms/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchForms();
    } catch (err) {
      alert('Failed to delete form');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search forms..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Categories</option>
            {FORM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Add Form
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Form Name</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-32">Category</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-24">Type</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-24">Size</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-20">Status</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">No forms found</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-md">{item.description}</p>
                      </div>
                      {item.external_url && <ExternalLink className="w-3 h-3 text-blue-500 flex-shrink-0" title="Has external link" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.file_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.file_size}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${item.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {item.is_active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-500 hover:text-yellow-600" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-500 hover:text-red-600 ml-1" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {modalMode === 'create' ? 'Add' : 'Edit'} Form
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Form Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">Select a category</option>
                  {FORM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File Type</label>
                  <select value={form.file_type} onChange={e => setForm({ ...form, file_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="XLSX">XLSX</option>
                    <option value="Online">Online Form</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File Size</label>
                  <input type="text" value={form.file_size} onChange={e => setForm({ ...form, file_size: e.target.value })} placeholder="e.g., 125 KB" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Download URL</label>
                <input type="text" value={form.download_url} onChange={e => setForm({ ...form, download_url: e.target.value })} placeholder="/api/portal/resources/forms/..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External URL (optional)</label>
                <input type="text" value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{modalMode === 'create' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
