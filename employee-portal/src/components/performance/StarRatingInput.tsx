import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

const ratingLabels: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectations',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
};

export default function StarRatingInput({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showLabel = false,
}: StarRatingInputProps) {
  const [hover, setHover] = useState(0);

  const iconSize = sizeMap[size];
  const displayValue = hover || value;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`p-0.5 ${
              disabled
                ? 'cursor-default'
                : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
            }`}
            aria-label={`Rate ${star} stars`}
          >
            <Star
              size={iconSize}
              className={`transition-colors duration-150 ${
                star <= displayValue
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400 w-36 text-left">
          {displayValue > 0 ? ratingLabels[displayValue] : '\u00A0'}
        </span>
      )}
    </div>
  );
}
