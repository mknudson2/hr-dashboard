import { useState, useEffect } from 'react';
import { Calendar, Bell, ShieldCheck, ExternalLink } from 'lucide-react';

const BASE_URL = '';

interface Integration {
  id: number;
  integration_type: string;
  display_name: string;
  description: string;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  status: string;
  last_sync_at: string | null;
  error_message: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ms_teams_calendar: Calendar,
  ms_teams_notifications: Bell,
  i9_portal: ShieldCheck,
};

const STATUS_BADGE: Record<string, string> = {
  'Not Configured': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Configured: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Connected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const CONFIG_FIELDS: Record<string, { label: string; placeholder: string }[]> = {
  ms_teams_calendar: [
    { label: 'Tenant ID', placeholder: 'Enter Microsoft tenant ID' },
    { label: 'Client ID', placeholder: 'Enter OAuth client ID' },
    { label: 'Redirect URI', placeholder: 'https://your-domain.com/callback' },
  ],
  ms_teams_notifications: [
    { label: 'Tenant ID', placeholder: 'Enter Microsoft tenant ID' },
    { label: 'Client ID', placeholder: 'Enter OAuth client ID' },
    { label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...' },
  ],
  i9_portal: [
    { label: 'Provider URL', placeholder: 'https://i9-provider.example.com' },
    { label: 'API Key', placeholder: 'Enter API key' },
  ],
};

export default function IntegrationManagementPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editConfigs, setEditConfigs] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    if (integrations.length > 0) {
      const configs: Record<string, Record<string, string>> = {};
      integrations.forEach(i => {
        configs[i.integration_type] = {};
        const fields = CONFIG_FIELDS[i.integration_type] || [];
        fields.forEach(f => {
          const key = f.label.toLowerCase().replace(/\s+/g, '_');
          configs[i.integration_type][key] = i.config?.[key] || '';
        });
      });
      setEditConfigs(configs);
    }
  }, [integrations]);

  async function loadIntegrations() {
    try {
      const res = await fetch(`${BASE_URL}/integrations`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load integrations');
      const data = await res.json();
      setIntegrations(data);
    } catch {
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(integration: Integration) {
    try {
      const res = await fetch(`${BASE_URL}/integrations/${integration.integration_type}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !integration.is_enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated = await res.json();
      setIntegrations(prev => prev.map(i => i.integration_type === updated.integration_type ? updated : i));
      setSuccess(`${integration.display_name} ${!integration.is_enabled ? 'enabled' : 'disabled'}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update integration');
    }
  }

  async function handleSaveConfig(integration: Integration) {
    setSaving(integration.integration_type);
    try {
      const config = editConfigs[integration.integration_type] || {};
      const res = await fetch(`${BASE_URL}/integrations/${integration.integration_type}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...integration.config, ...config } }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setIntegrations(prev => prev.map(i => i.integration_type === updated.integration_type ? updated : i));
      setSuccess('Configuration saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save configuration');
    } finally {
      setSaving(null);
    }
  }

  async function handleConnect(integration: Integration) {
    await handleSaveConfig(integration);
    setConnecting(integration.integration_type);
    try {
      const res = await fetch(`${BASE_URL}/integrations/ms_teams_calendar/connect`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to initiate connection');
      const data = await res.json();
      window.open(data.auth_url, '_blank', 'width=600,height=700');
      setSuccess('OAuth window opened — complete the consent flow, then refresh this page');
      setTimeout(() => setSuccess(''), 10000);
    } catch {
      setError('Failed to initiate OAuth connection');
    } finally {
      setConnecting(null);
    }
  }

  async function handleTestConnection(integration: Integration) {
    setTesting(integration.integration_type);
    setTestResult(prev => ({ ...prev, [integration.integration_type]: null }));
    try {
      const res = await fetch(`${BASE_URL}/integrations/${integration.integration_type}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setTestResult(prev => ({
        ...prev,
        [integration.integration_type]: {
          success: data.success,
          message: data.success ? 'Connection successful!' : (data.error || 'Connection failed'),
        },
      }));
    } catch {
      setTestResult(prev => ({
        ...prev,
        [integration.integration_type]: { success: false, message: 'Test request failed' },
      }));
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage external service connections for recruiting workflows</p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Integration Cards */}
      {integrations.length === 0 && !error && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No integrations available.</p>
        </div>
      )}

      {integrations.map(integration => {
        const IconComponent = ICON_MAP[integration.integration_type] || ExternalLink;
        const fields = CONFIG_FIELDS[integration.integration_type] || [];
        const statusClass = STATUS_BADGE[integration.status] || STATUS_BADGE['Not Configured'];

        return (
          <div
            key={integration.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <IconComponent className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {integration.display_name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                      {integration.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {integration.description}
                  </p>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(integration)}
                className="flex-shrink-0 mt-1"
                aria-label={`Toggle ${integration.display_name}`}
              >
                {integration.is_enabled ? (
                  <div className="w-11 h-6 bg-blue-600 rounded-full relative transition-colors">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" />
                  </div>
                ) : (
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-colors">
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" />
                  </div>
                )}
              </button>
            </div>

            {/* Config fields (shown when enabled) */}
            {integration.is_enabled && fields.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map(field => {
                    const key = field.label.toLowerCase().replace(/\s+/g, '_');
                    return (
                      <div key={field.label}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={editConfigs[integration.integration_type]?.[key] || ''}
                          onChange={(e) =>
                            setEditConfigs(prev => ({
                              ...prev,
                              [integration.integration_type]: {
                                ...prev[integration.integration_type],
                                [key]: e.target.value,
                              },
                            }))
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons when enabled */}
            {integration.is_enabled && (
              <div className="mt-4 flex items-center gap-3">
                {/* Save Configuration */}
                <button
                  onClick={() => handleSaveConfig(integration)}
                  disabled={saving === integration.integration_type}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving === integration.integration_type ? 'Saving...' : 'Save Configuration'}
                </button>

                {/* Connect button for calendar */}
                {integration.integration_type === 'ms_teams_calendar' && integration.status !== 'Connected' && (
                  <button
                    onClick={() => handleConnect(integration)}
                    disabled={connecting === integration.integration_type}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {connecting === integration.integration_type ? 'Connecting...' : 'Connect OAuth'}
                  </button>
                )}

                {/* Test Connection button */}
                {(integration.integration_type === 'ms_teams_notifications' ||
                  integration.integration_type === 'i9_portal' ||
                  (integration.integration_type === 'ms_teams_calendar' && integration.status === 'Connected')) && (
                  <button
                    onClick={() => handleTestConnection(integration)}
                    disabled={testing === integration.integration_type}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {testing === integration.integration_type ? 'Testing...' : 'Test Connection'}
                  </button>
                )}

                {/* Test result display */}
                {testResult[integration.integration_type] && (
                  <span className={`text-sm ${testResult[integration.integration_type]!.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult[integration.integration_type]!.message}
                  </span>
                )}
              </div>
            )}

            {/* Info banner when not enabled */}
            {!integration.is_enabled && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Enable this integration and configure the settings above to get started.
                </p>
              </div>
            )}

            {/* Error message */}
            {integration.error_message && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-400">
                  Error: {integration.error_message}
                </p>
              </div>
            )}

            {/* Last sync */}
            {integration.last_sync_at && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Last synced: {new Date(integration.last_sync_at).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
