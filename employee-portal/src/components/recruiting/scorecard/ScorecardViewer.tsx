import { Star, AlertTriangle } from 'lucide-react';

interface RubricMap {
  [key: string]: string;
}

interface CriterionData {
  name: string;
  weight?: number;
  rubric?: RubricMap;
}

interface SectionData {
  name: string;
  weight: number;
  criteria: CriterionData[];
}

interface CriterionRating {
  criteria: string;
  rating: number | null;
  notes: string;
}

interface ScorecardViewerProps {
  applicantName: string;
  stageName?: string;
  interviewerName?: string;
  overallRating: number | null;
  recommendation: string | null;
  criteriaRatings: CriterionRating[];
  sections?: SectionData[];
  strengths?: string | null;
  concerns?: string | null;
  additionalNotes?: string | null;
  submittedAt?: string | null;
}

const recommendationColors: Record<string, string> = {
  'Strong Hire': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Hire': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Strong Advance': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Advance': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Lean Hire': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Hold / Discuss': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Lean No Hire': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'No Hire': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Do Not Advance': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function ratingColor(rating: number | null): string {
  if (rating === null) return 'text-gray-400';
  if (rating >= 4) return 'text-green-600 dark:text-green-400';
  if (rating >= 3) return 'text-blue-600 dark:text-blue-400';
  if (rating >= 2) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export default function ScorecardViewer({
  applicantName, stageName, interviewerName, overallRating, recommendation,
  criteriaRatings, sections, strengths, concerns, additionalNotes, submittedAt,
}: ScorecardViewerProps) {
  const hasSections = sections && sections.length > 0;

  // Compute section averages if we have sections
  const sectionAvgs = hasSections
    ? sections.map(section => {
        let sum = 0;
        let count = 0;
        section.criteria.forEach(c => {
          const cr = criteriaRatings.find(r => r.criteria === c.name);
          if (cr?.rating) { sum += cr.rating; count++; }
        });
        return count > 0 ? sum / count : 0;
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{applicantName}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {stageName && <span>{stageName}</span>}
            {interviewerName && <span>by {interviewerName}</span>}
          </div>
          {submittedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Submitted {new Date(submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {overallRating !== null && (
            <div className="flex items-center gap-1">
              <Star className={`w-5 h-5 ${ratingColor(overallRating)}`} fill="currentColor" />
              <span className={`text-lg font-bold ${ratingColor(overallRating)}`}>
                {overallRating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">/5</span>
            </div>
          )}
          {recommendation && (
            <span className={`px-2.5 py-1 rounded text-xs font-medium ${recommendationColors[recommendation] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
              {recommendation}
            </span>
          )}
        </div>
      </div>

      {/* Sections / Criteria */}
      {hasSections ? (
        <div className="space-y-3">
          {sections.map((section, si) => (
            <div key={section.name} className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{section.name}</span>
                <span className={`text-sm font-medium ${ratingColor(sectionAvgs[si])}`}>
                  {sectionAvgs[si] > 0 ? sectionAvgs[si].toFixed(1) : '—'}
                </span>
              </div>
              <div className="px-4 py-2 space-y-1.5">
                {section.criteria.map(criterion => {
                  const cr = criteriaRatings.find(r => r.criteria === criterion.name);
                  return (
                    <div key={criterion.name} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-700 dark:text-gray-300">{criterion.name}</span>
                      <div className="flex items-center gap-2">
                        {cr?.rating ? (
                          <span className={`font-medium ${ratingColor(cr.rating)}`}>{cr.rating}/5</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                        {cr?.notes && (
                          <span className="text-xs text-gray-400 max-w-48 truncate" title={cr.notes}>
                            {cr.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : criteriaRatings.length > 0 ? (
        <div className="border dark:border-gray-700 rounded-lg p-4 space-y-1.5">
          {criteriaRatings.map(cr => (
            <div key={cr.criteria} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700 dark:text-gray-300">{cr.criteria}</span>
              <div className="flex items-center gap-2">
                {cr.rating ? (
                  <span className={`font-medium ${ratingColor(cr.rating)}`}>{cr.rating}/5</span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Feedback */}
      {(strengths || concerns || additionalNotes) && (
        <div className="space-y-2">
          {strengths && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Strengths</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{strengths}</p>
            </div>
          )}
          {concerns && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Concerns</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{concerns}</p>
              {concerns.includes('RED FLAGS') && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> Red flags observed
                </div>
              )}
            </div>
          )}
          {additionalNotes && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Additional Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{additionalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
