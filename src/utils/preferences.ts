/**
 * User preferences management with localStorage persistence
 */

export interface UserPreferences {
  // View preferences
  eventsViewMode?: 'list' | 'calendar';
  eventsFilterType?: string;
  eventsFilterStatus?: string;
  eventsFilterPriority?: string;
  eventsFilterTag?: string;

  // Display preferences
  itemsPerPage?: number;
  compactView?: boolean;

  // Notification preferences
  showNotifications?: boolean;
  notificationDuration?: number;

  // Other preferences
  lastVisitedPage?: string;
  favoritePages?: string[];
}

const STORAGE_KEY = 'hr_dashboard_preferences';
const VERSION = '1.0';

/**
 * Get user preferences from localStorage
 */
export const getPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultPreferences();
    }

    const parsed = JSON.parse(stored);

    if (parsed.version !== VERSION) {
      return getDefaultPreferences();
    }

    return parsed.preferences || getDefaultPreferences();
  } catch (error) {
    console.error('Error reading preferences:', error);
    return getDefaultPreferences();
  }
};

/**
 * Save user preferences to localStorage
 */
export const savePreferences = (preferences: Partial<UserPreferences>): void => {
  try {
    const current = getPreferences();
    const updated = { ...current, ...preferences };

    const toStore = {
      version: VERSION,
      preferences: updated,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

/**
 * Get a specific preference
 */
export const getPreference = <K extends keyof UserPreferences>(
  key: K
): UserPreferences[K] | undefined => {
  const preferences = getPreferences();
  return preferences[key];
};

/**
 * Set a specific preference
 */
export const setPreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void => {
  savePreferences({ [key]: value });
};

/**
 * Clear all preferences
 */
export const clearPreferences = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing preferences:', error);
  }
};

/**
 * Get default preferences
 */
export const getDefaultPreferences = (): UserPreferences => {
  return {
    eventsViewMode: 'list',
    eventsFilterType: 'all',
    eventsFilterStatus: 'all',
    eventsFilterPriority: 'all',
    eventsFilterTag: 'all',
    itemsPerPage: 20,
    compactView: false,
    showNotifications: true,
    notificationDuration: 5000,
    favoritePages: [],
  };
};

/**
 * React hook for using preferences
 */
export const usePreference = <K extends keyof UserPreferences>(
  key: K
): [UserPreferences[K] | undefined, (value: UserPreferences[K]) => void] => {
  const value = getPreference(key);

  const setValue = (newValue: UserPreferences[K]) => {
    setPreference(key, newValue);
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('preferences-updated', { detail: { key, value: newValue } }));
  };

  return [value, setValue];
};

/**
 * Export preferences as JSON
 */
export const exportPreferences = (): string => {
  const preferences = getPreferences();
  return JSON.stringify(preferences, null, 2);
};

/**
 * Import preferences from JSON
 */
export const importPreferences = (json: string): boolean => {
  try {
    const preferences = JSON.parse(json);
    savePreferences(preferences);
    return true;
  } catch (error) {
    console.error('Error importing preferences:', error);
    return false;
  }
};

export default {
  getPreferences,
  savePreferences,
  getPreference,
  setPreference,
  clearPreferences,
  getDefaultPreferences,
  exportPreferences,
  importPreferences,
};
