import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { NoteItem } from './types';
import { formatTimestamp } from './utils';

interface NotesHistorySectionProps {
  notes: NoteItem[];
  checkedNotes: Set<string>;
  onNoteCheckChange: (noteId: string, checked: boolean) => void;
  onEditNote: (noteIndex: number, newValue: string) => void;
  onDeleteNote: (noteIndex: number) => void;
  showSaveSuccess: boolean;
}

export default function NotesHistorySection({
  notes,
  checkedNotes,
  onNoteCheckChange,
  onEditNote,
  onDeleteNote,
  showSaveSuccess
}: NotesHistorySectionProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const handleStartEdit = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  };

  const handleSaveEdit = (noteIndex: number) => {
    onEditNote(noteIndex, editingNoteText);
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Notes History</h3>

      {showSaveSuccess && (
        <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm text-green-800 dark:text-green-400">
          Note saved successfully!
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No notes yet. Add a note above to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note, index) => {
            const isChecked = checkedNotes.has(note.id);
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onNoteCheckChange(note.id, e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {note.title}
                        </span>
                        {note.type === 'period' && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded">
                            Period Note
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(note.timestamp)}
                        </span>
                        {note.type === 'period' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStartEdit(note)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Edit note"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteNote(index)}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-2">
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={2}
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleSaveEdit(index)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className={`text-sm ${
                            isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {note.content}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Added by {note.user}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
