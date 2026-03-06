import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import JobListPage from '@/pages/JobListPage';
import JobDetailPage from '@/pages/JobDetailPage';
import ApplicationForm from '@/pages/ApplicationForm';
import ApplicantLoginPage from '@/pages/ApplicantLoginPage';
import MyApplicationsPage from '@/pages/MyApplicationsPage';
import ApplicationStatusPage from '@/pages/ApplicationStatusPage';
import OfferViewPage from '@/pages/OfferViewPage';
import DocumentUploadPage from '@/pages/DocumentUploadPage';
import ApplicantProfilePage from '@/pages/ApplicantProfilePage';
import MagicLinkVerify from '@/pages/MagicLinkVerify';
import PortalLayout from '@/components/PortalLayout';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="/my-offers/:offerId" element={<OfferViewPage />} />
            <Route path="/my-documents" element={<DocumentUploadPage />} />
            <Route path="/profile" element={<ApplicantProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
