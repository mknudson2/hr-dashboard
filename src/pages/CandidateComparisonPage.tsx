import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Award, Briefcase, Clock } from 'lucide-react';

const BASE_URL = '';

interface ComparisonCandidate {
  id: number;
  application_id: string;
  applicant: {
    name: string;
    email: string;
    current_title: string | null;
    current_employer: string | null;
    years_of_experience: number | null;
  };
  status: string;
  overall_rating: number | null;
  scorecard_count: number;
  recommendation_counts: Record<string, number>;
  is_favorite: boolean;
  submitted_at: string | null;
}

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  Screening: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  Interview: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  Offer: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  Hired: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
  Rejected: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
};

const recommendationOrder = ['Strong Hire', 'Hire', 'Lean Hire', 'Lean No Hire', 'No Hire'];
const recColors: Record<string, string> = {
  'Strong Hire': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  'Hire': 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'Lean Hire': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  'Lean No Hire': 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'No Hire': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

export default function CandidateComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = searchParams.get('ids') || '';

  useEffect(() => {
    if (ids) loadComparison();
  }, [ids]);

  const loadComparison = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/compare?ids=${ids}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Failed to load comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!ids) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No candidate IDs provided for comparison.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Use ?ids=1,2,3 to compare candidates.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-96 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No candidates found for the given IDs.</p>
      </div>
    );
  }

  // Find highest rating for highlighting
  const maxRating = Math.max(...candidates.map(c => c.overall_rating || 0));

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Candidate Comparison</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Comparing {candidates.length} candidate(s) side by side</p>
      </div>

      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {candidates.map(candidate => {
            const isTopRated = candidate.overall_rating === maxRating && maxRating > 0;

            return (
              <div
                key={candidate.id}
                className={`w-72 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden ${
                  isTopRated ? 'ring-2 ring-green-400' : ''
                }`}
              >
                {/* Header */}
                <div className={`p-4 ${isTopRated ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{candidate.applicant.name}</h3>
                    {candidate.is_favorite && <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{candidate.applicant.email}</p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[candidate.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                      {candidate.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                  {/* Overall Rating */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award className={`w-5 h-5 ${isTopRated ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className={`text-3xl font-bold ${isTopRated ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {candidate.overall_rating ? candidate.overall_rating.toFixed(1) : '--'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">/5</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {candidate.scorecard_count} scorecard(s)
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="space-y-2">
                    {candidate.applicant.current_title && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {candidate.applicant.current_title}
                        </span>
                      </div>
                    )}
                    {candidate.applicant.current_employer && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-5.5 truncate">
                        at {candidate.applicant.current_employer}
                      </p>
                    )}
                    {candidate.applicant.years_of_experience != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {candidate.applicant.years_of_experience} years experience
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Summary */}
                  {Object.keys(candidate.recommendation_counts).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recommendations</p>
                      <div className="space-y-1">
                        {recommendationOrder
                          .filter(rec => candidate.recommendation_counts[rec])
                          .map(rec => (
                            <div key={rec} className="flex items-center justify-between">
                              <span className={`text-xs px-2 py-0.5 rounded ${recColors[rec] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                {rec}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{candidate.recommendation_counts[rec]}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Applied Date */}
                  {candidate.submitted_at && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                      Applied {new Date(candidate.submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                  <button
                    onClick={() => navigate(`/recruiting/applications/${candidate.id}`)}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium py-1"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
