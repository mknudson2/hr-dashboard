import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { EmployeeFeaturesProvider } from '@/contexts/EmployeeFeaturesContext';
import LoginPage from '@/pages/LoginPage';
import LayoutSwitcher from '@/components/LayoutSwitcher';

// Lazy-loaded pages — Dashboard
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const EmployeeDirectory = lazy(() => import('@/pages/EmployeeDirectory'));
const Announcements = lazy(() => import('@/pages/Announcements'));
const MySchedule = lazy(() => import('@/pages/MySchedule'));

// FMLA & Garnishment pages
const MyCases = lazy(() => import('@/pages/employee/MyCases'));
const SubmitTime = lazy(() => import('@/pages/employee/SubmitTime'));
const RequestLeave = lazy(() => import('@/pages/employee/RequestLeave'));
const MySubmissions = lazy(() => import('@/pages/employee/MySubmissions'));
const MyGarnishments = lazy(() => import('@/pages/employee/MyGarnishments'));
const GarnishmentDetail = lazy(() => import('@/pages/employee/GarnishmentDetail'));

// My HR pages
const Profile = lazy(() => import('@/pages/my-hr/Profile'));
const Compensation = lazy(() => import('@/pages/my-hr/Compensation'));
const Benefits = lazy(() => import('@/pages/my-hr/Benefits'));
const TimeOff = lazy(() => import('@/pages/my-hr/TimeOff'));
const Documents = lazy(() => import('@/pages/my-hr/Documents'));
const MyPerformance = lazy(() => import('@/pages/my-hr/MyPerformance'));

// Requests pages
const PTORequests = lazy(() => import('@/pages/requests/PTORequests'));
const TeamCalendar = lazy(() => import('@/pages/requests/TeamCalendar'));
const NewRequest = lazy(() => import('@/pages/requests/NewRequest'));
const AccommodationRequest = lazy(() => import('@/pages/requests/AccommodationRequest'));
const OtherRequest = lazy(() => import('@/pages/requests/OtherRequest'));

// Resources pages
const Handbook = lazy(() => import('@/pages/resources/Handbook'));
const BenefitsGuide = lazy(() => import('@/pages/resources/BenefitsGuide'));
const FAQs = lazy(() => import('@/pages/resources/FAQs'));
const Forms = lazy(() => import('@/pages/resources/Forms'));

// Team/Supervisor pages
const TeamDashboard = lazy(() => import('@/pages/supervisor/TeamDashboard'));
const PendingReviews = lazy(() => import('@/pages/supervisor/PendingReviews'));
const Reports = lazy(() => import('@/pages/supervisor/Reports'));
const DirectReports = lazy(() => import('@/pages/team/DirectReports'));
const PendingApprovals = lazy(() => import('@/pages/team/PendingApprovals'));
const PerformanceReviews = lazy(() => import('@/pages/team/PerformanceReviews'));
const PerformanceReviewDetail = lazy(() => import('@/pages/team/PerformanceReviewDetail'));
const Goals = lazy(() => import('@/pages/team/Goals'));
const PIPs = lazy(() => import('@/pages/team/PIPs'));
const HRChangeRequests = lazy(() => import('@/pages/team/HRChangeRequests'));
const EmployeeDetail = lazy(() => import('@/pages/team/EmployeeDetail'));

// Internal Jobs
const InternalJobsPage = lazy(() => import('@/pages/InternalJobsPage'));
const InternalJobDetailPage = lazy(() => import('@/pages/InternalJobDetailPage'));
const InternalApplicationsPage = lazy(() => import('@/pages/InternalApplicationsPage'));

// Annual Wage Increase
const AnnualIncreaseDashboard = lazy(() => import('@/pages/AnnualIncreaseDashboard'));

// Hiring Manager pages
const NewRequisitionRequestPage = lazy(() => import('@/pages/hiring/NewRequisitionRequestPage'));
const MyRequisitionsPage = lazy(() => import('@/pages/hiring/MyRequisitionsPage'));
const RequisitionTrackerPage = lazy(() => import('@/pages/hiring/RequisitionTrackerPage'));
const ScorecardTemplatesPage = lazy(() => import('@/pages/hiring/ScorecardTemplatesPage'));
const CandidateSelectionPage = lazy(() => import('@/pages/hiring/CandidateSelectionPage'));
const NegotiationTimelinePage = lazy(() => import('@/pages/hiring/NegotiationTimelinePage'));
const HiringApprovalsPage = lazy(() => import('@/pages/hiring/PendingApprovalsPage'));
const AvailabilitySubmissionPage = lazy(() => import('@/pages/hiring/AvailabilitySubmissionPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bifrost-violet"></div>
    </div>
  );
}

// Redirect component for garnishment detail (handles :id parameter properly)
function GarnishmentRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/requests/garnishments/${id}`} replace />;
}

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
    <Suspense fallback={<PageLoader />}>
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

          {/* Annual Wage Increase */}
          <Route path="/annual-increase" element={<AnnualIncreaseDashboard />} />

          {/* Internal Jobs */}
          <Route path="/internal-jobs" element={<InternalJobsPage />} />
          <Route path="/internal-jobs/:jobId" element={<InternalJobDetailPage />} />
          <Route path="/internal-jobs/my-applications" element={<InternalApplicationsPage />} />

          {/* Hiring Manager */}
          <Route path="/hiring/new-request" element={<NewRequisitionRequestPage />} />
          <Route path="/hiring/my-requisitions" element={<MyRequisitionsPage />} />
          <Route path="/hiring/requisitions/:id" element={<RequisitionTrackerPage />} />
          <Route path="/hiring/scorecard-templates" element={<ScorecardTemplatesPage />} />
          <Route path="/hiring/requisitions/:reqId/selection" element={<CandidateSelectionPage />} />
          <Route path="/hiring/requisitions/:reqId/negotiation/:offerId" element={<NegotiationTimelinePage />} />
          <Route path="/hiring/requisitions/:id/availability" element={<AvailabilitySubmissionPage />} />
          <Route path="/hiring/approvals" element={<HiringApprovalsPage />} />

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
          <Route path="/my-garnishments/:id" element={<GarnishmentRedirect />} />
          <Route path="/pending-reviews" element={<Navigate to="/team/fmla-reviews" replace />} />
          <Route path="/reports" element={<Navigate to="/team/analytics" replace />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
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
