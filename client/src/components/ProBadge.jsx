import { Crown } from "lucide-react";

/**
 * ProBadge — small inline "PRO" label for premium features.
 *
 * Usage:
 *   <ProBadge />                   — default amber pill
 *   <ProBadge size="sm" />         — smaller variant
 *   <ProBadge showIcon={false} />  — text only
 */
export default function ProBadge({ size = "md", showIcon = true, className = "" }) {
  const base = size === "sm"
    ? "px-1.5 py-0.5 text-[10px] gap-0.5"
    : "px-2 py-0.5 text-xs gap-1";

  return (
    <span className={`inline-flex items-center rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 ${base} ${className}`}>
      {showIcon && <Crown size={size === "sm" ? 9 : 11} className="shrink-0" />}
      PRO
    </span>
  );
}

/**
 * LockedFeature — wraps a UI element with a Pro overlay.
 * When locked=true, renders a blurred/dimmed version with an upgrade CTA.
 *
 * Usage:
 *   <LockedFeature locked={!isPro} onUpgrade={() => setUpgradeOpen(true)}>
 *     <YourPremiumComponent />
 *   </LockedFeature>
 */
export function LockedFeature({ locked, onUpgrade, children, label = "Pro feature" }) {
  if (!locked) return children;

  return (
    <div className="relative group">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-[2px] opacity-40">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/30 backdrop-blur-[1px]">
        <Crown size={18} className="text-amber-400" />
        <p className="text-white text-xs font-bold">{label}</p>
        <button
          onClick={onUpgrade}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold hover:from-indigo-500 hover:to-violet-500 transition-all"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
