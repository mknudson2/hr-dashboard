import { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { apiPut, apiDelete } from '@/utils/api';

interface CeilingLevel {
  value: string;
  label: string;
}

interface CeilingSettingsBannerProps {
  effectiveCeiling: string;
  currentOverride: string | null;
  availableLevels: CeilingLevel[];
  onCeilingChanged: () => void;
}

export default function CeilingSettingsBanner({
  effectiveCeiling,
  currentOverride,
  availableLevels,
  onCeilingChanged,
}: CeilingSettingsBannerProps) {
  const [selectedLevel, setSelectedLevel] = useState(currentOverride || effectiveCeiling);
  const [saving, setSaving] = useState(false);

  const currentLabel = availableLevels.find((l) => l.value === effectiveCeiling)?.label || effectiveCeiling;
  const hasChanges = selectedLevel !== (currentOverride || effectiveCeiling);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiPut('/portal/pto-calendar/ceiling', {
        ceiling_title_level: selectedLevel,
      });
      onCeilingChanged();
    } catch {
      // Error handled silently — ceiling remains unchanged
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      await apiDelete('/portal/pto-calendar/ceiling');
      setSelectedLevel(effectiveCeiling);
      onCeilingChanged();
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Settings size={14} />
        <span>Visibility ceiling:</span>
        <span className="font-medium text-gray-900 dark:text-white">{currentLabel}</span>
      </div>

      <select
        value={selectedLevel}
        onChange={(e) => setSelectedLevel(e.target.value)}
        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        {availableLevels.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      )}

      {currentOverride && (
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          title="Reset to default"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
