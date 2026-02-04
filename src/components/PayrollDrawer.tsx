import { useState, useEffect, useRef } from 'react';
import { X, Calendar, DollarSign, FileText, CheckCircle, ChevronDown, ChevronRight, Mail, Settings, MessageSquare, Pencil, Trash2, FileDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportPayrollToPDF, formatDateForPDF, formatTimestampForPDF } from '../utils/pdfExportUtils';
import type { PayrollPDFData } from '../utils/pdfExportUtils';

const BASE_URL = '';

interface NoteHistoryEntry {
  timestamp: string;
  user: string;
  old_value: string | null;
  new_value: string;
  field: string;
}

interface PayrollTask {
  id: number;
  payroll_period_id: number;
  title: string;
  description: string | null;
  task_type: string;
  order_index: number;
  parent_task_id: number | null;
  instructions: string | null;
  path_reference: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  has_toggle: boolean;
  toggle_value: boolean | null;
  toggle_label: string | null;
  has_email_button: boolean;
  email_template_name: string | null;
  notes: string | null;
  notes_history: NoteHistoryEntry[] | null;
  subtasks: PayrollTask[];
}

interface PayrollPeriod {
  id: number;
  year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  payday: string;
  status: string;
  employer_funding: boolean;
  notes: string | null;
  notes_history: { notes?: NoteHistoryEntry[] } | null;
  created_at: string;
  updated_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  tasks: PayrollTask[];
}

interface PayrollDrawerProps {
  open: boolean;
  onClose: () => void;
  period: PayrollPeriod;
}

