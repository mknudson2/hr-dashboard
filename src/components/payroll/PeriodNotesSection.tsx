interface PeriodNotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

export default function PeriodNotesSection({
  notes,
  onNotesChange,
  onSave,
  saving,
  saved
}: PeriodNotesSectionProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Payroll Notes</h3>
      {saved && (
        <div className="mb-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm text-green-800 dark:text-green-400">
          Notes saved successfully!
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Add notes for this payroll period..."
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
        disabled={saving}
      />
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Notes'}
      </button>
    </div>
  );
}
