import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import MyCases from '@/pages/employee/MyCases';
import SubmitTime from '@/pages/employee/SubmitTime';
import RequestLeave from '@/pages/employee/RequestLeave';
import MySubmissions from '@/pages/employee/MySubmissions';
import TeamDashboard from '@/pages/supervisor/TeamDashboard';
import PendingReviews from '@/pages/supervisor/PendingReviews';
import Reports from '@/pages/supervisor/Reports';
import MainLayout from '@/components/MainLayout';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Supervisor-only route
function SupervisorRoute({ children }: { children: React.ReactNode }) {
  const { isSupervisor, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSupervisor) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Employee routes */}
        <Route path="/my-cases" element={<MyCases />} />
        <Route path="/submit-time" element={<SubmitTime />} />
        <Route path="/request-leave" element={<RequestLeave />} />
        <Route path="/my-submissions" element={<MySubmissions />} />

        {/* Supervisor routes */}
        <Route
          path="/team"
          element={
            <SupervisorRoute>
              <TeamDashboard />
            </SupervisorRoute>
          }
        />
        <Route
          path="/pending-reviews"
          element={
            <SupervisorRoute>
              <PendingReviews />
            </SupervisorRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <SupervisorRoute>
              <Reports />
            </SupervisorRoute>
          }
        />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
