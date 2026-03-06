import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Save, Book, Check } from 'lucide-react';
import ContentEditor from './ContentEditor';
import { API_URL } from '@/config/api';

interface Section {
  id: number;
  title: string;
  content: string | null;
  sort_order: number;
}

interface Chapter {
  id: number;
  title: string;
  sort_order: number;
  sections: Section[];
}

export default function HandbookTab() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout>>();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'chapter' | 'section'>('chapter');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalTitle, setModalTitle] = useState('');
  const [modalParentId, setModalParentId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchChapters = async () => {
    try {
      const res = await fetch(`${API_URL}/content-management/handbook/chapters`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setChapters(data);
    } catch (err) {
      console.error('Failed to load handbook:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChapters(); }, []);

  const toggleChapter = (id: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectSection = (section: Section, chapterId: number) => {
    setSelectedSection(section);
    setSelectedChapterId(chapterId);
    setEditContent(section.content || '');
  };

  const handleSaveContent = async () => {
    if (!selectedSection) return;
    setSaving(true);
    setSaveSuccess(false);
    clearTimeout(saveSuccessTimer.current);
    try {
      const res = await fetch(`${API_URL}/content-management/handbook/sections/${selectedSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error('Failed to save');
      await fetchChapters();
      setSelectedSection({ ...selectedSection, content: editContent });
      setSaveSuccess(true);
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Failed to save section content');
    } finally {
      setSaving(false);
    }
  };

  const openCreateChapter = () => {
    setModalType('chapter');
    setModalMode('create');
    setModalTitle('');
    setEditingId(null);
    setShowModal(true);
  };

  const openEditChapter = (ch: Chapter) => {
    setModalType('chapter');
    setModalMode('edit');
    setModalTitle(ch.title);
    setEditingId(ch.id);
    setShowModal(true);
  };

  const openCreateSection = (chapterId: number) => {
    setModalType('section');
    setModalMode('create');
    setModalTitle('');
    setModalParentId(chapterId);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditSection = (section: Section) => {
    setModalType('section');
    setModalMode('edit');
    setModalTitle(section.title);
    setEditingId(section.id);
    setShowModal(true);
  };

  const handleModalSubmit = async () => {
    try {
      if (modalType === 'chapter') {
        if (modalMode === 'create') {
          const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.sort_order)) + 1 : 1;
          await fetch(`${API_URL}/content-management/handbook/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: modalTitle, sort_order: maxOrder }),
          });
        } else {
          await fetch(`${API_URL}/content-management/handbook/chapters/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: modalTitle }),
          });
        }
      } else {
        if (modalMode === 'create') {
          const parent = chapters.find(c => c.id === modalParentId);
          const maxOrder = parent && parent.sections.length > 0 ? Math.max(...parent.sections.map(s => s.sort_order)) + 1 : 1;
          await fetch(`${API_URL}/content-management/handbook/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: modalTitle, chapter_id: modalParentId, sort_order: maxOrder }),
          });
        } else {
          await fetch(`${API_URL}/content-management/handbook/sections/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: modalTitle }),
          });
        }
      }
      setShowModal(false);
      await fetchChapters();
    } catch (err) {
      alert('Operation failed');
    }
  };

  const handleDeleteChapter = async (id: number) => {
    if (!confirm('Delete this chapter and all its sections?')) return;
    try {
      await fetch(`${API_URL}/content-management/handbook/chapters/${id}`, { method: 'DELETE', credentials: 'include' });
      if (selectedChapterId === id) { setSelectedSection(null); setSelectedChapterId(null); }
      await fetchChapters();
    } catch (err) {
      alert('Failed to delete chapter');
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm('Delete this section?')) return;
    try {
      await fetch(`${API_URL}/content-management/handbook/sections/${id}`, { method: 'DELETE', credentials: 'include' });
      if (selectedSection?.id === id) { setSelectedSection(null); }
      await fetchChapters();
    } catch (err) {
      alert('Failed to delete section');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Left panel - Chapter tree */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Chapters</h3>
          <button onClick={openCreateChapter} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Add Chapter">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chapters.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No chapters yet. Click + to add one.</p>
          ) : (
            chapters.map(ch => (
              <div key={ch.id} className="mb-1">
                <div className="flex items-center group">
                  <button onClick={() => toggleChapter(ch.id)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {expandedChapters.has(ch.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate cursor-pointer" onClick={() => toggleChapter(ch.id)}>
                    {ch.title}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={() => openCreateSection(ch.id)} className="p-1 text-gray-400 hover:text-blue-600" title="Add Section">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEditChapter(ch)} className="p-1 text-gray-400 hover:text-yellow-600" title="Edit Chapter">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteChapter(ch.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete Chapter">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {expandedChapters.has(ch.id) && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {ch.sections.map(sec => (
                      <div
                        key={sec.id}
                        className={`flex items-center group/sec rounded px-2 py-1.5 cursor-pointer ${
                          selectedSection?.id === sec.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => selectSection(sec, ch.id)}
                      >
                        <Book className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{sec.title}</span>
                        <div className="hidden group-hover/sec:flex items-center gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); openEditSection(sec); }} className="p-0.5 text-gray-400 hover:text-yellow-600" title="Edit">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }} className="p-0.5 text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {ch.sections.length === 0 && (
                      <p className="text-xs text-gray-400 pl-2 py-1">No sections</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Content editor */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
        {selectedSection ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedSection.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Edit section content below</p>
              </div>
              <button
                onClick={handleSaveContent}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  saveSuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {saveSuccess ? (
                  <><Check className="w-4 h-4" />Saved!</>
                ) : (
                  <><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}</>
                )}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ContentEditor content={editContent} onChange={setEditContent} placeholder="Write section content..." />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a section to edit its content</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {modalMode === 'create' ? 'Add' : 'Edit'} {modalType === 'chapter' ? 'Chapter' : 'Section'}
            </h3>
            <input
              type="text"
              value={modalTitle}
              onChange={e => setModalTitle(e.target.value)}
              placeholder={`${modalType === 'chapter' ? 'Chapter' : 'Section'} title...`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && modalTitle.trim() && handleModalSubmit()}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={!modalTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {modalMode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
