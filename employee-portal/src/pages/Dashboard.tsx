import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import OGDashboard from './OGDashboard';
import ModernDashboard from './ModernDashboard';

/**
 * Dashboard - Switches between OG (Classic) and Modern dashboards
 * based on user preference stored in EmployeeFeaturesContext.
 */
export default function Dashboard() {
  const { viewMode, loading } = useEmployeeFeatures();

  // Show loading while determining which dashboard to render
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return viewMode === 'modern' ? <ModernDashboard /> : <OGDashboard />;
}
