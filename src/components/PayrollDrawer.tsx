import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportPayrollToPDF } from '../utils/pdfExportUtils';
import type { PayrollPDFData } from '../utils/pdfExportUtils';

import {
  PayrollDrawerHeader,
  EmployerFundingToggle,
  PeriodNotesSection,
  NotesHistorySection,
  PayrollTaskItem,
  usePayrollApi,
  collectAllNotes,
  calculateProgress,
  formatDate,
  getAllTasks,
} from './payroll';
import type { PayrollPeriod, PayrollTask } from './payroll';

interface PayrollDrawerProps {
  open: boolean;
  onClose: () => void;
  period: PayrollPeriod;
}

export default function PayrollDrawer({ open, onClose, period: initialPeriod }: PayrollDrawerProps) {
  const [period, setPeriod] = useState<PayrollPeriod>(initialPeriod);
  const [employerFunding, setEmployerFunding] = useState(initialPeriod.employer_funding);
  const [periodNotes, setPeriodNotes] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [savingPeriodNotes, setSavingPeriodNotes] = useState(false);
  const [periodNotesSaved, setPeriodNotesSaved] = useState(false);
  const [checkedNotes, setCheckedNotes] = useState<Set<string>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const api = usePayrollApi(period.id);

  // Initialize and sync on period change
  useEffect(() => {
    setPeriod(initialPeriod);
    setEmployerFunding(initialPeriod.employer_funding);
    setPeriodNotes('');

    // Auto-expand all main tasks
    const mainTaskIds = initialPeriod.tasks.filter(t => t.task_type === 'main').map(t => t.id);
    setExpandedTasks(new Set(mainTaskIds));

    // Sync funding toggle with period setting
    const syncFundingToggle = async () => {
      const allTasks = getAllTasks(initialPeriod);
      const fundingTask = allTasks.find(t => t.has_toggle && t.title === 'Funding Insurance?');

      if (fundingTask && fundingTask.toggle_value !== initialPeriod.employer_funding) {
        await api.updateTask(fundingTask.id, { toggle_value: initialPeriod.employer_funding });
      }
    };

    syncFundingToggle();
  }, [initialPeriod, api]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const refreshPeriod = async () => {
    const data = await api.fetchPeriod();
    if (data) {
      setPeriod(data);
      setEmployerFunding(data.employer_funding);
    }
  };

  const handleEmployerFundingChange = async () => {
    const newValue = !employerFunding;
    setEmployerFunding(newValue);

    const success = await api.updatePeriod({ employer_funding: newValue });
    if (success) {
      const allTasks = getAllTasks(period);
      const fundingTask = allTasks.find(t => t.has_toggle && t.title === 'Funding Insurance?');
      if (fundingTask) {
        await api.updateTask(fundingTask.id, { toggle_value: newValue });
      }
      await refreshPeriod();
    } else {
      setEmployerFunding(!newValue);
    }
  };

  const handleSavePeriodNotes = async () => {
    if (!periodNotes.trim()) return;

    setSavingPeriodNotes(true);
    setPeriodNotesSaved(false);

    const success = await api.updatePeriod({ notes: periodNotes });
    if (success) {
      await refreshPeriod();
      setPeriodNotes('');
      setPeriodNotesSaved(true);
      setTimeout(() => setPeriodNotesSaved(false), 3000);
    }

    setSavingPeriodNotes(false);
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
    const success = await api.editNote(noteIndex, newValue);
    if (success) await refreshPeriod();
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const success = await api.deleteNote(noteIndex);
    if (success) await refreshPeriod();
  };

  const handleTaskCheck = async (task: PayrollTask, checked: boolean) => {
    const success = await api.updateTask(task.id, { completed: checked });
    if (success) await refreshPeriod();
  };

  const handleToggleChange = async (task: PayrollTask, value: boolean) => {
    const success = await api.updateTask(task.id, { toggle_value: value });
    if (success) await refreshPeriod();
  };

  const handleSaveTaskNotes = async (taskId: number, notes: string) => {
    const success = await api.updateTask(taskId, { notes });
    if (success) {
      await refreshPeriod();
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    }
  };

  const handleSendEmail = async (emailTemplate: string) => {
    const success = await api.sendEmail(emailTemplate);
    if (success) {
      alert('Email sent successfully!');
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
    if (!confirm('Are you sure you want to mark this payroll period as complete?')) return;

    setMarkingComplete(true);
    const success = await api.updatePeriod({ status: 'completed' });
    if (success) await refreshPeriod();
    setMarkingComplete(false);
  };

  const handleExportPDF = async () => {
    if (!pdfContentRef.current) return;

    setExportingPDF(true);
    const container = pdfContentRef.current;
    const originalStyle = container.style.cssText;
    container.style.cssText = 'position: absolute; left: 0; top: 0; width: 800px; background: white; color: black; padding: 32px; font-family: Arial, sans-serif; z-index: 9999;';

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const allNotes = collectAllNotes(period).map(note => ({
        title: note.title,
        content: note.content,
        timestamp: note.timestamp,
        user: note.user,
        type: note.type
      }));

      const pdfData: PayrollPDFData = {
        periodNumber: period.period_number,
        year: period.year,
        startDate: period.start_date,
        endDate: period.end_date,
        payday: period.payday,
        status: period.status,
        progress: calculateProgress(period),
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

      await exportPayrollToPDF(pdfData, container);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('PDF export failed:', error);
      alert(`Failed to export PDF: ${errorMessage}. Please try again.`);
    } finally {
      container.style.cssText = originalStyle;
      setExportingPDF(false);
    }
  };

  if (!open) return null;

  const allNotes = collectAllNotes(period);

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
            <PayrollDrawerHeader
              period={period}
              onClose={onClose}
              onMarkComplete={handleMarkAsComplete}
              onExportPDF={handleExportPDF}
              markingComplete={markingComplete}
              exportingPDF={exportingPDF}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <EmployerFundingToggle
                enabled={employerFunding}
                onChange={handleEmployerFundingChange}
              />

              <PeriodNotesSection
                notes={periodNotes}
                onNotesChange={setPeriodNotes}
                onSave={handleSavePeriodNotes}
                saving={savingPeriodNotes}
                saved={periodNotesSaved}
              />

              <NotesHistorySection
                notes={allNotes}
                checkedNotes={checkedNotes}
                onNoteCheckChange={handleNoteCheckChange}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                showSaveSuccess={noteSaved || periodNotesSaved}
              />

              {/* Task Checklist */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Payroll Checklist</h3>
                {period.tasks.map((task) => (
                  <PayrollTaskItem
                    key={task.id}
                    task={task}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpand={() => toggleTaskExpanded(task.id)}
                    onTaskCheck={handleTaskCheck}
                    onToggleChange={handleToggleChange}
                    onSaveTaskNotes={handleSaveTaskNotes}
                    onSendEmail={handleSendEmail}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Hidden PDF Content */}
          <PDFContent
            ref={pdfContentRef}
            period={period}
            employerFunding={employerFunding}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// PDF Content Component (kept inline due to ref requirements)
import { forwardRef } from 'react';

interface PDFContentProps {
  period: PayrollPeriod;
  employerFunding: boolean;
}

const PDFContent = forwardRef<HTMLDivElement, PDFContentProps>(function PDFContent(
  { period, employerFunding },
  ref
) {
  const progress = calculateProgress(period);
  const allNotes = collectAllNotes(period);

  return (
    <div
      ref={ref}
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
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>{progress}%</span>
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
              <span style={{ fontSize: '18px' }}>{task.completed ? '\u2611' : '\u2610'}</span>
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
            {task.subtasks.length > 0 && (
              <div style={{ marginLeft: '32px', marginTop: '8px', borderLeft: '2px solid #e5e7eb', paddingLeft: '12px' }}>
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{subtask.completed ? '\u2611' : '\u2610'}</span>
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
      {allNotes.length > 0 && (
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
      )}

      {/* PDF Footer */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #d1d5db', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
        Generated from HR Dashboard - {new Date().toLocaleString()}
      </div>
    </div>
  );
});
