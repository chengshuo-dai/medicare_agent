import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import patientTheme from './theme';
import doctorTheme from './themes/doctorTheme';
import { getUserRole, isLoggedIn } from './api/auth';

// Patient layout (with bottom nav)
const PatientLayout = lazy(() => import('./components/PatientLayout'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ChatPage = lazy(() => import('./components/ChatPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HealthProfilePage = lazy(() => import('./patient/pages/HealthProfilePage'));
const FollowUpPage = lazy(() => import('./patient/pages/FollowUpPage'));
const MedicationReminderPage = lazy(() => import('./patient/pages/MedicationReminderPage'));

// Public
const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginPage = lazy(() => import('./auth/LoginPage'));
const RegisterPage = lazy(() => import('./auth/RegisterPage'));

// Doctor portal
const DoctorLayout = lazy(() => import('./doctor/layout/DoctorLayout'));
const DoctorDashboard = lazy(() => import('./doctor/pages/DoctorDashboard'));
const DoctorCases = lazy(() => import('./doctor/pages/DoctorCases'));
const CaseDetailPage = lazy(() => import('./doctor/pages/CaseDetailPage'));

// Admin portal
import AdminLayout from './admin/layout/AdminLayout';
import DashboardPage from './admin/pages/DashboardPage';
import DoctorVerificationPage from './admin/pages/DoctorVerificationPage';
import LLMProvidersPage from './admin/pages/LLMProvidersPage';
import SystemSettingsPage from './admin/pages/SystemSettingsPage';
import KnowledgeBasePage from './admin/pages/KnowledgeBasePage';
import ReviewQueuePage from './admin/pages/ReviewQueuePage';
import AuditLogsPage from './admin/pages/AuditLogsPage';
import UsersPage from './admin/pages/UsersPage';
import NotificationsPage from './admin/pages/NotificationsPage';
import EmailManagementPage from './admin/pages/EmailManagementPage';
const ObservabilityPage = lazy(() => import('./admin/pages/ObservabilityPage'));

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const userRole = getUserRole();
  if (userRole !== role) {
    if (userRole === 'admin') return <>{children}</>;
    return <Navigate to={userRole === 'doctor' ? '/doctor' : '/home'} replace />;
  }
  return <>{children}</>;
}

function DoctorThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={doctorTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider theme={patientTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Patient portal — with bottom nav */}
            <Route element={<PatientLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/records/health" element={<RequireRole role="patient"><HealthProfilePage /></RequireRole>} />
              <Route path="/records/followups" element={<RequireRole role="patient"><FollowUpPage /></RequireRole>} />
              <Route path="/records/reminders" element={<RequireRole role="patient"><MedicationReminderPage /></RequireRole>} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Legacy patient routes — redirect to new paths */}
            <Route path="/health" element={<Navigate to="/records/health" replace />} />
            <Route path="/followups" element={<Navigate to="/records/followups" replace />} />
            <Route path="/reminders" element={<Navigate to="/records/reminders" replace />} />

            {/* Doctor portal — top tab layout */}
            <Route path="/doctor" element={<RequireRole role="doctor"><DoctorThemeProvider><DoctorLayout /></DoctorThemeProvider></RequireRole>}>
              <Route index element={<DoctorDashboard />} />
              <Route path="cases" element={<DoctorCases />} />
              <Route path="cases/:caseId" element={<CaseDetailPage />} />
            </Route>

            {/* Admin portal — top tab layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="doctors" element={<DoctorVerificationPage />} />
              <Route path="providers" element={<LLMProvidersPage />} />
              <Route path="settings" element={<SystemSettingsPage />} />
              <Route path="knowledge" element={<KnowledgeBasePage />} />
              <Route path="reviews" element={<ReviewQueuePage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="observability" element={<Suspense fallback={<LoadingFallback />}><ObservabilityPage /></Suspense>} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="email" element={<EmailManagementPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
