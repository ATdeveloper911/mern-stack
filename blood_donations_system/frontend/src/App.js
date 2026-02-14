import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout Components
import LandingLayout from './layouts/LandingLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import ProfilePage from './pages/dashboard/ProfilePage';
import BloodRequestsPage from './pages/dashboard/BloodRequestsPage';
import DonationsPage from './pages/dashboard/DonationsPage';
import NotificationsPage from './pages/dashboard/NotificationsPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import SettingsPage from './pages/dashboard/SettingsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import AuditTrail from './pages/admin/AuditTrail';
import ReportsPage from './pages/admin/ReportsPage';

// Medical Admin Pages
import MedicalVerifications from './pages/medical/MedicalVerifications';
import MedicalReports from './pages/medical/MedicalReports';

// Protected Route Component
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <SocketProvider>
              <div className="App min-h-screen bg-neutral-50">
                <Routes>
                  {/* Landing Page */}
                  <Route path="/" element={
                    <LandingLayout>
                      <LandingPage />
                    </LandingLayout>
                  } />

                  {/* Authentication Routes */}
                  <Route path="/auth" element={
                    <AuthLayout>
                      <Navigate to="/auth/login" replace />
                    </AuthLayout>
                  } />
                  <Route path="/auth/login" element={
                    <AuthLayout>
                      <LoginPage />
                    </AuthLayout>
                  } />
                  <Route path="/auth/register" element={
                    <AuthLayout>
                      <RegisterPage />
                    </AuthLayout>
                  } />
                  <Route path="/auth/forgot-password" element={
                    <AuthLayout>
                      <ForgotPasswordPage />
                    </AuthLayout>
                  } />
                  <Route path="/auth/reset-password" element={
                    <AuthLayout>
                      <ResetPasswordPage />
                    </AuthLayout>
                  } />
                  <Route path="/auth/verify-email" element={
                    <AuthLayout>
                      <VerifyEmailPage />
                    </AuthLayout>
                  } />

                  {/* Dashboard Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <DashboardHome />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/profile" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ProfilePage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/blood-requests" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <BloodRequestsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/donations" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <DonationsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/notifications" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <NotificationsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/analytics" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <AnalyticsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/settings" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <SettingsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* System Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute requiredRole={['system_admin']}>
                      <DashboardLayout>
                        <AdminDashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute requiredRole={['system_admin']}>
                      <DashboardLayout>
                        <UserManagement />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <ProtectedRoute requiredRole={['system_admin']}>
                      <DashboardLayout>
                        <SystemSettings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/audit" element={
                    <ProtectedRoute requiredRole={['system_admin']}>
                      <DashboardLayout>
                        <AuditTrail />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/reports" element={
                    <ProtectedRoute requiredRole={['system_admin']}>
                      <DashboardLayout>
                        <ReportsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* Medical Admin Routes */}
                  <Route path="/medical/users" element={
                    <ProtectedRoute requiredRole={['medical_admin']}>
                      <DashboardLayout>
                        <UserManagement />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/medical/verifications" element={
                    <ProtectedRoute requiredRole={['medical_admin']}>
                      <DashboardLayout>
                        <MedicalVerifications />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/medical/reports" element={
                    <ProtectedRoute requiredRole={['medical_admin']}>
                      <DashboardLayout>
                        <MedicalReports />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* Catch all route */}
                  <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-blood-600 mb-4">404</h1>
                        <p className="text-neutral-600 mb-8">Page not found</p>
                        <Navigate to="/" replace />
                      </div>
                    </div>
                  } />
                </Routes>

                {/* Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#fff',
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    },
                    success: {
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </SocketProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
