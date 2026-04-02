interface RubricMap {
  [key: string]: string;
}

interface RatingButtonsProps {
  rating: number | null;
  onChange: (rating: number) => void;
  rubric?: RubricMap;
  disabled?: boolean;
}

export default function RatingButtons({ rating, onChange, rubric, disabled }: RatingButtonsProps) {
  const hasRubric = rubric && Object.keys(rubric).length > 0;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(value => (
        <div key={value} className="relative group">
          <button
            onClick={() => onChange(value)}
            disabled={disabled}
            className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
              rating === value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-700 dark:text-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {value}
          </button>
          {hasRubric && rubric[String(value)] && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md text-white text-xs rounded-lg shadow-xl ring-1 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="font-semibold mb-0.5">Rating {value}</div>
              {rubric[String(value)]}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 dark:bg-gray-800/95 rotate-45 -mt-1" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
