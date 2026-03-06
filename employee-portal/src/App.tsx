import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { EmployeeFeaturesProvider } from '@/contexts/EmployeeFeaturesContext';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
// Employee FMLA & Garnishment pages (existing, reorganized)
import MyCases from '@/pages/employee/MyCases';
import SubmitTime from '@/pages/employee/SubmitTime';
import RequestLeave from '@/pages/employee/RequestLeave';
import MySubmissions from '@/pages/employee/MySubmissions';
import MyGarnishments from '@/pages/employee/MyGarnishments';
import GarnishmentDetail from '@/pages/employee/GarnishmentDetail';
// My HR pages
import Profile from '@/pages/my-hr/Profile';
import Compensation from '@/pages/my-hr/Compensation';
import Benefits from '@/pages/my-hr/Benefits';
import TimeOff from '@/pages/my-hr/TimeOff';
import Documents from '@/pages/my-hr/Documents';
import MyPerformance from '@/pages/my-hr/MyPerformance';
// Requests pages
import PTORequests from '@/pages/requests/PTORequests';
import TeamCalendar from '@/pages/requests/TeamCalendar';
import NewRequest from '@/pages/requests/NewRequest';
import AccommodationRequest from '@/pages/requests/AccommodationRequest';
import OtherRequest from '@/pages/requests/OtherRequest';
// Resources pages
import Handbook from '@/pages/resources/Handbook';
import BenefitsGuide from '@/pages/resources/BenefitsGuide';
import FAQs from '@/pages/resources/FAQs';
import Forms from '@/pages/resources/Forms';
// Team/Supervisor pages (existing, reorganized)
import TeamDashboard from '@/pages/supervisor/TeamDashboard';
import PendingReviews from '@/pages/supervisor/PendingReviews';
import Reports from '@/pages/supervisor/Reports';
// New Team pages
import DirectReports from '@/pages/team/DirectReports';
import PendingApprovals from '@/pages/team/PendingApprovals';
import PerformanceReviews from '@/pages/team/PerformanceReviews';
import PerformanceReviewDetail from '@/pages/team/PerformanceReviewDetail';
import Goals from '@/pages/team/Goals';
import PIPs from '@/pages/team/PIPs';
import HRChangeRequests from '@/pages/team/HRChangeRequests';
import EmployeeDetail from '@/pages/team/EmployeeDetail';
import LayoutSwitcher from '@/components/LayoutSwitcher';
import Notifications from '@/pages/Notifications';
import EmployeeDirectory from '@/pages/EmployeeDirectory';
import Announcements from '@/pages/Announcements';
import MySchedule from '@/pages/MySchedule';
import InternalJobsPage from '@/pages/InternalJobsPage';
import InternalJobDetailPage from '@/pages/InternalJobDetailPage';
import InternalApplicationsPage from '@/pages/InternalApplicationsPage';
// Hiring Manager pages
import NewRequisitionRequestPage from '@/pages/hiring/NewRequisitionRequestPage';
import MyRequisitionsPage from '@/pages/hiring/MyRequisitionsPage';
import RequisitionTrackerPage from '@/pages/hiring/RequisitionTrackerPage';

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
            <LayoutSwitcher />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/directory" element={<EmployeeDirectory />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/schedule" element={<MySchedule />} />

        {/* My HR Section */}
        <Route path="/my-hr/profile" element={<Profile />} />
        <Route path="/my-hr/compensation" element={<Compensation />} />
        <Route path="/my-hr/benefits" element={<Benefits />} />
        <Route path="/my-hr/time-off" element={<TimeOff />} />
        <Route path="/my-hr/documents" element={<Documents />} />
        <Route path="/my-hr/performance" element={<MyPerformance />} />

        {/* Requests & Cases - FMLA */}
        <Route path="/requests/fmla" element={<MyCases />} />
        <Route path="/requests/fmla/:id" element={<MyCases />} />
        <Route path="/requests/fmla/submit-time" element={<SubmitTime />} />
        <Route path="/requests/fmla/new" element={<RequestLeave />} />
        <Route path="/requests/fmla/submissions" element={<MySubmissions />} />

        {/* Requests & Cases - Garnishments */}
        <Route path="/requests/garnishments" element={<MyGarnishments />} />
        <Route path="/requests/garnishments/:id" element={<GarnishmentDetail />} />

        {/* Requests & Cases - PTO */}
        <Route path="/requests/pto" element={<PTORequests />} />
        <Route path="/requests/team-calendar" element={<TeamCalendar />} />

        {/* Requests - New Request */}
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/requests/accommodation" element={<AccommodationRequest />} />
        <Route path="/requests/other" element={<OtherRequest />} />

        {/* Resources */}
        <Route path="/resources/handbook" element={<Handbook />} />
        <Route path="/resources/benefits" element={<BenefitsGuide />} />
        <Route path="/resources/faqs" element={<FAQs />} />
        <Route path="/resources/forms" element={<Forms />} />

        {/* Internal Jobs */}
        <Route path="/internal-jobs" element={<InternalJobsPage />} />
        <Route path="/internal-jobs/:jobId" element={<InternalJobDetailPage />} />
        <Route path="/internal-jobs/my-applications" element={<InternalApplicationsPage />} />

        {/* Hiring Manager */}
        <Route path="/hiring/new-request" element={<NewRequisitionRequestPage />} />
        <Route path="/hiring/my-requisitions" element={<MyRequisitionsPage />} />
        <Route path="/hiring/requisitions/:id" element={<RequisitionTrackerPage />} />

        {/* Team Section - Supervisor Only */}
        <Route
          path="/team"
          element={
            <SupervisorRoute>
              <TeamDashboard />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/reports"
          element={
            <SupervisorRoute>
              <DirectReports />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/employee/:employeeId"
          element={
            <SupervisorRoute>
              <EmployeeDetail />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/approvals"
          element={
            <SupervisorRoute>
              <PendingApprovals />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/fmla-reviews"
          element={
            <SupervisorRoute>
              <PendingReviews />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/performance"
          element={
            <SupervisorRoute>
              <PerformanceReviews />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/performance/review/:reviewId"
          element={
            <SupervisorRoute>
              <PerformanceReviewDetail />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/goals"
          element={
            <SupervisorRoute>
              <Goals />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/pips"
          element={
            <SupervisorRoute>
              <PIPs />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/hr-changes"
          element={
            <SupervisorRoute>
              <HRChangeRequests />
            </SupervisorRoute>
          }
        />
        <Route
          path="/team/analytics"
          element={
            <SupervisorRoute>
              <Reports />
            </SupervisorRoute>
          }
        />

        {/* Legacy redirects for backwards compatibility */}
        <Route path="/my-cases" element={<Navigate to="/requests/fmla" replace />} />
        <Route path="/submit-time" element={<Navigate to="/requests/fmla/submit-time" replace />} />
        <Route path="/request-leave" element={<Navigate to="/requests/fmla/new" replace />} />
        <Route path="/my-submissions" element={<Navigate to="/requests/fmla/submissions" replace />} />
        <Route path="/my-garnishments" element={<Navigate to="/requests/garnishments" replace />} />
        <Route path="/my-garnishments/:id" element={<Navigate to="/requests/garnishments/:id" replace />} />
        <Route path="/pending-reviews" element={<Navigate to="/team/fmla-reviews" replace />} />
        <Route path="/reports" element={<Navigate to="/team/analytics" replace />} />
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
        <EmployeeFeaturesProvider>
          <AppRoutes />
        </EmployeeFeaturesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
