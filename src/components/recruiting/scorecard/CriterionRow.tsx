import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, MessageSquare } from 'lucide-react';
import RatingButtons from './RatingButtons';

interface RubricMap {
  [key: string]: string;
}

interface CriterionRowProps {
  name: string;
  weight?: number;
  valueDescription?: string;
  rubric?: RubricMap;
  suggestedQuestions?: string[];
  rating: number | null;
  notes: string;
  onRatingChange: (rating: number) => void;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
}

export default function CriterionRow({
  name, weight, valueDescription, rubric, suggestedQuestions,
  rating, notes, onRatingChange, onNotesChange, disabled,
}: CriterionRowProps) {
  const [rubricExpanded, setRubricExpanded] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const hasRubric = rubric && Object.keys(rubric).length > 0;

  return (
    <div className="space-y-2 py-4 border-b dark:border-gray-700 last:border-b-0">
      <div className="flex items-start justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">{name}</label>
          {valueDescription && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{valueDescription}</p>
          )}
        </div>
        {weight != null && (
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
            {Math.round(weight * 100)}%
          </span>
        )}
      </div>

      {/* Suggested questions */}
      {suggestedQuestions && suggestedQuestions.length > 0 && (
        <>
          <button
            onClick={() => setQuestionsExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {questionsExpanded ? 'Hide' : 'Suggested'} questions
            {questionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {questionsExpanded && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 space-y-1">
              {suggestedQuestions.map((q, i) => (
                <p key={i} className="text-xs text-blue-800 dark:text-blue-300 flex gap-2">
                  <span className="text-blue-400">•</span> {q}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      <RatingButtons rating={rating} onChange={onRatingChange} rubric={rubric} disabled={disabled} />

      {/* Selected rubric description */}
      {hasRubric && rating && rubric[String(rating)] && (
        <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Rating {rating}:</span> {rubric[String(rating)]}
          </p>
        </div>
      )}

      {/* Full rubric toggle */}
      {hasRubric && (
        <button
          onClick={() => setRubricExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {rubricExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {rubricExpanded ? 'Hide' : 'View'} full rubric
        </button>
      )}
      {hasRubric && rubricExpanded && (
        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 space-y-1.5 text-xs">
          {[1, 2, 3, 4, 5].map(r =>
            rubric[String(r)] ? (
              <div key={r} className={`flex gap-2 ${rating === r ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="font-medium w-4 flex-shrink-0">{r}.</span>
                <span>{rubric[String(r)]}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Notes */}
      <input
        type="text"
        value={notes}
        onChange={e => onNotesChange(e.target.value)}
        disabled={disabled}
        className="w-full border dark:border-gray-600 rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
        placeholder="Notes for this criterion..."
      />
    </div>
  );
}