export default function PayrollDrawer({ open, onClose, period: initialPeriod }: PayrollDrawerProps) {
  const [period, setPeriod] = useState<PayrollPeriod>(initialPeriod);
  const [employerFunding, setEmployerFunding] = useState(initialPeriod.employer_funding);
  const [periodNotes, setPeriodNotes] = useState(initialPeriod.notes || '');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [showTaskNotes, setShowTaskNotes] = useState<number | null>(null);
  const [taskNoteText, setTaskNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingPeriodNotes, setSavingPeriodNotes] = useState(false);
  const [periodNotesSaved, setPeriodNotesSaved] = useState(false);
  const [checkedNotes, setCheckedNotes] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const getRequestOptions = (method: string = 'GET', body?: any) => {
    const options: RequestInit = {
      method,
      credentials: 'include',
    };
    if (body) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    return options;
  };

  useEffect(() => {
    setPeriod(initialPeriod);
    setEmployerFunding(initialPeriod.employer_funding);
    setPeriodNotes(''); // Always start with empty textarea (notes display in history below)
    // Auto-expand all main tasks
    const mainTaskIds = initialPeriod.tasks.filter(t => t.task_type === 'main').map(t => t.id);
    setExpandedTasks(new Set(mainTaskIds));

    // Sync "Funding Insurance?" toggle with employer_funding
    const syncFundingToggle = async () => {
      const allTasks = initialPeriod.tasks.flatMap(t => [t, ...t.subtasks]);
      const fundingTask = allTasks.find(t => t.has_toggle && t.title === 'Funding Insurance?');

      if (fundingTask && fundingTask.toggle_value !== initialPeriod.employer_funding) {
        try {
          await fetch(`${BASE_URL}/payroll/tasks/${fundingTask.id}`, getRequestOptions('PATCH', { toggle_value: initialPeriod.employer_funding }));
        } catch (error) {
          console.error('Error syncing funding toggle:', error);
        }
      }
    };

    syncFundingToggle();
  }, [initialPeriod]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const refreshPeriod = async () => {
    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPeriod(data);
        setEmployerFunding(data.employer_funding);
        // Don't populate periodNotes - keep textarea empty for new notes only
      }
    } catch (error) {
      console.error('Error refreshing period:', error);
    }
  };

  const handleEmployerFundingChange = async () => {
    const newValue = !employerFunding;
    setEmployerFunding(newValue);

    try {
      // Update the period's employer_funding
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}`, getRequestOptions('PATCH', { employer_funding: newValue }));

      if (response.ok) {
        // Also update the "Funding Insurance?" toggle to match
        const allTasks = period.tasks.flatMap(t => [t, ...t.subtasks]);
        const fundingTask = allTasks.find(t => t.has_toggle && t.title === 'Funding Insurance?');

        if (fundingTask) {
          await fetch(`${BASE_URL}/payroll/tasks/${fundingTask.id}`, getRequestOptions('PATCH', { toggle_value: newValue }));
        }

        await refreshPeriod();
      } else {
        setEmployerFunding(!newValue); // Revert on error
      }
    } catch (error) {
      console.error('Error updating employer funding:', error);
      setEmployerFunding(!newValue);
    }
  };

  const handleSavePeriodNotes = async () => {
    if (!periodNotes.trim()) {
      return; // Don't save empty notes
    }

    setSavingPeriodNotes(true);
    setPeriodNotesSaved(false);

    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}`, getRequestOptions('PATCH', { notes: periodNotes }));

      if (response.ok) {
        await refreshPeriod();
        setPeriodNotes(''); // Clear the textarea after successful save
        setPeriodNotesSaved(true);

        // Hide success message after 3 seconds
        setTimeout(() => setPeriodNotesSaved(false), 3000);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error saving period notes:', error);
    } finally {
      setSavingPeriodNotes(false);
    }
  };

  const handleNoteCheckChange = (noteId: string, checked: boolean) => {
    const newCheckedNotes = new Set(checkedNotes);
    if (checked) {
      newCheckedNotes.add(noteId);
    } else {
      newCheckedNotes.delete(noteId);
    }
    setCheckedNotes(newCheckedNotes);
  };

  const handleEditNote = async (noteIndex: number, newValue: string) => {
    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}/notes/${noteIndex}`, getRequestOptions('PATCH', { new_value: newValue }));

      if (response.ok) {
        await refreshPeriod();
        setEditingNoteId(null);
        setEditingNoteText('');
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}/notes/${noteIndex}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await refreshPeriod();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleTaskCheck = async (task: PayrollTask, checked: boolean) => {
    try {
      const response = await fetch(`${BASE_URL}/payroll/tasks/${task.id}`, getRequestOptions('PATCH', { completed: checked }));

      if (response.ok) {
        await refreshPeriod();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleToggleChange = async (task: PayrollTask, value: boolean) => {
    try {
      const response = await fetch(`${BASE_URL}/payroll/tasks/${task.id}`, getRequestOptions('PATCH', { toggle_value: value }));

      if (response.ok) {
        await refreshPeriod();
      }
    } catch (error) {
      console.error('Error updating toggle:', error);
    }
  };

  const handleSaveTaskNotes = async (taskId: number) => {
    setSavingNote(true);
    setNoteSaved(false);

    try {
      const response = await fetch(`${BASE_URL}/payroll/tasks/${taskId}`, getRequestOptions('PATCH', { notes: taskNoteText }));

      if (response.ok) {
        await refreshPeriod();
        setShowTaskNotes(null);
        setTaskNoteText('');
        setNoteSaved(true);

        // Hide success message after 3 seconds
        setTimeout(() => setNoteSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving task notes:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSendEmail = async (emailTemplate: string) => {
    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}/send-email/${emailTemplate}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        alert('Email sent successfully!');
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const toggleTaskExpanded = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleMarkAsComplete = async () => {
    if (!confirm('Are you sure you want to mark this payroll period as complete?')) {
      return;
    }

    setMarkingComplete(true);

    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${period.id}`, getRequestOptions('PATCH', { status: 'completed' }));

      if (response.ok) {
        await refreshPeriod();
      } else {
        console.error('Error marking period as complete:', await response.text());
      }
    } catch (error) {
      console.error('Error marking period as complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleExportPDF = async () => {
    if (!pdfContentRef.current) return;

    setExportingPDF(true);

    // Temporarily make the hidden container visible for html2canvas
    const container = pdfContentRef.current;
    const originalStyle = container.style.cssText;
    container.style.cssText = 'position: absolute; left: 0; top: 0; width: 800px; background: white; color: black; padding: 32px; font-family: Arial, sans-serif; z-index: 9999;';

    // Small delay to ensure styles are applied
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Gather all notes for the PDF
      const allNotes: PayrollPDFData['notesHistory'] = [];

      // Add period notes
      if (period.notes_history?.notes) {
        period.notes_history.notes.forEach(entry => {
          allNotes.push({
            title: 'Payroll Period Notes',
            content: entry.new_value,
            timestamp: entry.timestamp,
            user: entry.user,
            type: 'period'
          });
        });
      }

      // Add task notes
      const allTasks = period.tasks.flatMap(t => [t, ...t.subtasks]);
      allTasks.forEach(task => {
        if (task.notes_history) {
          task.notes_history.forEach(entry => {
            allNotes.push({
              title: task.title,
              content: entry.new_value,
              timestamp: entry.timestamp,
              user: entry.user,
              type: 'task'
            });
          });
        }
      });

      // Sort notes by timestamp (newest first)
      allNotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const pdfData: PayrollPDFData = {
        periodNumber: period.period_number,
        year: period.year,
        startDate: period.start_date,
        endDate: period.end_date,
        payday: period.payday,
        status: period.status,
        progress: calculateProgress(),
        employerFunding: employerFunding,
        processedAt: period.processed_at,
        tasks: period.tasks.map(task => ({
          id: task.id,
          title: task.title,
          completed: task.completed,
          completedAt: task.completed_at,
          completedBy: task.completed_by,
          description: task.description,
          instructions: task.instructions,
          pathReference: task.path_reference,
          notes: task.notes,
          hasToggle: task.has_toggle,
          toggleValue: task.toggle_value,
          toggleLabel: task.toggle_label,
          subtasks: task.subtasks.map(sub => ({
            id: sub.id,
            title: sub.title,
            completed: sub.completed,
            completedAt: sub.completed_at,
            completedBy: sub.completed_by,
            instructions: sub.instructions,
            pathReference: sub.path_reference,
            notes: sub.notes,
            hasToggle: sub.has_toggle,
            toggleValue: sub.toggle_value,
            toggleLabel: sub.toggle_label,
          }))
        })),
        notesHistory: allNotes
      };

      await exportPayrollToPDF(pdfData, pdfContentRef.current);
    } catch (error: any) {
      console.error('PDF export failed:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      alert(`Failed to export PDF: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      // Restore original hidden style
      container.style.cssText = originalStyle;
      setExportingPDF(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateProgress = () => {
    const allTasks = period.tasks.flatMap(t => [t, ...t.subtasks]);
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.completed).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Payroll Period {period.period_number} - {period.year}
                </h2>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Payday: {formatDate(period.payday)}
                  </span>
                </div>
                {/* Progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Overall Progress</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        calculateProgress() === 100 ? 'bg-green-600 dark:bg-green-500' : 'bg-blue-600 dark:bg-blue-500'
                      }`}
                      style={{ width: `${calculateProgress()}%` }}
                    ></div>
                  </div>
                </div>
                {/* Mark as Complete button - only show when 100% and not already completed */}
                {calculateProgress() === 100 && period.status !== 'completed' && (
                  <div className="mt-3">
                    <button
                      onClick={handleMarkAsComplete}
                      disabled={markingComplete}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {markingComplete ? 'Marking Complete...' : 'Mark Payroll as Complete'}
                    </button>
                  </div>
                )}
                {/* Show completed status */}
                {period.status === 'completed' && (
                  <div className="mt-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Payroll Completed</span>
                    {period.processed_at && (
                      <span className="text-sm ml-auto">
                        {new Date(period.processed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 ml-4">
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  {exportingPDF ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Employer Funding Toggle */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Employer Funding</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Fund employer portion of medical insurance this period
                    </p>
                  </div>
                  <button
                    onClick={handleEmployerFundingChange}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      employerFunding ? 'bg-green-600' : 'bg-red-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        employerFunding ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Period Notes */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Payroll Notes</h3>
                {periodNotesSaved && (
                  <div className="mb-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm text-green-800 dark:text-green-400">
                    ✓ Notes saved successfully!
                  </div>
                )}
                <textarea
                  value={periodNotes}
                  onChange={(e) => setPeriodNotes(e.target.value)}
                  placeholder="Add notes for this payroll period..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={savingPeriodNotes}
                />
                <button
                  onClick={handleSavePeriodNotes}
                  disabled={savingPeriodNotes}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPeriodNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              {/* All Notes History (Period + Task Notes) */}
              {(() => {
                const allNotes = [];

                // Add period notes from notes_history
                if (period.notes_history?.notes) {
                  const periodNotes = period.notes_history.notes.map((entry, idx) => ({
                    id: `period-${period.id}-${idx}-${entry.timestamp}`,
                    type: 'period',
                    title: 'Payroll Period Notes',
                    content: entry.new_value,
                    timestamp: entry.timestamp,
                    user: entry.user
                  }));
                  allNotes.push(...periodNotes);
                }

                // Add task notes from notes_history
                const allTasks = period.tasks.flatMap(t => [t, ...t.subtasks]);
                const taskNotes = allTasks.flatMap(task =>
                  (task.notes_history || []).map((entry, idx) => ({
                    id: `task-${task.id}-${idx}-${entry.timestamp}`,
                    type: 'task',
                    title: task.title,
                    content: entry.new_value,
                    timestamp: entry.timestamp,
                    user: entry.user
                  }))
                );

                allNotes.push(...taskNotes);

                // Sort by timestamp (newest first)
                allNotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                return (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Notes History</h3>
                    {(noteSaved || periodNotesSaved) && (
                      <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm text-green-800 dark:text-green-400">
                        ✓ Note saved successfully!
                      </div>
                    )}
                    {allNotes.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No notes yet. Add a note above to get started.</p>
                    ) : (
                      <div className="space-y-2">
                      {allNotes.map((note, index) => {
                        const isChecked = checkedNotes.has(note.id);
                        const isEditing = editingNoteId === note.id;
                        return (
                          <div key={note.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleNoteCheckChange(note.id, e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
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
                                      {new Date(note.timestamp).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                    {note.type === 'period' && (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingNoteId(note.id);
                                            setEditingNoteText(note.content);
                                          }}
                                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                          title="Edit note"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteNote(index)}
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
                                        onClick={() => handleEditNote(index, editingNoteText)}
                                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingNoteId(null);
                                          setEditingNoteText('');
                                        }}
                                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className={`text-sm ${isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {note.content}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Added by {note.user}</p>
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
              })()}

              {/* Task Checklist */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Payroll Checklist</h3>
                {period.tasks.map((task) => (
                  <div key={task.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {/* Main Task */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => handleTaskCheck(task, e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                {task.title}
                              </h4>
                              {task.path_reference && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                  {task.path_reference}
                                </span>
                              )}
                              {task.has_email_button && (
                                <button
                                  onClick={() => handleSendEmail(task.email_template_name!)}
                                  className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
                                >
                                  <Mail className="w-3 h-3" />
                                  Send Email
                                </button>
                              )}
                            </div>
                            {task.subtasks.length > 0 && (
                              <button
                                onClick={() => toggleTaskExpanded(task.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                {expandedTasks.has(task.id) ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
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
                            {showTaskNotes === task.id ? (
                              <div>
                                <textarea
                                  value={taskNoteText}
                                  onChange={(e) => setTaskNoteText(e.target.value)}
                                  placeholder="Add notes for this task..."
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  rows={2}
                                />
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => handleSaveTaskNotes(task.id)}
                                    disabled={savingNote}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {savingNote ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowTaskNotes(null);
                                      setTaskNoteText('');
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
                                  onClick={() => {
                                    setShowTaskNotes(task.id);
                                    setTaskNoteText(task.notes || '');
                                  }}
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
                      {expandedTasks.has(task.id) && task.subtasks.length > 0 && (
                        <div className="ml-8 mt-3 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                          {task.subtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={subtask.completed}
                                onChange={(e) => handleTaskCheck(subtask, e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className={`text-sm ${subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {subtask.title}
                                  </h5>
                                  {subtask.path_reference && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                      {subtask.path_reference}
                                    </span>
                                  )}
                                  {subtask.has_email_button && (
                                    <button
                                      onClick={() => handleSendEmail(subtask.email_template_name!)}
                                      className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1"
                                    >
                                      <Mail className="w-3 h-3" />
                                      Send
                                    </button>
                                  )}
                                  {subtask.has_toggle && (
                                    <div className="flex items-center gap-2 ml-2">
                                      <div
                                        className={`relative inline-flex h-4 w-8 items-center rounded-full ${
                                          subtask.toggle_value ? 'bg-green-600' : 'bg-red-600'
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                            subtask.toggle_value ? 'translate-x-4' : 'translate-x-0.5'
                                          }`}
                                        />
                                      </div>
                                    </div>
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
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Hidden PDF Content Container - using inline styles to avoid oklch color issues with html2canvas */}
          <div
            ref={pdfContentRef}
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
              width: '800px',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '32px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {/* PDF Header */}
            <div style={{ borderBottom: '2px solid #d1d5db', paddingBottom: '16px', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                Payroll Period {period.period_number} - {period.year}
              </h1>
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563' }}>
                <p style={{ margin: '4px 0' }}>Date Range: {formatDate(period.start_date)} - {formatDate(period.end_date)}</p>
                <p style={{ margin: '4px 0' }}>Payday: {formatDate(period.payday)}</p>
                <p style={{ margin: '4px 0' }}>Exported: {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* PDF Status Section */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px', marginTop: 0 }}>Status</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#4b5563' }}>Progress:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '500' }}>{calculateProgress()}%</span>
                </div>
                <div>
                  <span style={{ color: '#4b5563' }}>Status:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '500', color: period.status === 'completed' ? '#059669' : '#2563eb' }}>
                    {period.status === 'completed' ? 'Completed' : period.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#4b5563' }}>Employer Funding:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '500', color: employerFunding ? '#059669' : '#dc2626' }}>
                    {employerFunding ? 'Yes' : 'No'}
                  </span>
                </div>
                {period.processed_at && (
                  <div>
                    <span style={{ color: '#4b5563' }}>Completed On:</span>
                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>{new Date(period.processed_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PDF Checklist Section */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb', marginTop: 0 }}>Payroll Checklist</h2>
              {period.tasks.map((task) => (
                <div key={task.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{task.completed ? '☑' : '☐'}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: '500', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#6b7280' : '#111827' }}>
                        {task.title}
                      </span>
                      {task.path_reference && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '4px' }}>
                          {task.path_reference}
                        </span>
                      )}
                      {task.completed && task.completed_at && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
                          (Completed: {new Date(task.completed_at).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  </div>
                  {task.description && (
                    <p style={{ marginLeft: '26px', fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>{task.description}</p>
                  )}
                  {task.notes && (
                    <p style={{ marginLeft: '26px', fontSize: '14px', color: '#92400e', backgroundColor: '#fefce8', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
                      Note: {task.notes}
                    </p>
                  )}
                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div style={{ marginLeft: '32px', marginTop: '8px', borderLeft: '2px solid #e5e7eb', paddingLeft: '12px' }}>
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px' }}>{subtask.completed ? '☑' : '☐'}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '14px', textDecoration: subtask.completed ? 'line-through' : 'none', color: subtask.completed ? '#6b7280' : '#374151' }}>
                              {subtask.title}
                            </span>
                            {subtask.has_toggle && (
                              <span style={{ marginLeft: '8px', fontSize: '12px', color: subtask.toggle_value ? '#059669' : '#dc2626' }}>
                                [{subtask.toggle_label || 'Toggle'}: {subtask.toggle_value ? 'Yes' : 'No'}]
                              </span>
                            )}
                            {subtask.completed && subtask.completed_at && (
                              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
                                (Completed: {new Date(subtask.completed_at).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PDF Notes Section */}
            {(() => {
              const allNotes: Array<{ title: string; content: string; timestamp: string; user: string; type: string }> = [];

              if (period.notes_history?.notes) {
                period.notes_history.notes.forEach(entry => {
                  allNotes.push({
                    title: 'Payroll Period Notes',
                    content: entry.new_value,
                    timestamp: entry.timestamp,
                    user: entry.user,
                    type: 'period'
                  });
                });
              }

              const allTasks = period.tasks.flatMap(t => [t, ...t.subtasks]);
              allTasks.forEach(task => {
                if (task.notes_history) {
                  task.notes_history.forEach(entry => {
                    allNotes.push({
                      title: task.title,
                      content: entry.new_value,
                      timestamp: entry.timestamp,
                      user: entry.user,
                      type: 'task'
                    });
                  });
                }
              });

              allNotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

              if (allNotes.length === 0) return null;

              return (
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb', marginTop: 0 }}>Notes History</h2>
                  {allNotes.map((note, index) => (
                    <div key={index} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>{note.title}</span>
                        {note.type === 'period' && (
                          <span style={{ fontSize: '12px', backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '2px 4px', borderRadius: '4px' }}>Period Note</span>
                        )}
                      </div>
                      <p style={{ fontSize: '14px', color: '#374151', margin: '4px 0' }}>{note.content}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                        Added by {note.user} on {new Date(note.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* PDF Footer */}
            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #d1d5db', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              Generated from HR Dashboard - {new Date().toLocaleString()}
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
