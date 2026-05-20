import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";

/**
 * useLimits — fetches /progress/limits and returns current usage vs plan limits.
 *
 * Returns:
 *   limits   — { guides, quizzes, chat, folders } each with { used, max, unlimited }
 *   isPro    — boolean shorthand
 *   refresh  — call after a generation/chat/folder to revalidate
 *   loading  — true while first fetch is in flight
 */
export function useLimits() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const d = await api.progress.limits();
      setData(d);
    } catch (_) {
      // Non-fatal — limits UI degrades gracefully, but we track the error
      // so the UI can show a fallback instead of an infinite skeleton.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // isPro: prefer the API response (includes whitelisted/admin), fall back to the
  // user object plan field so we never incorrectly show "Pro" for free users.
  const isPro = data?.is_pro ?? (
    user?.plan === "pro" || user?.plan === "lifetime"
  );

  return {
    limits:  data?.limits ?? null,
    isPro:   !!isPro,
    plan:    data?.plan   ?? user?.plan ?? "free",
    refresh: fetch,
    loading,
    error,
  };
}
