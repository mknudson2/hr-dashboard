import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import PortalLayout from '@/components/PortalLayout';

// Lazy-loaded page components
const JobListPage = lazy(() => import('@/pages/JobListPage'));
const JobDetailPage = lazy(() => import('@/pages/JobDetailPage'));
const ApplicationForm = lazy(() => import('@/pages/ApplicationForm'));
const ApplicantLoginPage = lazy(() => import('@/pages/ApplicantLoginPage'));
const MyApplicationsPage = lazy(() => import('@/pages/MyApplicationsPage'));
const ApplicationStatusPage = lazy(() => import('@/pages/ApplicationStatusPage'));
const OfferViewPage = lazy(() => import('@/pages/OfferViewPage'));
const DocumentUploadPage = lazy(() => import('@/pages/DocumentUploadPage'));
const ApplicantProfilePage = lazy(() => import('@/pages/ApplicantProfilePage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const InterviewSchedulingPage = lazy(() => import('@/pages/InterviewSchedulingPage'));
const MagicLinkVerify = lazy(() => import('@/pages/MagicLinkVerify'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<PortalLayout />}>
              <Route path="/" element={<Navigate to="/jobs" replace />} />
              <Route path="/jobs" element={<JobListPage />} />
              <Route path="/jobs/:slug" element={<JobDetailPage />} />
              <Route path="/apply/:postingId" element={<ApplicationForm />} />
              <Route path="/login" element={<ApplicantLoginPage />} />
              <Route path="/auth/verify/:token" element={<MagicLinkVerify />} />
              <Route path="/my-applications" element={<MyApplicationsPage />} />
              <Route path="/my-applications/:id" element={<ApplicationStatusPage />} />
              <Route path="/my-applications/:id/schedule-interview" element={<InterviewSchedulingPage />} />
              <Route path="/my-offers/:offerId" element={<OfferViewPage />} />
              <Route path="/my-messages" element={<MessagesPage />} />
              <Route path="/my-documents" element={<DocumentUploadPage />} />
              <Route path="/profile" element={<ApplicantProfilePage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
