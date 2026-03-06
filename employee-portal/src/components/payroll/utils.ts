import type { PayrollPeriod, PayrollTask, NoteItem } from './types';

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function calculateProgress(period: PayrollPeriod): number {
  const allTasks = period.tasks.flatMap(t => [t, ...t.subtasks]);
  if (allTasks.length === 0) return 0;
  const completed = allTasks.filter(t => t.completed).length;
  return Math.round((completed / allTasks.length) * 100);
}

export function getAllTasks(period: PayrollPeriod): PayrollTask[] {
  return period.tasks.flatMap(t => [t, ...t.subtasks]);
}

export function collectAllNotes(period: PayrollPeriod): NoteItem[] {
  const allNotes: NoteItem[] = [];

  if (period.notes_history?.notes) {
    const periodNotes = period.notes_history.notes.map((entry, idx) => ({
      id: `period-${period.id}-${idx}-${entry.timestamp}`,
      type: 'period' as const,
      title: 'Payroll Period Notes',
      content: entry.new_value,
      timestamp: entry.timestamp,
      user: entry.user
    }));
    allNotes.push(...periodNotes);
  }

  const allTasks = getAllTasks(period);
  const taskNotes = allTasks.flatMap(task =>
    (task.notes_history || []).map((entry, idx) => ({
      id: `task-${task.id}-${idx}-${entry.timestamp}`,
      type: 'task' as const,
      title: task.title,
      content: entry.new_value,
      timestamp: entry.timestamp,
      user: entry.user
    }))
  );

  allNotes.push(...taskNotes);
  allNotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return allNotes;
}
