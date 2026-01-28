import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import OGLayout from './OGLayout';
import ModernLayout from './ModernLayout';

/**
 * LayoutSwitcher - Switches between OG (Classic) and Modern layouts
 * based on user preference stored in EmployeeFeaturesContext.
 */
export default function LayoutSwitcher() {
  const { viewMode, loading } = useEmployeeFeatures();

  // Show loading spinner while determining layout
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Render appropriate layout based on view mode
  return viewMode === 'modern' ? <ModernLayout /> : <OGLayout />;
}
