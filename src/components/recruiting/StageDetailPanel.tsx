import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, User, Send, Plus, Upload, Download, ChevronDown, ChevronUp, FileSignature, Globe, CheckCircle, Eye, ExternalLink, Calendar, Clock, Video, ClipboardList } from 'lucide-react';
import type { LifecycleStage } from './LifecycleTracker';

interface StageNote {
  id: number;
  lifecycle_stage_id: number;
  author_id: number;
  author_name: string | null;
  content: string;
  highlights: string[] | null;
  recommendation: string | null;
  recommendation_reason: string | null;
  created_at: string | null;
}

interface StageDocument {
  id: number;
  lifecycle_stage_id: number;
  uploaded_by: number;
  uploaded_by_name: string | null;
  filename: string;
  description: string | null;
  file_path: string | null;
  created_at: string | null;
}

interface StageInterview {
  id: number;
  interview_id: string;
  applicant_name: string | null;
  application_id: number;
  scheduled_at: string | null;
  duration_minutes: number;
  format: string;
  video_link: string | null;
  meeting_link_auto: boolean;
  status: string;
  interviewers: { user_id: number; name: string; role: string }[];
  scorecards: { id: number; status: string; interviewer_id: number }[];
}

interface StageDetailPanelProps {
  stage: LifecycleStage;
  requisitionId: number;
  readOnly?: boolean;
  onStageUpdated?: () => void;
}

const highlightOptions = [
  'Strong Communicator', 'Culture Fit', 'Technical Expert', 'Leadership',
  'Problem Solver', 'Team Player', 'Quick Learner', 'Domain Expert',
];

