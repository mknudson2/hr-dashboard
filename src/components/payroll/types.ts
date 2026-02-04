export interface NoteHistoryEntry {
  timestamp: string;
  user: string;
  old_value: string | null;
  new_value: string;
  field: string;
}

export interface PayrollTask {
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

export interface PayrollPeriod {
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

export interface NoteItem {
  id: string;
  type: 'period' | 'task';
  title: string;
  content: string;
  timestamp: string;
  user: string;
}
