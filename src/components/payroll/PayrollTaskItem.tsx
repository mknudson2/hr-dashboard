import { useState } from 'react';
import { ChevronDown, ChevronRight, Mail, MessageSquare } from 'lucide-react';
import type { PayrollTask } from './types';

interface PayrollTaskItemProps {
  task: PayrollTask;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTaskCheck: (task: PayrollTask, checked: boolean) => void;
  onToggleChange: (task: PayrollTask, value: boolean) => void;
  onSaveTaskNotes: (taskId: number, notes: string) => Promise<void>;
  onSendEmail: (emailTemplate: string) => void;
}

export default function PayrollTaskItem({
  task,
  isExpanded,
  onToggleExpand,
  onTaskCheck,
  onToggleChange,
  onSaveTaskNotes,
  onSendEmail
}: PayrollTaskItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(task.notes || '');
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNotes = async () => {
    setSavingNote(true);
    await onSaveTaskNotes(task.id, noteText);
    setSavingNote(false);
    setShowNotes(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(e) => onTaskCheck(task, e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <h4
                  className={`font-medium ${
                    task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {task.title}
                </h4>
                {task.path_reference && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {task.path_reference}
                  </span>
                )}
                {task.has_email_button && task.email_template_name && (
                  <button
                    onClick={() => onSendEmail(task.email_template_name!)}
                    className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    Send Email
                  </button>
                )}
              </div>
              {task.subtasks.length > 0 && (
                <button
                  onClick={onToggleExpand}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              )}
            </div>

            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
            )}
            {task.instructions && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{task.instructions}</p>
            )}

            {/* Task Notes */}
            <div className="mt-2">
              {showNotes ? (
                <div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add notes for this task..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNote}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingNote ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNotes(false);
                        setNoteText(task.notes || '');
                      }}
                      disabled={savingNote}
                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {task.notes && (
                    <div className="text-xs bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1 text-gray-700 dark:text-yellow-300">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      {task.notes}
                    </div>
                  )}
                  <button
                    onClick={() => setShowNotes(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1"
                  >
                    {task.notes ? 'Edit Note' : 'Add Note'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subtasks */}
        {isExpanded && task.subtasks.length > 0 && (
          <div className="ml-8 mt-3 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {task.subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                onTaskCheck={onTaskCheck}
                onToggleChange={onToggleChange}
                onSendEmail={onSendEmail}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SubtaskItemProps {
  subtask: PayrollTask;
  onTaskCheck: (task: PayrollTask, checked: boolean) => void;
  onToggleChange: (task: PayrollTask, value: boolean) => void;
  onSendEmail: (emailTemplate: string) => void;
}

function SubtaskItem({ subtask, onTaskCheck, onToggleChange, onSendEmail }: SubtaskItemProps) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={(e) => onTaskCheck(subtask, e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h5
            className={`text-sm ${
              subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {subtask.title}
          </h5>
          {subtask.path_reference && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {subtask.path_reference}
            </span>
          )}
          {subtask.has_email_button && subtask.email_template_name && (
            <button
              onClick={() => onSendEmail(subtask.email_template_name!)}
              className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              Send
            </button>
          )}
          {subtask.has_toggle && (
            <button
              onClick={() => onToggleChange(subtask, !subtask.toggle_value)}
              className={`relative inline-flex h-4 w-8 items-center rounded-full ml-2 ${
                subtask.toggle_value ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  subtask.toggle_value ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
        </div>
        {subtask.instructions && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{subtask.instructions}</p>
        )}
        {subtask.notes && (
          <div className="text-xs bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1 text-gray-700 dark:text-yellow-300 mt-1">
            <MessageSquare className="w-3 h-3 inline mr-1" />
            {subtask.notes}
          </div>
        )}
      </div>
    </div>
  );
}
