interface RecommendationThreshold {
  min: number;
  max: number;
  label: string;
  action: string;
}

const STANDARD_RECOMMENDATIONS = [
  { value: 'Strong Hire', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' },
  { value: 'Hire', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
  { value: 'Lean Hire', color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' },
  { value: 'Lean No Hire', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
  { value: 'No Hire', color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' },
];

const THRESHOLD_COLORS: Record<string, string> = {
  'Strong Advance': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
  'Advance': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  'Hold / Discuss': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  'Do Not Advance': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
};

interface RecommendationPickerProps {
  recommendation: string;
  onChange: (value: string) => void;
  /** If provided, uses threshold-based picking with score ranges. Otherwise uses standard recommendations. */
  thresholds?: RecommendationThreshold[];
  suggestedLabel?: string | null;
  disabled?: boolean;
}

export default function RecommendationPicker({
  recommendation, onChange, thresholds, suggestedLabel, disabled,
}: RecommendationPickerProps) {
  if (thresholds && thresholds.length > 0) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recommendation Thresholds</p>
        {thresholds.map((t, i) => {
          const isSelected = recommendation === t.label;
          const isSuggested = !recommendation && suggestedLabel === t.label;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg border transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                isSelected
                  ? (THRESHOLD_COLORS[t.label] || 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 border-blue-200') + ' ring-2 ring-blue-400 ring-offset-1'
                  : isSuggested
                  ? (THRESHOLD_COLORS[t.label] || 'bg-gray-50 border-gray-200') + ' ring-1 ring-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => !disabled && onChange(t.label)}
            >
              <span className="font-semibold w-24">{t.min.toFixed(2)} - {t.max.toFixed(2)}</span>
              <span className="font-medium w-32">{t.label}</span>
              <span className="flex-1">{t.action}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2">
      {STANDARD_RECOMMENDATIONS.map(rec => (
        <button
          key={rec.value}
          onClick={() => onChange(rec.value)}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
            recommendation === rec.value
              ? rec.color + ' ring-2 ring-offset-1 ring-blue-400'
              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {rec.value}
        </button>
      ))}
    </div>
  );
}
