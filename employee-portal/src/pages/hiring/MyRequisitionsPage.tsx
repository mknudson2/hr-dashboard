import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/utils/api';
import { Plus, Briefcase, Clock } from 'lucide-react';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';

interface Requisition {
  id: number;
  requisition_id: string;
  title: string;
  department: string | null;
  team: string | null;
  status: string;
  urgency: string | null;
  posting_channels: string[] | null;
  request_source: string | null;
  created_at: string | null;
  target_start_date: string | null;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700',
  'Pending Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Open': 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-orange-100 text-orange-700',
  'Filled': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const urgencyColors: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Normal': 'bg-blue-100 text-blue-600',
  'High': 'bg-orange-100 text-orange-600',
  'Critical': 'bg-red-100 text-red-600',
};

export default function MyRequisitionsPage() {
  const navigate = useNavigate();
  const { features } = useEmployeeFeatures();
  const isHiringManager = features?.is_hiring_manager ?? false;
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ total: number; requisitions: Requisition[] }>(
        '/portal/hiring-manager/requisitions'
      );
      setRequisitions(data.requisitions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hiring
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isHiringManager
              ? 'Track the status of your position requests'
              : 'Follow the hiring progress for positions you\'re involved in'}
          </p>
        </div>
        {isHiringManager && (
          <button
            onClick={() => navigate('/hiring/new-request')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* List */}
      {requisitions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Requisitions Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isHiringManager
              ? 'Submit your first position request to get started.'
              : 'You\'ll see requisitions here when you\'re added as a stakeholder.'}
          </p>
          {isHiringManager && (
            <button
              onClick={() => navigate('/hiring/new-request')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Request New Position
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requisitions.map(req => (
            <button
              key={req.id}
              onClick={() => navigate(`/hiring/requisitions/${req.id}`)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">{req.requisition_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || 'bg-gray-100 text-gray-700'}`}>
                      {req.status}
                    </span>
                    {req.urgency && req.urgency !== 'Normal' && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[req.urgency] || ''}`}>
                        {req.urgency}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {req.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {req.department && <span>{req.department}</span>}
                    {req.team && <span>/ {req.team}</span>}
                    {req.created_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {req.posting_channels && req.posting_channels.length > 0 && (
                  <div className="flex gap-1 ml-3">
                    {req.posting_channels.map(ch => (
                      <span key={ch} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs capitalize">
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
