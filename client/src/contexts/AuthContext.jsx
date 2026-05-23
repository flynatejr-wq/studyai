import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api.js";
import { analytics } from "../lib/analytics.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.auth.me()
        .then(setUser)
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem("token", token);
    setUser(user);
    analytics.identify(user.id, { plan: user.plan, role: user.role });
    analytics.track("user_logged_in");
    return user;
  };

  const signup = async (name, email, password, ref = null) => {
    const result = await api.auth.signup({ name, email, password, ...(ref ? { ref } : {}) });
    // If email verification is required, return the flag — don't log in yet
    if (result.requiresVerification) {
      analytics.track("user_signed_up");
      return result;
    }
    // Dev mode (no email config) — log in immediately
    localStorage.setItem("token", result.token);
    setUser(result.user);
    analytics.identify(result.user.id, { plan: result.user.plan, role: result.user.role });
    analytics.track("user_signed_up");
    return result;
  };

  // Used by VerifyEmail page to log the user in after clicking their link
  const loginWithToken = (token, user) => {
    localStorage.setItem("token", token);
    setUser(user);
    analytics.identify(user.id, { plan: user.plan, role: user.role });
    analytics.track("email_verified");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    analytics.reset();
  };

  const refreshUser = async () => {
    const updated = await api.auth.me();
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