export default function StageDetailPanel({
  stage,
  requisitionId,
  readOnly = false,
  onStageUpdated,
}: StageDetailPanelProps) {
  const [notes, setNotes] = useState<StageNote[]>([]);
  const [documents, setDocuments] = useState<StageDocument[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteHighlights, setNoteHighlights] = useState<string[]>([]);
  const [noteRecommendation, setNoteRecommendation] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'notes' | 'documents' | null>('notes');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Posting-related state for position_posted stage
  interface PostingItem {
    id: number;
    posting_id: string;
    channel: string;
    status: string;
    is_internal: boolean;
    published_at: string | null;
    application_count: number;
  }
  const [postings, setPostings] = useState<PostingItem[]>([]);
  const [postingChannels, setPostingChannels] = useState<string[]>(['portal']);
  const [creatingPostings, setCreatingPostings] = useState(false);

  const CHANNEL_OPTIONS = [
    { value: 'portal', label: 'Applicant Portal', icon: Globe },
    { value: 'internal', label: 'Internal (Employees)', icon: User },
    { value: 'careers_page', label: 'Careers Page', icon: ExternalLink },
    { value: 'indeed', label: 'Indeed', icon: ExternalLink },
    { value: 'linkedin', label: 'LinkedIn', icon: ExternalLink },
  ];

  // Offer-related state for offer_extended stage
  interface OfferCandidate {
    id: number;
    applicant_name: string;
    status: string;
    offer?: { id: number; offer_id: string; status: string; salary: number | null; sent_at: string | null } | null;
  }
  const [offerCandidates, setOfferCandidates] = useState<OfferCandidate[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Interview-related state for interview stages
  const [stageInterviews, setStageInterviews] = useState<StageInterview[]>([]);
  const isInterviewStage = stage.stage_key === 'hr_interview' || stage.stage_key === 'hiring_manager_interview';

  useEffect(() => {
    fetchNotes();
    fetchDocuments();
    if (isInterviewStage) {
      fetchStageInterviews();
    }
    if (stage.stage_key === 'offer_extended') {
      fetchOfferCandidates();
    }
    if (stage.stage_key === 'position_posted') {
      fetchPostings();
    }
  }, [stage.id]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/recruiting/lifecycle/${requisitionId}/stages/${stage.id}/notes`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch {
      // silent
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/recruiting/lifecycle/${requisitionId}/stages/${stage.id}/documents`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch {
      // silent
    }
  };

  const fetchStageInterviews = async () => {
    try {
      const res = await fetch(
        `/recruiting/requisitions/${requisitionId}/stage-interviews?stage_key=${stage.stage_key}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        setStageInterviews(data.interviews || []);
      }
    } catch {
      // silent
    }
  };

  const fetchOfferCandidates = async () => {
    setLoadingOffers(true);
    try {
      // Fetch applications for this requisition
      const appsRes = await fetch(`/recruiting/requisitions/${requisitionId}/applications`, {
        credentials: 'include',
      });
      if (!appsRes.ok) return;
      const appsData = await appsRes.json();
      const apps: { id: number; applicant: { name: string }; status: string }[] = appsData.applications || [];

      // Fetch all offers for this requisition's applications
      const offersRes = await fetch(`/recruiting/offers?limit=200`, { credentials: 'include' });
      const offersData = offersRes.ok ? await offersRes.json() : { offers: [] };
      const allOffers: { id: number; offer_id: string; application_id: number; status: string; salary: number | null; sent_at: string | null }[] = offersData.offers || [];

      // Build candidate list — only show non-rejected/withdrawn applications
      const eligible = apps.filter(a => !['Rejected', 'Withdrawn'].includes(a.status));
      const candidates: OfferCandidate[] = eligible.map(a => {
        const offer = allOffers.find(o => o.application_id === a.id);
        return {
          id: a.id,
          applicant_name: a.applicant.name,
          status: a.status,
          offer: offer ? { id: offer.id, offer_id: offer.offer_id, status: offer.status, salary: offer.salary, sent_at: offer.sent_at } : null,
        };
      });
      setOfferCandidates(candidates);
    } catch {
      // silent
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchPostings = async () => {
    try {
      const res = await fetch(`/recruiting/requisitions/${requisitionId}/postings`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPostings(data.postings || []);
        // Remove channels that already have postings
        const existingChannels = (data.postings || []).map((p: PostingItem) => p.channel);
        setPostingChannels(prev => prev.filter(c => !existingChannels.includes(c)));
      }
    } catch { /* silent */ }
  };

  const togglePostingChannel = (value: string) => {
    setPostingChannels(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  };

  const handleCreatePostings = async () => {
    setCreatingPostings(true);
    try {
      for (const ch of postingChannels) {
        await fetch(`/recruiting/postings`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requisition_id: requisitionId, channel: ch, is_internal: ch === 'internal' }),
        });
      }
      setPostingChannels([]);
      fetchPostings();
      onStageUpdated?.();
    } catch { /* silent */ }
    setCreatingPostings(false);
  };

  const handlePublishPosting = async (postingId: number) => {
    try {
      await fetch(`/recruiting/postings/${postingId}/publish`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Published' }),
      });
      fetchPostings();
      onStageUpdated?.();
    } catch { /* silent */ }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    try {
      setSubmittingNote(true);
      const res = await fetch(`/recruiting/lifecycle/${requisitionId}/stages/${stage.id}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
          highlights: noteHighlights.length > 0 ? noteHighlights : null,
          recommendation: noteRecommendation || null,
        }),
      });
      if (res.ok) {
        setNoteContent('');
        setNoteHighlights([]);
        setNoteRecommendation('');
        setShowNoteForm(false);
        fetchNotes();
      }
    } catch {
      // silent
    } finally {
      setSubmittingNote(false);
    }
  };

  const toggleHighlight = (h: string) => {
    setNoteHighlights(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
    );
  };

  const handleUpdateStage = async (field: string, value: boolean | string | number | null) => {
    try {
      const res = await fetch(`/recruiting/lifecycle/${requisitionId}/stages/${stage.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        onStageUpdated?.();
      }
    } catch {
      // silent
    }
  };

  const handleUploadDocument = async (file: File) => {
    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      const res = await fetch(`/recruiting/lifecycle/${requisitionId}/stages/${stage.id}/documents`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        fetchDocuments();
        onStageUpdated?.();
      }
    } catch {
      // silent
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Stage Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {stage.stage_label}
          </h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
            stage.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
            stage.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
            stage.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {stage.status}
          </span>
        </div>

        {/* Stage meta */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm">
          {stage.entered_at && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Started</span>
              <p className="text-gray-700 dark:text-gray-300">{new Date(stage.entered_at).toLocaleString()}</p>
            </div>
          )}
          {stage.completed_at && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Completed</span>
              <p className="text-gray-700 dark:text-gray-300">{new Date(stage.completed_at).toLocaleString()}</p>
            </div>
          )}
          {stage.completed_by_name && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">By</span>
              <p className="text-gray-700 dark:text-gray-300">{stage.completed_by_name}</p>
            </div>
          )}
          {stage.outcome && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Outcome</span>
              <p className="font-medium capitalize text-gray-700 dark:text-gray-300">{stage.outcome}</p>
            </div>
          )}
        </div>

        {/* HR Presence toggle for hiring manager interview */}
        {!readOnly && stage.stage_key === 'hiring_manager_interview' && (
          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stage.hr_representative_present || false}
                onChange={e => handleUpdateStage('hr_representative_present', e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">HR Representative Present</span>
            </label>
          </div>
        )}

        {/* Outcome buttons for decision stages */}
        {!readOnly && stage.status === 'active' && ['tech_screen', 'offer_response'].includes(stage.stage_key) && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleUpdateStage('outcome', 'passed')}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              Passed
            </button>
            <button
              onClick={() => handleUpdateStage('outcome', 'failed')}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Failed
            </button>
          </div>
        )}
      </div>

      {/* Scheduled Interviews — shown for hr_interview / hiring_manager_interview stages */}
      {isInterviewStage && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Calendar className="w-4 h-4" />
              Scheduled Interviews ({stageInterviews.length})
            </h4>
            {stageInterviews.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No interviews scheduled for this stage yet.</p>
            ) : (
              <div className="space-y-2">
                {stageInterviews.map(iv => (
                  <div key={iv.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 text-blue-500 shrink-0" />
                        <button
                          onClick={() => navigate(`/recruiting/applications/${iv.application_id}`)}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {iv.applicant_name || 'Unknown Applicant'}
                        </button>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        iv.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                        iv.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        iv.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}>
                        {iv.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {iv.scheduled_at && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(iv.scheduled_at).toLocaleDateString()} at{' '}
                            {new Date(iv.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{iv.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3 h-3" />
                        <span>{iv.format}</span>
                      </div>
                      {iv.interviewers?.[0]?.name && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          <span>{iv.interviewers[0].name}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {iv.video_link && (
                        <a
                          href={iv.video_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Meeting
                          {iv.meeting_link_auto && (
                            <span className="text-blue-500 dark:text-blue-500">(Teams)</span>
                          )}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {iv.scorecards.length > 0 ? (
                        iv.scorecards.map(sc => (
                          <button
                            key={sc.id}
                            onClick={() => navigate(`/recruiting/scorecards/${sc.id}`)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${
                              sc.status === 'Submitted'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                            }`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            {sc.status === 'Submitted' ? 'View Scorecard' : 'Fill Scorecard'}
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => navigate(`/recruiting/applications/${iv.application_id}`, { state: { tab: 'scorecards' } })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Scorecard
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Position Posted — inline posting creation + existing postings */}
      {stage.stage_key === 'position_posted' && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0">
            {/* Left: Create postings */}
            <div className="p-4 md:border-r border-gray-200 dark:border-gray-700">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <Globe className="w-4 h-4" />
                Create Postings
              </h4>
              {(() => {
                const existingChannels = postings.map(p => p.channel);
                const available = CHANNEL_OPTIONS.filter(o => !existingChannels.includes(o.value));
                if (available.length === 0) {
                  return <p className="text-sm text-gray-400 dark:text-gray-500">All channels have postings.</p>;
                }
                return (
                  <div className="space-y-2">
                    {available.map(opt => (
                      <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={postingChannels.includes(opt.value)}
                          onChange={() => togglePostingChannel(opt.value)}
                          className="rounded text-blue-600"
                        />
                        <opt.icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                      </label>
                    ))}
                    <button
                      onClick={handleCreatePostings}
                      disabled={postingChannels.length === 0 || creatingPostings}
                      className="mt-2 w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creatingPostings ? 'Creating...' : `Create ${postingChannels.length > 1 ? `${postingChannels.length} Postings` : 'Posting'}`}
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Right: Existing postings */}
            <div className="p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <Eye className="w-4 h-4" />
                Active Postings ({postings.length})
              </h4>
              {postings.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No postings created yet.</p>
              ) : (
                <div className="space-y-2">
                  {postings.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{p.channel.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {p.posting_id} · {p.application_count} app{p.application_count !== 1 ? 's' : ''}
                          {p.is_internal && ' · Internal'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {p.status === 'Draft' ? (
                          <button
                            onClick={() => handlePublishPosting(p.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                          >
                            Publish
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {p.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offer Candidates Section — shown for offer_extended stage */}
      {stage.stage_key === 'offer_extended' && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <FileSignature className="w-4 h-4" />
              Offer Letters
            </h4>
            {loadingOffers ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map(i => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />)}
              </div>
            ) : offerCandidates.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No eligible candidates. Add applications to this requisition first.</p>
            ) : (
              <div className="space-y-2">
                {offerCandidates.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.applicant_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Status: {c.status}
                        {c.offer && (
                          <> · Offer: <span className={
                            c.offer.status === 'Accepted' ? 'text-green-600 dark:text-green-400' :
                            c.offer.status === 'Sent' ? 'text-purple-600 dark:text-purple-400' :
                            c.offer.status === 'Declined' ? 'text-red-600 dark:text-red-400' :
                            ''
                          }>{c.offer.status}</span>
                          {c.offer.salary && <> · ${c.offer.salary.toLocaleString()}</>}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {c.offer ? (
                        <button
                          onClick={() => navigate(`/recruiting/offers/${c.offer!.id}`)}
                          className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          View Offer
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/recruiting/offers/new?applicationId=${c.id}`)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          Create Offer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setExpandedSection(expandedSection === 'notes' ? null : 'notes')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <MessageSquare className="w-4 h-4" />
            Notes ({notes.length})
          </span>
          {expandedSection === 'notes' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expandedSection === 'notes' && (
          <div className="px-4 pb-4 space-y-3">
            {notes.map(note => (
              <div key={note.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {note.author_name || 'Unknown'}
                  </span>
                  {note.created_at && (
                    <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                  )}
                  {note.recommendation && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      note.recommendation === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {note.recommendation === 'approved' ? 'Approved' : 'Not Approved'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{note.content}</p>
                {note.highlights && note.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {note.highlights.map(h => (
                      <span key={h} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add note form */}
            {!readOnly && (
              <>
                {!showNoteForm ? (
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" /> Add Note
                  </button>
                ) : (
                  <div className="space-y-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3">
                    <textarea
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      placeholder="Write your note..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20 resize-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Highlights</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {highlightOptions.map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => toggleHighlight(h)}
                            className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                              noteHighlights.includes(h)
                                ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Recommendation</label>
                      <div className="flex gap-2 mt-1">
                        {['approved', 'not_approved'].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setNoteRecommendation(noteRecommendation === r ? '' : r)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              noteRecommendation === r
                                ? r === 'approved' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {r === 'approved' ? 'Approve' : 'Do Not Approve'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowNoteForm(false); setNoteContent(''); }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={!noteContent.trim() || submittingNote}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {submittingNote ? 'Saving...' : 'Add Note'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'documents' ? null : 'documents')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
          </span>
          {expandedSection === 'documents' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expandedSection === 'documents' && (
          <div className="px-4 pb-4 space-y-2">
            {documents.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No documents uploaded yet.</p>
            )}
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.filename}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {doc.uploaded_by_name && <span>{doc.uploaded_by_name}</span>}
                    {doc.created_at && <span>{new Date(doc.created_at).toLocaleString()}</span>}
                  </div>
                  {doc.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
                  )}
                </div>
                {doc.file_path && (
                  <a
                    href={`/recruiting/lifecycle/${requisitionId}/stages/${stage.id}/documents/${doc.id}/download`}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-blue-600"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}

            {!readOnly && (
              <div className="pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
