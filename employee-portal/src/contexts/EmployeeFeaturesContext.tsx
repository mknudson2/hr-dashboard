import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiGet, apiPut } from '@/utils/api';

/**
 * Feature flags based on employee's actual data and eligibility.
 * These control which UI elements are shown/hidden in the portal.
 */
export interface FeatureFlags {
  // FMLA-related
  has_active_fmla_cases: boolean;
  has_any_fmla_cases: boolean;
  has_pending_fmla_submissions: boolean;
  is_fmla_eligible: boolean;

  // Garnishment-related
  has_active_garnishments: boolean;
  has_any_garnishments: boolean;

  // PTO-related
  has_pending_pto_requests: boolean;

  // Benefits
  benefits_enrolled: boolean;

  // Supervisor features
  is_supervisor: boolean;
  has_direct_reports: boolean;
  pending_approvals_count: number;

  // Hiring manager access
  is_hiring_manager: boolean;

  // User preferences
  preferred_view: 'og' | 'modern' | 'bifrost';

  // Action items count
  total_action_items: number;
}

interface EmployeeFeaturesContextType {
  features: FeatureFlags | null;
  loading: boolean;
  error: string | null;
  viewMode: 'og' | 'modern' | 'bifrost';
  setViewMode: (mode: 'og' | 'modern' | 'bifrost') => void;
  refreshFeatures: () => Promise<void>;
}

const defaultFeatures: FeatureFlags = {
  has_active_fmla_cases: false,
  has_any_fmla_cases: false,
  has_pending_fmla_submissions: false,
  is_fmla_eligible: true,
  has_active_garnishments: false,
  has_any_garnishments: false,
  has_pending_pto_requests: false,
  benefits_enrolled: false,
  is_supervisor: false,
  has_direct_reports: false,
  pending_approvals_count: 0,
  is_hiring_manager: false,
  preferred_view: 'og',
  total_action_items: 0,
};

const EmployeeFeaturesContext = createContext<EmployeeFeaturesContextType | undefined>(undefined);

export const useEmployeeFeatures = () => {
  const context = useContext(EmployeeFeaturesContext);
  if (!context) {
    throw new Error('useEmployeeFeatures must be used within an EmployeeFeaturesProvider');
  }
  return context;
};

interface EmployeeFeaturesProviderProps {
  children: ReactNode;
}

const VIEW_MODE_KEY = 'portal_view_mode';

export const EmployeeFeaturesProvider = ({ children }: EmployeeFeaturesProviderProps) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize view mode from localStorage (immediate access) or default
  const [viewMode, setViewModeState] = useState<'og' | 'modern' | 'bifrost'>(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'modern' || stored === 'bifrost') return stored;
    return 'bifrost';
  });

  const fetchFeatures = useCallback(async () => {
    if (!isAuthenticated) {
      setFeatures(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<FeatureFlags>('/portal/features/flags');
      setFeatures(data);

      // Only sync view mode from server on initial load (when localStorage is empty)
      const storedView = localStorage.getItem(VIEW_MODE_KEY);
      if (!storedView && data.preferred_view) {
        const serverView = data.preferred_view as 'og' | 'modern' | 'bifrost';
        setViewModeState(serverView);
        localStorage.setItem(VIEW_MODE_KEY, serverView);
      }
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load features');
      // Use default features on error so the app still works
      setFeatures(defaultFeatures);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Re-sync viewMode from localStorage when auth state changes (e.g., after login)
  // The login page may have updated localStorage while this provider's state was stale
  useEffect(() => {
    if (isAuthenticated) {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === 'og' || stored === 'modern' || stored === 'bifrost') {
        setViewModeState(stored);
      }
    }
  }, [isAuthenticated]);

  // Fetch features when auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchFeatures();
    }
  }, [authLoading, isAuthenticated, fetchFeatures]);

  const setViewMode = useCallback(async (mode: 'og' | 'modern' | 'bifrost') => {
    // Immediately update local state for instant UI response
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);

    // Update features object if it exists
    if (features) {
      setFeatures({ ...features, preferred_view: mode });
    }

    // Persist to server (fire and forget - don't block UI)
    try {
      await apiPut('/portal/features/preferences', { preferred_view: mode });
    } catch (err) {
      console.error('Failed to persist view preference:', err);
      // Don't revert - localStorage is the primary source
    }
  }, [features]);

  const refreshFeatures = useCallback(async () => {
    await fetchFeatures();
  }, [fetchFeatures]);

  const value = {
    features,
    loading: loading || authLoading,
    error,
    viewMode,
    setViewMode,
    refreshFeatures,
  };

  return (
    <EmployeeFeaturesContext.Provider value={value}>
      {children}
    </EmployeeFeaturesContext.Provider>
  );
};
