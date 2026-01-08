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
        <Route path="/emails" element={<EmailManagementPage />} />
        <Route path="/file-uploads" element={<FileUploadPage />} />
        <Route path="/capitalized-labor" element={<CapitalizedLaborPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
