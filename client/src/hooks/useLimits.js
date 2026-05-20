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

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const d = await api.progress.limits();
      setData(d);
    } catch (_) {
      // Non-fatal — limits UI degrades gracefully
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    limits:  data?.limits  ?? null,
    isPro:   data?.is_pro  ?? (user?.plan === "pro"),
    plan:    data?.plan    ?? user?.plan ?? "free",
    refresh: fetch,
    loading,
  };
}
