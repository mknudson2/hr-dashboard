import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPostFormData } from '@/utils/api';
import { ArrowLeft, Send, FileText, MessageSquare, User, Clock, Building, Upload, Download, Paperclip } from 'lucide-react';
import LifecycleTracker, { type LifecycleStage } from '@/components/recruiting/LifecycleTracker';

interface RequisitionDetail {
  id: number;
  requisition_id: string;
  title: string;
  department: string | null;
  team: string | null;
  cost_center: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  position_supervisor: string | null;
  posting_channels: string[] | null;
  preferred_salary: number | null;
  salary_min: number | null;
  salary_max: number | null;
  skills_tags: string[] | null;
  urgency: string | null;
  description: string | null;
  requirements: string | null;
  notes: string | null;
  status: string;
  request_source: string | null;
  target_start_date: string | null;
  created_at: string | null;
  recruiter_name: string | null;
  hiring_manager_name: string | null;
}

interface StageNote {
  id: number;
  author_name: string | null;
  content: string;
  highlights: string[] | null;
  recommendation: string | null;
  created_at: string | null;
}

interface StageDocument {
  id: number;
  uploaded_by_name: string | null;
  filename: string;
  description: string | null;
  created_at: string | null;
}

const urgencyColors: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Normal': 'bg-blue-100 text-blue-600',
  'High': 'bg-orange-100 text-orange-600',
  'Critical': 'bg-red-100 text-red-600',
};

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700',
  'Pending Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Open': 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-orange-100 text-orange-700',
  'Filled': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

