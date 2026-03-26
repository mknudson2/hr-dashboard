import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Star, User, ChevronRight, Columns } from 'lucide-react';

const BASE_URL = '';

interface KanbanApp {
  id: number;
  application_id: string;
  applicant_name: string;
  applicant_email: string | null;
  status: string;
  overall_rating: number | null;
  is_favorite: boolean;
  is_internal_transfer: boolean;
  submitted_at: string | null;
}

interface KanbanStage {
  id: number;
  name: string;
  stage_type: string;
  order_index: number;
  applications: KanbanApp[];
  count: number;
}

interface KanbanData {
  requisition_title: string;
  stages: KanbanStage[];
  ungrouped: KanbanApp[];
}

export default function PipelineKanbanView() {
  const { reqId } = useParams<{ reqId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragApp, setDragApp] = useState<number | null>(null);

  useEffect(() => { loadKanban(); }, [reqId]);

  const loadKanban = async () => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/requisitions/${reqId}/kanban`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } catch (error) {
      console.error('Failed to load kanban:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveToStage = async (appId: number, stageId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/recruiting/applications/${appId}/stage`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId }),
      });
      if (res.ok) loadKanban();
    } catch (error) {
      console.error('Move failed:', error);
    }
  };

  const handleDragStart = (appId: number) => {
    setDragApp(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stageId: number) => {
    if (dragApp) {
      // If dropping on an offer-type stage, redirect to offer builder
      const targetStage = data?.stages.find(s => s.id === stageId);
      if (targetStage?.stage_type === 'offer') {
        navigate(`/recruiting/offers/new?applicationId=${dragApp}`);
        setDragApp(null);
        return;
      }
      moveToStage(dragApp, stageId);
      setDragApp(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-72 h-96 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.stages.length === 0) {
    return (
      <div className="p-6 text-center">
        <Columns className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-2">No Pipeline Configured</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">This requisition doesn't have a pipeline template assigned.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800">Go back</button>
      </div>
    );
  }

  const totalApps = data.stages.reduce((sum, s) => sum + s.count, 0) + data.ungrouped.length;

  return (
    <div className="p-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.requisition_title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{totalApps} candidate(s) in pipeline</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Ungrouped column (new/unassigned) */}
        {data.ungrouped.length > 0 && (
          <div className="flex-shrink-0 w-72">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="p-3 border-b dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">New / Unassigned</h3>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{data.ungrouped.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {data.ungrouped.map(app => (
                  <CandidateCard key={app.id} app={app} onDragStart={handleDragStart} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Stage Columns */}
        {data.stages.map(stage => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(stage.id)}
          >
            <div className={`rounded-lg ${dragApp ? 'ring-2 ring-blue-300 ring-dashed' : ''} bg-gray-100 dark:bg-gray-800`}>
              <div className="p-3 border-b dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">{stage.name}</h3>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{stage.count}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {stage.applications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                    Drop candidates here
                  </div>
                ) : (
                  stage.applications.map(app => (
                    <CandidateCard key={app.id} app={app} onDragStart={handleDragStart} />
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidateCard({ app, onDragStart }: { app: KanbanApp; onDragStart: (id: number) => void }) {
  return (
    <Link
      to={`/recruiting/applications/${app.id}`}
      draggable
      onDragStart={() => onDragStart(app.id)}
      className="block bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border dark:border-gray-600 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{app.applicant_name}</p>
            {app.applicant_email && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">{app.applicant_email}</p>
            )}
          </div>
        </div>
        {app.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {app.overall_rating && (
          <span className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
            {app.overall_rating.toFixed(1)}/5
          </span>
        )}
        {app.is_internal_transfer && (
          <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">Internal</span>
        )}
        {app.submitted_at && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            {new Date(app.submitted_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}
