import { AlertTriangle } from 'lucide-react';

interface RedFlagChecklistProps {
  flags: string[];
  checked: Record<number, boolean>;
  onChange: (index: number, value: boolean) => void;
  disabled?: boolean;
}

export default function RedFlagChecklist({ flags, checked, onChange, disabled }: RedFlagChecklistProps) {
  const anyFlagged = Object.values(checked).some(Boolean);

  return (
    <div className={`rounded-lg border p-6 space-y-3 ${
      anyFlagged
        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
        <AlertTriangle className={`w-5 h-5 ${anyFlagged ? 'text-red-500' : 'text-gray-400'}`} />
        Red Flag / Knockout Indicators
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        If ANY of the following are observed, flag immediately regardless of other scores.
      </p>
      <div className="space-y-2">
        {flags.map((flag, i) => (
          <label key={i} className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={e => onChange(i, e.target.checked)}
              disabled={disabled}
              className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className={`text-sm ${checked[i] ? 'text-red-700 dark:text-red-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
              {flag}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
