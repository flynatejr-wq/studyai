import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../api.js";

/**
 * /auth/google/callback
 * Landing page after Google OAuth. The backend redirects here with ?token=JWT
 * or ?error=reason. We read the token, fetch the user, and log them in.
 */
export default function GoogleCallback() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    const error  = params.get("error");

    if (!token) {
      const msg = error === "banned"
        ? "Your account has been suspended."
        : error === "google_cancelled"
        ? ""
        : "Google sign-in failed. Please try again.";
      navigate(`/login${msg ? `?error=${encodeURIComponent(msg)}` : ""}`, { replace: true });
      return;
    }

    // Fetch the full user object using the token
    fetch(`${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(user => {
        loginWithToken(token, user);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => navigate("/login?error=google_failed", { replace: true }));
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="8" width="8" height="16" rx="1.5" fill="rgba(255,255,255,0.9)"/>
            <rect x="18" y="8" width="8" height="16" rx="1.5" fill="rgba(255,255,255,0.6)"/>
          </svg>
        </div>
        <p className="text-white font-bold text-sm">Signing you in…</p>
        <p className="text-gray-500 text-xs mt-1">Just a moment</p>
      </div>
    </div>
  );
}
