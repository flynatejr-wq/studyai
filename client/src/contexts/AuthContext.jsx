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
    const { token, user } = await api.auth.signup({ name, email, password, ...(ref ? { ref } : {}) });
    localStorage.setItem("token", token);
    setUser(user);
    analytics.identify(user.id, { plan: user.plan, role: user.role });
    analytics.track("user_signed_up");
    return user;
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
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
