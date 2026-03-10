import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeDetailPage from "./pages/EmployeeDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import FMLAPage from "./pages/FMLAPage";
import GarnishmentsPage from "./pages/GarnishmentsPage";
import TurnoverPage from "./pages/TurnoverPage";
import EventsPage from "./pages/EventsPage";
import ContributionsPage from "./pages/ContributionsPage";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalyticsPage";
import CompensationPage from "./pages/CompensationPage";
import PerformancePage from "./pages/PerformancePage";
import OnboardingPage from "./pages/OnboardingPage";
import OffboardingPage from "./pages/OffboardingPage";
import EquipmentPage from "./pages/EquipmentPage";
import PayrollPage from "./pages/PayrollPage";
import OvertimePage from "./pages/OvertimePage";
import UserManagementPage from "./pages/UserManagementPage";
import ACAPage from "./pages/ACAPage";
import EEOPage from "./pages/EEOPage";
import EmailManagementPage from "./pages/EmailManagementPage";
import FileUploadPage from "./pages/FileUploadPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import TimesheetApprovalPage from "./pages/TimesheetApprovalPage";
import CapitalizationAnalyticsPage from "./pages/CapitalizationAnalyticsPage";
import CapitalizedLaborPage from "./pages/CapitalizedLaborPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import PARApprovalsPage from "./pages/PARApprovalsPage";
import ContentManagementPage from "./pages/ContentManagementPage";
import RecruitingPage from "./pages/RecruitingPage";
import RequisitionListPage from "./pages/RequisitionListPage";
import RequisitionDetailPage from "./pages/RequisitionDetailPage";
import PipelineTemplatePage from "./pages/PipelineTemplatePage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import PipelineKanbanView from "./pages/PipelineKanbanView";
import ScorecardFormPage from "./pages/ScorecardFormPage";
import InterviewSchedulerPage from "./pages/InterviewSchedulerPage";
import CandidateComparisonPage from "./pages/CandidateComparisonPage";
import OfferBuilderPage from "./pages/OfferBuilderPage";
import DocumentRequestPanel from "./pages/DocumentRequestPanel";
import EmailComposerPage from "./pages/EmailComposerPage";
import HireConversionWizard from "./pages/HireConversionWizard";
import HireConversionList from "./pages/HireConversionList";
import RecruitingAnalyticsPage from "./pages/RecruitingAnalyticsPage";
import EEOApplicantReportPage from "./pages/EEOApplicantReportPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/fmla" element={<FMLAPage />} />
        <Route path="/garnishments" element={<GarnishmentsPage />} />
        <Route path="/turnover" element={<TurnoverPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/contributions" element={<ContributionsPage />} />
        <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
        <Route path="/compensation" element={<CompensationPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/offboarding" element={<OffboardingPage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/overtime" element={<OvertimePage />} />
        <Route path="/pto-tracking" element={<Navigate to="/overtime" replace />} />
        <Route path="/aca" element={<ACAPage />} />
        <Route path="/eeo" element={<EEOPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/roles" element={<RoleManagementPage />} />
        <Route path="/par-approvals" element={<PARApprovalsPage />} />
        <Route path="/emails" element={<EmailManagementPage />} />
        <Route path="/file-uploads" element={<FileUploadPage />} />
        <Route path="/capitalized-labor" element={<CapitalizedLaborPage />} />
        <Route path="/content-management" element={<ContentManagementPage />} />
        <Route path="/recruiting" element={<RecruitingPage />} />
        <Route path="/recruiting/requisitions" element={<RequisitionListPage />} />
        <Route path="/recruiting/requisitions/:id" element={<RequisitionDetailPage />} />
        <Route path="/recruiting/pipelines" element={<PipelineTemplatePage />} />
        <Route path="/recruiting/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/recruiting/requisitions/:reqId/kanban" element={<PipelineKanbanView />} />
        <Route path="/recruiting/scorecards/:scorecardId" element={<ScorecardFormPage />} />
        <Route path="/recruiting/schedule-interview" element={<InterviewSchedulerPage />} />
        <Route path="/recruiting/compare" element={<CandidateComparisonPage />} />
        <Route path="/recruiting/offers/new" element={<OfferBuilderPage />} />
        <Route path="/recruiting/offers/:offerId" element={<OfferBuilderPage />} />
        <Route path="/recruiting/document-requests" element={<DocumentRequestPanel />} />
        <Route path="/recruiting/email" element={<EmailComposerPage />} />
        <Route path="/recruiting/conversions" element={<HireConversionList />} />
        <Route path="/recruiting/hire-wizard" element={<HireConversionWizard />} />
        <Route path="/recruiting/analytics" element={<RecruitingAnalyticsPage />} />
        <Route path="/recruiting/analytics/eeo" element={<EEOApplicantReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
