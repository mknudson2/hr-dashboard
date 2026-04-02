import CriterionRow from './CriterionRow';

interface RubricMap {
  [key: string]: string;
}

interface CriterionTemplate {
  name: string;
  weight: number;
  rubric?: RubricMap;
  suggested_questions?: string[];
  value_description?: string;
}

interface SectionTemplate {
  name: string;
  weight: number;
  description?: string;
  criteria: CriterionTemplate[];
}

interface CriterionRating {
  criteria: string;
  rating: number | null;
  notes: string;
}

interface SectionScore {
  avg: number;
  count: number;
  total: number;
}

interface SectionBlockProps {
  section: SectionTemplate;
  sectionIndex: number;
  criteriaRatings: CriterionRating[];
  sectionScore?: SectionScore;
  onRatingChange: (criterionName: string, rating: number) => void;
  onNotesChange: (criterionName: string, notes: string) => void;
  disabled?: boolean;
}

export default function SectionBlock({
  section, sectionIndex, criteriaRatings, sectionScore,
  onRatingChange, onNotesChange, disabled,
}: SectionBlockProps) {
  const getCriterionRating = (name: string) => criteriaRatings.find(cr => cr.criteria === name);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-visible">
      {/* Section header */}
      <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b dark:border-gray-700 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Domain {sectionIndex + 1}: {section.name}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Weight: {Math.round(section.weight * 100)}%
            </span>
            {sectionScore && sectionScore.count > 0 && (
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Avg: {sectionScore.avg} ({sectionScore.count}/{sectionScore.total})
              </span>
            )}
          </div>
        </div>
        {section.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{section.description}</p>
        )}
      </div>

      {/* Criteria */}
      <div className="px-6">
        {section.criteria.map(criterion => {
          const cr = getCriterionRating(criterion.name);
          if (!cr) return null;
          return (
            <CriterionRow
              key={criterion.name}
              name={criterion.name}
              weight={criterion.weight}
              valueDescription={criterion.value_description}
              rubric={criterion.rubric}
              suggestedQuestions={criterion.suggested_questions}
              rating={cr.rating}
              notes={cr.notes}
              onRatingChange={r => onRatingChange(criterion.name, r)}
              onNotesChange={n => onNotesChange(criterion.name, n)}
              disabled={disabled}
            />
          );
        })}
      </div>

      {/* Section subtotal */}
      {sectionScore && sectionScore.count > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-3 border-t dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Domain {sectionIndex + 1} Weighted Score (avg {sectionScore.avg} x {section.weight.toFixed(2)}):
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {(sectionScore.avg * section.weight).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
