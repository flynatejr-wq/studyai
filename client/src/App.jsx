import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { analytics } from "./lib/analytics.js";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import FolderView from "./pages/FolderView.jsx";
import GuideView from "./pages/GuideView.jsx";
import AllGuides from "./pages/AllGuides.jsx";
import Progress from "./pages/Progress.jsx";
import Settings from "./pages/Settings.jsx";
import PublicGuide from "./pages/PublicGuide.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import NotFound from "./pages/NotFound.jsx";
import Admin from "./pages/Admin.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import UnverifiedBanner from "./components/UnverifiedBanner.jsx";
import StudyPlans from "./pages/StudyPlans.jsx";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="8" width="8" height="16" rx="1.5" fill="rgba(255,255,255,0.9)"/>
            <rect x="18" y="8" width="8" height="16" rx="1.5" fill="rgba(255,255,255,0.6)"/>
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-sm">StudyBuddi</p>
        <p className="text-gray-600 text-xs mt-1">Loading your workspace…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function PageTracker() {
  const location = useLocation();
  useEffect(() => { analytics.page(location.pathname); }, [location.pathname]);
  return null;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      {/* Show banner for logged-in users who haven't verified their email */}
      <UnverifiedBanner />
    <Routes>
      <Route path="*" element={<PageTracker />} />
      {/* Public */}
      <Route path="/"                element={<GuestRoute><Landing /></GuestRoute>} />
      <Route path="/login"           element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup"          element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/verify-email"    element={<VerifyEmail />} />
      <Route path="/share/:token"    element={<PublicGuide />} />
      <Route path="/terms"           element={<Terms />} />
      <Route path="/privacy"         element={<Privacy />} />

      {/* Protected */}
      <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/folder/:id" element={<ProtectedRoute><FolderView /></ProtectedRoute>} />
      <Route path="/guide/:id"  element={<ProtectedRoute><GuideView /></ProtectedRoute>} />
      <Route path="/guides"     element={<ProtectedRoute><AllGuides /></ProtectedRoute>} />
      <Route path="/progress"   element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/study-plans" element={<ProtectedRoute><StudyPlans /></ProtectedRoute>} />
      <Route path="/admin"      element={<AdminRoute><Admin /></AdminRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

