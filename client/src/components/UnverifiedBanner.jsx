import { useState } from "react";
import { MailWarning, X, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { api } from "../api.js";

/**
 * Sticky banner shown at the top of the page when the logged-in user
 * hasn't verified their email address yet.
 *
 * • Only appears when SMTP is configured on the server (otherwise there's nothing to verify)
 * • Dismissible per session (state stays in component memory)
 * • "Resend" button rate-limited to prevent spam (30-second cooldown)
 */
export default function UnverifiedBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // Only show for logged-in users with email_verified explicitly set to 0
  // (null/undefined means the column doesn't exist yet — don't nag old accounts)
  if (!user || user.email_verified !== 0 || dismissed) return null;

  const handleResend = async () => {
    if (cooldown || sending) return;
    setSending(true);
    try {
      await api.auth.resendVerification();
      toast({ message: "Verification email sent! Check your inbox.", type: "success" });
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30_000);
    } catch (err) {
      // If SMTP isn't configured, silently dismiss the banner so we don't nag
      if (err.message?.includes("not configured")) {
        setDismissed(true);
        return;
      }
      toast({ message: err.message, type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 backdrop-blur-sm border-b border-amber-400/50 px-3 py-2 flex items-center justify-between gap-2 shadow-lg"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
      <div className="flex items-center gap-2 min-w-0">
        <MailWarning size={14} className="text-amber-900 shrink-0" />
        <p className="text-amber-900 text-xs font-semibold truncate">
          <span className="hidden sm:inline">Please verify your email to unlock all features.</span>
          <span className="sm:hidden">Verify your email.</span>
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleResend}
          disabled={sending || cooldown}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-400/50 hover:bg-amber-400/80 disabled:opacity-50 px-2.5 py-2 rounded-lg transition-colors min-h-[36px]">
          <RefreshCw size={11} className={sending ? "animate-spin" : ""} />
          <span className="hidden xs:inline">{sending ? "Sending…" : cooldown ? "Sent!" : "Resend"}</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-amber-900/70 hover:text-amber-900 p-2 rounded-lg hover:bg-amber-400/40 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
