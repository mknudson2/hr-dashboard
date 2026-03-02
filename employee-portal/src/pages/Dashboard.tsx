import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import OGDashboard from './OGDashboard';
import ModernDashboard from './ModernDashboard';
import BifrostDashboard from './BifrostDashboard';

/**
 * Dashboard - Switches between OG (Classic), Modern, and Bifröst dashboards
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

  if (viewMode === 'bifrost') return <BifrostDashboard />;
  return viewMode === 'modern' ? <ModernDashboard /> : <OGDashboard />;
}
