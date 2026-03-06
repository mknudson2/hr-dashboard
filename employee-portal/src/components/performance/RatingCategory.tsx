import StarRatingInput from './StarRatingInput';

interface RatingCategoryProps {
  label: string;
  description?: string;
  value: number;
  onChange: (rating: number) => void;
  required?: boolean;
  disabled?: boolean;
  maxStars?: number;
  note?: string;
  onNoteChange?: (note: string) => void;
}

export default function RatingCategory({
  label,
  description,
  value,
  onChange,
  required = false,
  disabled = false,
  maxStars,
  note,
  onNoteChange,
}: RatingCategoryProps) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{label}</span>
            {required && <span className="text-red-500">*</span>}
          </div>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <StarRatingInput
            value={value}
            onChange={onChange}
            disabled={disabled}
            size="md"
            showLabel
            maxStars={maxStars}
          />
        </div>
      </div>
      {onNoteChange !== undefined && (
        <textarea
          value={note || ''}
          onChange={(e) => onNoteChange?.(e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none"
          placeholder={`Brief note on ${label.toLowerCase()} rating...`}
        />
      )}
    </div>
  );
}
