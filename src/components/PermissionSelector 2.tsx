import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

interface PermissionSelectorProps {
  permissions: Permission[];
  categories: string[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

const formatCategory = (category: string): string => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  permissions,
  categories,
  selectedIds,
  onChange,
  disabled = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories);

  const permissionsByCategory = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat] = permissions.filter(p => p.category === cat);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions, categories]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const togglePermission = (id: number) => {
    if (disabled) return;
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter(sid => sid !== id)
      : [...selectedIds, id];
    onChange(newIds);
  };

  const toggleAllInCategory = (category: string) => {
    if (disabled) return;
    const categoryPermIds = permissionsByCategory[category].map(p => p.id);
    const allSelected = categoryPermIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter(id => !categoryPermIds.includes(id)));
    } else {
      onChange([...new Set([...selectedIds, ...categoryPermIds])]);
    }
  };

  const getCategorySelectedCount = (category: string): { selected: number; total: number } => {
    const categoryPerms = permissionsByCategory[category] || [];
    const selected = categoryPerms.filter(p => selectedIds.includes(p.id)).length;
    return { selected, total: categoryPerms.length };
  };

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {categories.map(category => {
        const isExpanded = expandedCategories.includes(category);
        const { selected, total } = getCategorySelectedCount(category);
        const allSelected = selected === total && total > 0;

        return (
          <div key={category} className="border rounded-lg dark:border-gray-700 overflow-hidden">
            <div className="flex items-center bg-gray-50 dark:bg-gray-700/50">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex-1 flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCategory(category)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({selected}/{total})
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleAllInCategory(category)}
                disabled={disabled}
                className={`px-3 py-1 mr-2 text-xs font-medium rounded transition-colors ${
                  allSelected
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {isExpanded && (
              <div className="p-3 space-y-1 bg-white dark:bg-gray-800">
                {permissionsByCategory[category]?.map(perm => (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        disabled={disabled}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {perm.display_name}
                      </div>
                      {perm.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {perm.description}
                        </div>
                      )}
                    </div>
                    {selectedIds.includes(perm.id) && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PermissionSelector;
