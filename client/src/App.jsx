import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { analytics } from "./lib/analytics.js";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import UnverifiedBanner from "./components/UnverifiedBanner.jsx";

// ── Eagerly loaded (critical path — on screen within 1 render) ───────────────
import Landing        from "./pages/Landing.jsx";
import Login          from "./pages/Login.jsx";
import Signup         from "./pages/Signup.jsx";

// ── Lazy loaded (each gets its own JS chunk, fetched only when navigated to) ──
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword  = lazy(() => import("./pages/ResetPassword.jsx"));
const Dashboard      = lazy(() => import("./pages/Dashboard.jsx"));
const FolderView     = lazy(() => import("./pages/FolderView.jsx"));
const GuideView      = lazy(() => import("./pages/GuideView.jsx"));
const AllGuides      = lazy(() => import("./pages/AllGuides.jsx"));
const Progress       = lazy(() => import("./pages/Progress.jsx"));
const Settings       = lazy(() => import("./pages/Settings.jsx"));
const PublicGuide    = lazy(() => import("./pages/PublicGuide.jsx"));
const Terms          = lazy(() => import("./pages/Terms.jsx"));
const Privacy        = lazy(() => import("./pages/Privacy.jsx"));
const Refund         = lazy(() => import("./pages/Refund.jsx"));
const Contact        = lazy(() => import("./pages/Contact.jsx"));
const NotFound       = lazy(() => import("./pages/NotFound.jsx"));
const Admin          = lazy(() => import("./pages/Admin.jsx"));
const VerifyEmail    = lazy(() => import("./pages/VerifyEmail.jsx"));
const StudyPlans     = lazy(() => import("./pages/StudyPlans.jsx"));

// ── Shared loading fallback ───────────────────────────────────────────────────
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
      <Suspense fallback={<LoadingScreen />}>
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
          <Route path="/refund"          element={<Refund />} />
          <Route path="/contact"         element={<Contact />} />

          {/* Protected */}
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/folder/:id"  element={<ProtectedRoute><FolderView /></ProtectedRoute>} />
          <Route path="/guide/:id"   element={<ProtectedRoute><GuideView /></ProtectedRoute>} />
          <Route path="/guides"      element={<ProtectedRoute><AllGuides /></ProtectedRoute>} />
          <Route path="/progress"    element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/study-plans" element={<ProtectedRoute><StudyPlans /></ProtectedRoute>} />
          <Route path="/admin"       element={<AdminRoute><Admin /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  // Dev: always show splash on every page load so the animation is easy to iterate on.
  // Prod: show once per browser session, then skip.
  const [showSplash, setShowSplash] = useState(
    () => import.meta.env.DEV || !sessionStorage.getItem("sb_splash_done")
  );

  const handleSplashComplete = () => {
    // Mark as seen so production builds skip on subsequent visits
    sessionStorage.setItem("sb_splash_done", "1");
    setShowSplash(false);
  };

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            {/*
             * AppRoutes ALWAYS renders — auth checks, data fetching, and route
             * resolution all happen in the background while the splash plays.
             * The splash sits on top via z-[9999] inside SplashScreen; the user
             * never sees the underlying app until the exit animation completes.
             */}
            <AppRoutes />

            {/* Splash overlay */}
            <AnimatePresence>
              {showSplash && (
                <SplashScreen key="sb-splash" onComplete={handleSplashComplete} />
              )}
            </AnimatePresence>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
