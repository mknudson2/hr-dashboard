import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Tag } from 'lucide-react';
import ContentEditor from './ContentEditor';
import { API_URL } from '@/config/api';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
}

const FAQ_CATEGORIES = ['Time Off', 'Payroll', 'Benefits', 'Leave', 'IT Support', 'General'];

export default function FAQsTab() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', category: '', tags: '' });

  const fetchFAQs = async () => {
    try {
      const res = await fetch(`${API_URL}/content-management/faqs`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      setFaqs(await res.json());
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFAQs(); }, []);

  const filtered = faqs.filter(f => {
    const matchesSearch = !search || f.question.toLowerCase().includes(search.toLowerCase()) || f.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !filterCategory || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const openCreate = () => {
    setModalMode('create');
    setForm({ question: '', answer: '', category: '', tags: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (faq: FAQ) => {
    setModalMode('edit');
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, tags: faq.tags.join(', ') });
    setEditingId(faq.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (modalMode === 'create') {
        await fetch(`${API_URL}/content-management/faqs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ question: form.question, answer: form.answer, category: form.category, tags, sort_order: faqs.length + 1 }),
        });
      } else {
        await fetch(`${API_URL}/content-management/faqs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ question: form.question, answer: form.answer, category: form.category, tags }),
        });
      }
      setShowModal(false);
      await fetchFAQs();
    } catch (err) {
      alert('Failed to save FAQ');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await fetch(`${API_URL}/content-management/faqs/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchFAQs();
    } catch (err) {
      alert('Failed to delete FAQ');
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
              placeholder="Search FAQs..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Categories</option>
            {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Question</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-32">Category</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-48">Tags</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-20">Status</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">No FAQs found</td></tr>
            ) : (
              filtered.map(faq => (
                <tr key={faq.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{faq.question}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{faq.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {faq.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          <Tag className="w-2.5 h-2.5" />{tag}
                        </span>
                      ))}
                      {faq.tags.length > 3 && <span className="text-xs text-gray-400">+{faq.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${faq.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {faq.is_active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(faq)} className="p-1.5 text-gray-500 hover:text-yellow-600" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(faq.id)} className="p-1.5 text-gray-500 hover:text-red-600 ml-1" title="Delete">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {modalMode === 'create' ? 'Add' : 'Edit'} FAQ
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                <input type="text" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Enter the FAQ question..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">Select a category</option>
                  {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g., pto, vacation, leave" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer</label>
                <ContentEditor content={form.answer} onChange={answer => setForm({ ...form, answer })} placeholder="Write the FAQ answer..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.question.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{modalMode === 'create' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
