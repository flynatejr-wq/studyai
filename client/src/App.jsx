import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-indigo-400 animate-pulse text-lg font-medium">Loading StudyBuddi...</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                element={<GuestRoute><Landing /></GuestRoute>} />
      <Route path="/login"           element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup"          element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password"  element={<ResetPassword />} />
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

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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

