import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

// Lazy-loaded page components
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const EmployeeDetailPage = lazy(() => import("./pages/EmployeeDetailPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const FMLAPage = lazy(() => import("./pages/FMLAPage"));
const GarnishmentsPage = lazy(() => import("./pages/GarnishmentsPage"));
const TurnoverPage = lazy(() => import("./pages/TurnoverPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const ContributionsPage = lazy(() => import("./pages/ContributionsPage"));
const AdvancedAnalyticsPage = lazy(() => import("./pages/AdvancedAnalyticsPage"));
const CompensationPage = lazy(() => import("./pages/CompensationPage"));
const OrgChartPage = lazy(() => import("./pages/OrgChartPage"));
const PerformancePage = lazy(() => import("./pages/PerformancePage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const OffboardingPage = lazy(() => import("./pages/OffboardingPage"));
const EquipmentPage = lazy(() => import("./pages/EquipmentPage"));
const PayrollPage = lazy(() => import("./pages/PayrollPage"));
const OvertimePage = lazy(() => import("./pages/OvertimePage"));
const ACAPage = lazy(() => import("./pages/ACAPage"));
const EEOPage = lazy(() => import("./pages/EEOPage"));
const EmailManagementPage = lazy(() => import("./pages/EmailManagementPage"));
const FileUploadPage = lazy(() => import("./pages/FileUploadPage"));
const TimeTrackingPage = lazy(() => import("./pages/TimeTrackingPage"));
const TimesheetApprovalPage = lazy(() => import("./pages/TimesheetApprovalPage"));
const CapitalizationAnalyticsPage = lazy(() => import("./pages/CapitalizationAnalyticsPage"));
const CapitalizedLaborPage = lazy(() => import("./pages/CapitalizedLaborPage"));
const PARApprovalsPage = lazy(() => import("./pages/PARApprovalsPage"));
const RecruitingPage = lazy(() => import("./pages/RecruitingPage"));
const RequisitionListPage = lazy(() => import("./pages/RequisitionListPage"));
const RequisitionDetailPage = lazy(() => import("./pages/RequisitionDetailPage"));
const PipelineTemplatePage = lazy(() => import("./pages/PipelineTemplatePage"));
const ApplicationDetailPage = lazy(() => import("./pages/ApplicationDetailPage"));
const PipelineKanbanView = lazy(() => import("./pages/PipelineKanbanView"));
const ScorecardFormPage = lazy(() => import("./pages/ScorecardFormPage"));
const CandidateComparisonPage = lazy(() => import("./pages/CandidateComparisonPage"));
const OfferBuilderPage = lazy(() => import("./pages/OfferBuilderPage"));
const DocumentRequestPanel = lazy(() => import("./pages/DocumentRequestPanel"));
const EmailComposerPage = lazy(() => import("./pages/EmailComposerPage"));
const HireConversionWizard = lazy(() => import("./pages/HireConversionWizard"));
const HireConversionList = lazy(() => import("./pages/HireConversionList"));
const RecruitingAnalyticsPage = lazy(() => import("./pages/RecruitingAnalyticsPage"));
const EEOApplicantReportPage = lazy(() => import("./pages/EEOApplicantReportPage"));
const JobDescriptionsPage = lazy(() => import("./pages/JobDescriptionsPage"));
const OfferLetterTemplatesPage = lazy(() => import("./pages/OfferLetterTemplatesPage"));
const ScorecardTemplateManagerPage = lazy(() => import("./pages/ScorecardTemplateManagerPage"));
const AvailabilityManagementPage = lazy(() => import("./pages/AvailabilityManagementPage"));
const ApplicantPoolPage = lazy(() => import("./pages/ApplicantPoolPage"));
const OfferListPage = lazy(() => import("./pages/OfferListPage"));
const NegotiationTrackingPage = lazy(() => import("./pages/NegotiationTrackingPage"));
const IntegrationManagementPage = lazy(() => import("./pages/IntegrationManagementPage"));
const ScreeningDashboard = lazy(() => import("./features/screening").then(m => ({ default: m.ScreeningDashboard })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/org-chart" element={<OrgChartPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/offboarding" element={<OffboardingPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/overtime" element={<OvertimePage />} />
          <Route path="/pto-tracking" element={<Navigate to="/overtime" replace />} />
          <Route path="/aca" element={<ACAPage />} />
          <Route path="/eeo" element={<EEOPage />} />
          <Route path="/users" element={<Navigate to="/settings?tab=users" replace />} />
          <Route path="/roles" element={<Navigate to="/settings?tab=roles" replace />} />
          <Route path="/par-approvals" element={<PARApprovalsPage />} />
          <Route path="/emails" element={<EmailManagementPage />} />
          <Route path="/file-uploads" element={<FileUploadPage />} />
          <Route path="/capitalized-labor" element={<CapitalizedLaborPage />} />
          <Route path="/content-management" element={<Navigate to="/settings?tab=content" replace />} />
          <Route path="/recruiting" element={<RecruitingPage />} />
          <Route path="/recruiting/requisitions" element={<RequisitionListPage />} />
          <Route path="/recruiting/requisitions/:id" element={<RequisitionDetailPage />} />
          <Route path="/recruiting/pipelines" element={<PipelineTemplatePage />} />
          <Route path="/recruiting/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/recruiting/requisitions/:reqId/kanban" element={<PipelineKanbanView />} />
          <Route path="/recruiting/requisitions/:reqId/selection" element={<CandidateComparisonPage />} />
          <Route path="/recruiting/scorecards/:scorecardId" element={<ScorecardFormPage />} />
          <Route path="/recruiting/compare" element={<CandidateComparisonPage />} />
          <Route path="/recruiting/offers" element={<OfferListPage />} />
          <Route path="/recruiting/offers/new" element={<OfferBuilderPage />} />
          <Route path="/recruiting/offers/:offerId" element={<OfferBuilderPage />} />
          <Route path="/recruiting/offers/:offerId/negotiation" element={<NegotiationTrackingPage />} />
          <Route path="/recruiting/document-requests" element={<DocumentRequestPanel />} />
          <Route path="/recruiting/email" element={<EmailComposerPage />} />
          <Route path="/recruiting/conversions" element={<HireConversionList />} />
          <Route path="/recruiting/hire-wizard" element={<HireConversionWizard />} />
          <Route path="/recruiting/analytics" element={<RecruitingAnalyticsPage />} />
          <Route path="/recruiting/analytics/eeo" element={<EEOApplicantReportPage />} />
          <Route path="/recruiting/job-descriptions" element={<JobDescriptionsPage />} />
          <Route path="/recruiting/offer-letter-templates" element={<OfferLetterTemplatesPage />} />
          <Route path="/recruiting/scorecard-templates" element={<ScorecardTemplateManagerPage />} />
          <Route path="/recruiting/availability" element={<AvailabilityManagementPage />} />
          <Route path="/recruiting/pool" element={<ApplicantPoolPage />} />
          <Route path="/recruiting/integrations" element={<IntegrationManagementPage />} />
          <Route path="/screening" element={<ScreeningDashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
