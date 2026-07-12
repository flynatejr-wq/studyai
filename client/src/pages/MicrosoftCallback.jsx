import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function MicrosoftCallback() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Token arrives in the hash fragment (#token=...) so it never hits server logs or browser history
    const hash   = new URLSearchParams(window.location.hash.slice(1));
    const token  = hash.get("token");
    const params = new URLSearchParams(window.location.search);
    const error  = params.get("error");

    if (!token) {
      const msg = error === "banned"
        ? "Your account has been suspended."
        : error === "microsoft_cancelled"
        ? ""
        : "Microsoft sign-in failed. Please try again.";
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
      .catch(() => navigate("/login?error=microsoft_failed", { replace: true }));
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg width="20" height="20" viewBox="0 0 23 23">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
            <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
          </svg>
        </div>
        <p className="text-white font-bold text-sm">Signing you in…</p>
        <p className="text-gray-500 text-xs mt-1">Just a moment</p>
      </div>
    </div>
  );
}
