import StarRatingInput from './StarRatingInput';

interface RatingCategoryProps {
  label: string;
  description?: string;
  value: number;
  onChange: (rating: number) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function RatingCategory({
  label,
  description,
  value,
  onChange,
  required = false,
  disabled = false,
}: RatingCategoryProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
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
        />
      </div>
    </div>
  );
}
