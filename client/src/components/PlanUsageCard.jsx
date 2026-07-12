import { Crown, Zap, MessageSquare, BookOpen, FolderOpen, ArrowRight, Sparkles, Volume2 } from "lucide-react";
import { useLimits } from "../hooks/useLimits.js";
import { api } from "../api.js";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const SSU_DOMAIN = "savannahstate.edu";

// Compact display for large counts (character quotas): 3420 -> "3.4k", 150000 -> "150k"
const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

// ── Single usage row ──────────────────────────────────────────────────────────
function UsageRow({ icon: Icon, label, used, max, unlimited, color = "indigo", format }) {
  if (unlimited) return null;

  const pct     = Math.min((used / max) * 100, 100);
  const atLimit = used >= max;
  const nearLimit = pct >= 70 && !atLimit;

  const barColor = atLimit
    ? "bg-red-500"
    : nearLimit
      ? "bg-amber-500"
      : color === "violet" ? "bg-violet-500" : "bg-indigo-500";

  const countColor = atLimit
    ? "text-red-400"
    : nearLimit
      ? "text-amber-400"
      : "text-gray-400";

  const fmt = format || ((n) => n);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={12} className={atLimit ? "text-red-400" : nearLimit ? "text-amber-400" : "text-gray-500"} />
          <span className="text-xs text-gray-400 truncate">{label}</span>
        </div>
        <span className={`text-xs font-bold shrink-0 tabular-nums ${countColor}`}>
          {fmt(used)}/{fmt(max)}
        </span>
      </div>
      <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function PlanUsageCard({ compact = false }) {
  const { limits, isPro, loading, error } = useLimits();
  const { user } = useAuth();
  const isSSU = !!user?.email?.toLowerCase().endsWith(SSU_DOMAIN);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { url } = await api.stripe.checkout();
      window.location.href = url;
    } catch (err) {
      alert(err.message || "Could not start checkout.");
      setCheckoutLoading(false);
    }
  };

  // ── Pro users: amber badge + voice usage ─────────────────────────────────────
  // Everything except voice minutes is unlimited on Pro, so the badge still leads
  // with "Unlimited access." Voice has a generous but real monthly cap (bounds
  // the one per-character-metered cost), so its bar shows even for Pro.
  if (isPro) {
    const voiceNearOrAtLimit = limits?.voice && limits.voice.used / limits.voice.max >= 0.7;
    return (
      <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/8 border border-amber-500/20 overflow-hidden">
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <Crown size={14} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-400 text-xs font-black leading-none">Pro Plan</p>
            <p className="text-amber-600 text-[10px] leading-none mt-0.5">Unlimited access · No restrictions</p>
          </div>
          <Sparkles size={12} className="text-amber-500/60 shrink-0" />
        </div>
        {limits?.voice && (
          <div className="px-3.5 pb-3">
            <UsageRow icon={Volume2} label="Voice (this month)" color="violet" format={formatCount} {...limits.voice} />
            {voiceNearOrAtLimit && (
              <p className="text-[10px] text-amber-400/90 mt-1.5 leading-relaxed">
                Approaching your monthly voice limit — it resets next month.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── FREE USER — compact (Sidebar) ────────────────────────────────────────────
  // The upgrade button lives in the Sidebar itself (below this card), so this
  // compact variant just shows usage bars. If the fetch is still in flight or
  // failed, show minimal skeleton rows rather than hiding the whole card.
  if (compact) {
    if (loading) {
      return (
        <div className="bg-white/3 border border-white/6 rounded-xl p-3 space-y-2 animate-pulse">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-2 w-full rounded" />
          <div className="skeleton h-2 w-full rounded" />
        </div>
      );
    }

    if (!limits) {
      // Fetch failed — show a static nudge so the sidebar isn't blank
      return (
        <div className="bg-white/3 border border-white/6 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Free Plan</p>
          <p className="text-[10px] text-gray-600">Usage data unavailable.</p>
        </div>
      );
    }

    const guidesAtLimit = (limits.guides.used ?? 0) >= limits.guides.max;
    return (
      <div className="bg-white/3 border border-white/6 rounded-xl p-3 space-y-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Free Plan · Usage</p>
        <UsageRow icon={BookOpen}      label="Study Guides"   {...limits.guides} />
        <UsageRow icon={MessageSquare} label="AI Tutor today" {...limits.chat}   />
        <UsageRow icon={Volume2}       label="Voice (month)"  format={formatCount} {...limits.voice} />
        {guidesAtLimit && (
          <p className="text-[10px] text-amber-400 leading-relaxed">
            Upgrade for unlimited guides, AI tutor & more.
          </p>
        )}
      </div>
    );
  }

  // ── FREE USER — full (Dashboard) ─────────────────────────────────────────────
  // IMPORTANT: The upgrade button is rendered at the top of the card, BEFORE the
  // usage bars. This means it is always visible for free users regardless of
  // whether the limits fetch has completed or failed.
  const guidesAtLimit = limits ? (limits.guides.used ?? 0) >= limits.guides.max : false;

  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
      {/* Header — upgrade button is ALWAYS visible for free users */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/6 flex items-center justify-center">
            <Zap size={12} className="text-gray-400" />
          </div>
          <span className="text-xs font-bold text-gray-300">Free Plan</span>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={checkoutLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black transition-all disabled:opacity-50 shadow-md shadow-indigo-500/20"
        >
          <Crown size={11} />
          {checkoutLoading ? "Loading…" : isSSU ? "Upgrade · $4.99/mo" : "Upgrade · $7.99/mo"}
          {!checkoutLoading && <ArrowRight size={10} />}
        </button>
      </div>

      {/* Usage bars — shown once data loads; skeleton rows while loading */}
      {loading ? (
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3.5 animate-pulse">
          {[0,1,2,3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : limits ? (
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3.5">
          <UsageRow icon={BookOpen}      label="Study Guides"     {...limits.guides}  />
          <UsageRow icon={MessageSquare} label="AI Tutor (today)" {...limits.chat}    />
          <UsageRow icon={Zap}           label="Quizzes (today)"  {...limits.quizzes} />
          <UsageRow icon={FolderOpen}    label="Folders"          {...limits.folders} />
          <UsageRow icon={Volume2}       label="Voice (this month)" format={formatCount} {...limits.voice} />
        </div>
      ) : (
        // Fetch failed — still show the upgrade button (above), just no bars
        <p className="px-4 py-3 text-xs text-gray-600">
          {error ? "Could not load usage data." : ""}
        </p>
      )}

      {/* Limit-hit CTA */}
      {guidesAtLimit && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <Crown size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/90 leading-relaxed">
              You've used your free guide. Upgrade to Pro for unlimited guides, quizzes, and full AI tutor access.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