export default function RequisitionTrackerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<LifecycleStage | null>(null);
  const [stageNotes, setStageNotes] = useState<StageNote[]>([]);
  const [stageDocs, setStageDocs] = useState<StageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Document upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqData, lifecycleData] = await Promise.all([
        apiGet<RequisitionDetail>(`/portal/hiring-manager/requisitions/${id}`),
        apiGet<{ stages: LifecycleStage[] }>(`/portal/hiring-manager/requisitions/${id}/lifecycle`),
      ]);
      setRequisition(reqData);
      setStages(lifecycleData.stages);

      // Auto-select the active stage
      const active = lifecycleData.stages.find(s => s.status === 'active');
      if (active) {
        setSelectedStage(active);
        fetchStageData(active.id);
        // Mark as viewed
        apiPost(`/portal/hiring-manager/requisitions/${id}/stages/${active.id}/mark-viewed`, {}).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requisition');
    } finally {
      setLoading(false);
    }
  };

  const fetchStageData = async (stageId: number) => {
    try {
      const [notesData, docsData] = await Promise.all([
        apiGet<{ notes: StageNote[] }>(`/portal/hiring-manager/requisitions/${id}/stages/${stageId}/notes`),
        apiGet<{ documents: StageDocument[] }>(`/portal/hiring-manager/requisitions/${id}/stages/${stageId}/documents`),
      ]);
      setStageNotes(notesData.notes);
      setStageDocs(docsData.documents);
    } catch {
      setStageNotes([]);
      setStageDocs([]);
    }
  };

  const handleStageClick = async (stage: LifecycleStage) => {
    setSelectedStage(stage);
    fetchStageData(stage.id);
    // Mark stage as viewed to clear unread badge
    try {
      await apiPost(`/portal/hiring-manager/requisitions/${id}/stages/${stage.id}/mark-viewed`, {});
      refreshLifecycle();
    } catch { /* ignore */ }
  };

  const refreshLifecycle = async () => {
    try {
      const data = await apiGet<{ stages: LifecycleStage[] }>(`/portal/hiring-manager/requisitions/${id}/lifecycle`);
      setStages(data.stages);
    } catch { /* ignore */ }
  };

  const markViewedAndRefresh = async (stageId: number) => {
    await apiPost(`/portal/hiring-manager/requisitions/${id}/stages/${stageId}/mark-viewed`, {}).catch(() => {});
    await refreshLifecycle();
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !selectedStage || !id) return;
    try {
      setSubmittingNote(true);
      await apiPost(`/portal/hiring-manager/requisitions/${id}/notes`, {
        stage_id: selectedStage.id,
        content: noteContent,
      });
      setNoteContent('');
      await Promise.all([
        fetchStageData(selectedStage.id),
        markViewedAndRefresh(selectedStage.id),
      ]);
    } catch {
      // silent fail
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUploadDocument = async (file: File) => {
    if (!selectedStage || !id) return;
    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', file);
      await apiPostFormData(`/portal/hiring-manager/requisitions/${id}/stages/${selectedStage.id}/documents`, formData);
      await Promise.all([
        fetchStageData(selectedStage.id),
        markViewedAndRefresh(selectedStage.id),
      ]);
    } catch {
      // silent fail
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Requisition not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/hiring/my-requisitions')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{requisition.requisition_id}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[requisition.status] || 'bg-gray-100 text-gray-700'}`}>
              {requisition.status}
            </span>
            {requisition.urgency && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[requisition.urgency] || ''}`}>
                {requisition.urgency}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {requisition.title}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {requisition.department && (
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                {requisition.department}
                {requisition.team && ` / ${requisition.team}`}
              </span>
            )}
            {requisition.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Submitted {new Date(requisition.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle Tracker */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Hiring Progress
        </h2>
        <LifecycleTracker
          stages={stages}
          activeStageId={selectedStage?.id}
          onStageClick={handleStageClick}
          readOnly
        />
      </div>

      {/* Stage Detail Panel */}
      {selectedStage && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedStage.stage_label}
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
              selectedStage.status === 'completed' ? 'bg-green-100 text-green-700' :
              selectedStage.status === 'active' ? 'bg-blue-100 text-blue-700' :
              selectedStage.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
              'bg-gray-100 text-gray-600'
            }`}>
              {selectedStage.status}
            </span>
          </div>

          {/* Stage info */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            {selectedStage.entered_at && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Started:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(selectedStage.entered_at).toLocaleString()}
                </span>
              </div>
            )}
            {selectedStage.completed_at && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(selectedStage.completed_at).toLocaleString()}
                </span>
              </div>
            )}
            {selectedStage.completed_by_name && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">By:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedStage.completed_by_name}
                </span>
              </div>
            )}
            {selectedStage.outcome && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Outcome:</span>
                <span className="ml-2 font-medium capitalize">{selectedStage.outcome}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" />
              Notes ({stageNotes.length})
            </h3>

            {stageNotes.length > 0 && (
              <div className="space-y-3 mb-4">
                {stageNotes.map(note => (
                  <div key={note.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {note.author_name || 'Unknown'}
                      </span>
                      {note.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    {note.highlights && note.highlights.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {note.highlights.map(h => (
                          <span key={h} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add note form */}
            <div className="flex gap-2">
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim() || submittingNote}
                className="self-end px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4" />
              Documents ({stageDocs.length})
            </h3>

            {stageDocs.length > 0 && (
              <div className="space-y-2 mb-4">
                {stageDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {doc.uploaded_by_name && <span>{doc.uploaded_by_name}</span>}
                        {doc.created_at && <span>{new Date(doc.created_at).toLocaleString()}</span>}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
                      )}
                    </div>
                    <a
                      href={`/portal/hiring-manager/documents/${doc.id}/download`}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-blue-600"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Upload document */}
            <div className="flex items-center gap-2">
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
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingDoc ? 'Uploading...' : 'Attach Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Stakeholders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Stakeholders</h3>
          <div className="space-y-2 text-sm">
            {requisition.hiring_manager_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Hiring Manager</span>
                <span className="text-gray-700 dark:text-gray-300">{requisition.hiring_manager_name}</span>
              </div>
            )}
            {requisition.recruiter_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Recruiter</span>
                <span className="text-gray-700 dark:text-gray-300">{requisition.recruiter_name}</span>
              </div>
            )}
            {requisition.position_supervisor && (
              <div className="flex justify-between">
                <span className="text-gray-500">Supervisor</span>
                <span className="text-gray-700 dark:text-gray-300">{requisition.position_supervisor}</span>
              </div>
            )}
          </div>
        </div>

        {/* Position Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Position Details</h3>
          <div className="space-y-2 text-sm">
            {requisition.employment_type && (
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-700 dark:text-gray-300">{requisition.employment_type}</span>
              </div>
            )}
            {requisition.location && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="text-gray-700 dark:text-gray-300">{requisition.location}</span>
              </div>
            )}
            {requisition.target_start_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Target Start</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(requisition.target_start_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {(requisition.salary_min || requisition.salary_max) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Salary Range</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {requisition.salary_min ? `$${requisition.salary_min.toLocaleString()}` : ''}
                  {requisition.salary_min && requisition.salary_max ? ' - ' : ''}
                  {requisition.salary_max ? `$${requisition.salary_max.toLocaleString()}` : ''}
                </span>
              </div>
            )}
          </div>
          {requisition.skills_tags && requisition.skills_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {requisition.skills_tags.map(skill => (
                <span key={skill} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
