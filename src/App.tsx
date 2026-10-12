import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Pages
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DailyAttendancePage } from './pages/DailyAttendancePage.js';
import { StudentsPage } from './pages/StudentsPage.js';
import { StudentProfilePage } from './pages/StudentProfilePage.js';
import { BatchesPage } from './pages/BatchesPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { TeachersPage } from './pages/TeachersPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { StudentPortalPage } from './pages/StudentPortalPage.js';
import { AlertOctagon } from 'lucide-react';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'teacher' | 'student'>;
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs text-slate-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If student tries to access admin route, redirect to student-portal
    if (user.role === 'student') {
      return <Navigate to="/student-portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <Navigate to="/student-portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
    <AlertOctagon className="w-12 h-12 text-slate-400 mb-3" />
    <h2 className="text-lg font-bold text-slate-800">Page Not Found</h2>
    <p className="text-xs text-slate-500 mt-1 max-w-sm">
      The requested route does not exist or you do not have appropriate institutional permissions.
    </p>
    <a
      href="/"
      className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
    >
      Return to Home
    </a>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Faculty & Admin Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Core Daily Attendance */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <DailyAttendancePage />
              </ProtectedRoute>
            }
          />

          {/* Students Directory */}
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <StudentsPage />
              </ProtectedRoute>
            }
          />

          {/* Student Profile & History */}
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Classes & Batches */}
          <Route
            path="/batches"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <BatchesPage />
              </ProtectedRoute>
            }
          />

          {/* Reports & Analytics */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Teachers / Faculty Management (Admin only) */}
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TeachersPage />
              </ProtectedRoute>
            }
          />

          {/* Settings & Audit Trail (Admin only) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Student Portal (Student only or Admin preview) */}
          <Route
            path="/student-portal"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentPortalPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <NotFoundPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
