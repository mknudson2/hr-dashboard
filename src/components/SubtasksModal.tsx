import { useEffect, useState } from 'react';
import { X, CheckCircle, Mail, Upload, FileText } from 'lucide-react';

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
}

interface ParentTask {
  id: number;
  task_name: string;
  task_description: string | null;
  task_details?: {
    has_action_button?: boolean;
    action_button_label?: string;
    is_toggle?: boolean;
  };
}

interface SubtasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTask: ParentTask | null;
  subtasks: Subtask[];
  onUpdateSubtask: (subtaskId: number, newStatus: string) => void;
  onCheckAll: () => void;
  onActionButton?: () => void;
  onAddNote?: (taskId: number, note: string) => void;
  onFileUpload?: (subtaskId: number, file: File) => void;
}

export default function SubtasksModal({
  isOpen,
  onClose,
  parentTask,
  subtasks,
  onUpdateSubtask,
  onCheckAll,
  onActionButton,
  onAddNote,
  onFileUpload
}: SubtasksModalProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const handleAddNote = (taskId: number) => {
    const task = subtasks.find(t => t.id === taskId);
    setEditingTaskId(taskId);
    setNoteText(task?.notes || '');
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {parentTask.task_name}
              </h3>
              {parentTask.task_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {parentTask.task_description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {completedCount} of {subtasks.length} completed
                </span>
                <div className="flex-1 max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            {!allCompleted && (
              <button
                onClick={onCheckAll}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Check All
              </button>
            )}

            {hasActionButton && onActionButton && (
              <button
                onClick={onActionButton}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                {parentTask.task_details?.action_button_label || 'Execute Action'}
              </button>
            )}
          </div>

          {/* Subtasks List */}
          <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
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
                        {subtask.notes ? 'Edit Note' : 'Add Note'}
                      </button>
                    )}

                    {subtask.notes && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Note added
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
