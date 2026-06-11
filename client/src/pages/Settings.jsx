import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Lock, Trash2, Save, LogOut, Crown, CreditCard,
  Check, ExternalLink, Sparkles, Shield, Download, Gift, Copy, CheckCheck,
  Sun, Moon, Monitor,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import PlanUsageCard from "../components/PlanUsageCard.jsx";
import UpgradeModal from "../components/UpgradeModal.jsx";

const INPUT_CLS = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm";

const FEATURE_COLORS = {
  indigo:  "text-indigo-400",
  violet:  "text-violet-400",
  pink:    "text-pink-400",
  sky:     "text-sky-400",
  amber:   "text-amber-400",
  emerald: "text-emerald-400",
  rose:    "text-rose-400",
};

// Defined outside Settings so React sees a stable component reference across renders.
// If defined inside, every keystroke re-creates the component type → unmount/remount → focus lost.
function Section({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}>
      {children}
    </motion.div>
  );
}

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isSSU = !!user?.email?.toLowerCase().endsWith("savannahstate.edu");

  const [name,            setName]            = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileLoading,  setProfileLoading]  = useState(false);
  const [newEmail,        setNewEmail]        = useState("");
  const [emailPassword,   setEmailPassword]   = useState("");
  const [emailLoading,    setEmailLoading]    = useState(false);
  const [deletePassword,  setDeletePassword]  = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [billingLoading,  setBillingLoading]  = useState(false);
  const [exportLoading,   setExportLoading]   = useState(false);
  const [referralData,    setReferralData]    = useState(null);
  const [redeemLoading,   setRedeemLoading]   = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [upgradeOpen,     setUpgradeOpen]     = useState(false);
  const [upgradeReason,   setUpgradeReason]   = useState("FREE_LIMIT_EXPORT");

  const { theme, setLight, setDark, isDark } = useTheme();
  const isPro = user?.plan === "pro" || user?.plan === "lifetime" || user?.is_whitelisted || user?.role === "admin";

  useEffect(() => {
    api.referrals.get().then(setReferralData).catch(() => {});
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast({ message: "Name cannot be empty.", type: "error" });
    if (newPassword && newPassword !== confirmPassword)
      return toast({ message: "New passwords do not match.", type: "error" });
    if (newPassword && newPassword.length < 8)
      return toast({ message: "New password must be at least 8 characters.", type: "error" });

    setProfileLoading(true);
    try {
      await api.auth.updateProfile({
        name: name.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      await refreshUser();
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast({ message: "Profile updated successfully!", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return toast({ message: "Enter a new email address.", type: "error" });
    if (!emailPassword)   return toast({ message: "Enter your current password to confirm.", type: "error" });
    setEmailLoading(true);
    try {
      await api.auth.changeEmail({ newEmail: newEmail.trim(), password: emailPassword });
      await refreshUser();
      setNewEmail(""); setEmailPassword("");
      toast({ message: "Email updated successfully!", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally { setEmailLoading(false); }
  };

  const handleUpgrade = async () => {
    setBillingLoading(true);
    try {
      const { url } = await api.stripe.checkout();
      window.location.href = url;
    } catch (err) {
      toast({ message: err.message || "Could not open checkout.", type: "error" });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCopyReferral = () => {
    const code = referralData?.referral_code;
    if (!code) return;
    const link = `${window.location.origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRedeemCredit = async () => {
    setRedeemLoading(true);
    try {
      const res = await api.referrals.redeem();
      setReferralData(prev => ({ ...prev, referral_credits: res.referral_credits }));
      await refreshUser();
      toast({ message: "Credit redeemed! You can save one more guide.", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally { setRedeemLoading(false); }
  };

  const handleExport = async () => {
    if (!isPro) {
      setUpgradeReason("FREE_LIMIT_EXPORT");
      setUpgradeOpen(true);
      return;
    }
    setExportLoading(true);
    try {
      const res = await api.export.download();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "FREE_LIMIT_EXPORT") {
          setUpgradeReason("FREE_LIMIT_EXPORT");
          setUpgradeOpen(true);
          return;
        }
        throw new Error("Export failed. Please try again.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studybuddi-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ message: "Export downloaded!", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.auth.deleteAccount({ password: deletePassword });
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast({ message: err.message, type: "error" });
      setShowDeleteModal(false);
      setDeletePassword("");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full">
      <Sidebar onLogout={logout} />

      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-1">Account</p>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <User size={18} className="text-indigo-400" />
            </div>
            Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">Manage your profile, password, and subscription.</p>
        </div>

        {/* ── Plan & Billing ── */}
        <Section delay={0}>
          <div className={`rounded-2xl p-6 mb-5 ${isPro
            ? "bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20"
            : "bg-gradient-to-br from-indigo-600/10 to-violet-600/5 border border-indigo-500/20"
          }`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={16} className={isPro ? "text-yellow-400" : "text-indigo-400"} />
                  <h2 className="text-white font-bold text-sm">{isPro ? "Pro Plan" : "Free Plan"}</h2>
                </div>
                <p className="text-gray-400 text-xs">
                  {isPro
                    ? "Unlimited guides, quizzes, and full AI tutor access."
                    : "1 free guide included. Upgrade to unlock unlimited everything."}
                </p>
              </div>
              <div className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black ${isPro ? "bg-yellow-500/20 text-yellow-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                {isPro ? "Active" : "Free"}
              </div>
            </div>

            {isPro ? (
              <div className="space-y-2">
                {["Unlimited AI study guides", "Unlimited quiz generations", "Full AI tutor access", "Priority support"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-300">
                    <Check size={13} className="text-yellow-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Unlimited guides", "indigo"],
                    ["Unlimited quizzes", "violet"],
                    ["Full AI tutor", "pink"],
                    ["Priority support", "sky"],
                  ].map(([f, c]) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Sparkles size={11} className={`${FEATURE_COLORS[c] ?? "text-indigo-400"} shrink-0`} />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={billingLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20">
                  <Crown size={15} />
                  {billingLoading ? "Opening checkout…" : isSSU ? "Upgrade to Pro — $4.99/month" : "Upgrade to Pro — $7.99/month"}
                </button>
                <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1.5">
                  <Shield size={10} /> Secure payment via Stripe · Cancel anytime
                </p>
              </div>
            )}
          </div>

          {/* Usage breakdown — shown for free users */}
          {!isPro && (
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Usage</p>
              <PlanUsageCard />
            </div>
          )}
        </Section>

        {/* ── Profile ── */}
        <Section delay={0.06}>
          <form onSubmit={handleSaveProfile} className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <User size={14} className="text-indigo-400" />
              </div>
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Your name" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Email Address</label>
                <input value={user?.email || ""} disabled className={`${INPUT_CLS} opacity-50 cursor-not-allowed`} />
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/8">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                <Lock size={14} className="text-indigo-400" />
                Change Password
                <span className="text-gray-600 font-normal text-xs">(leave blank to keep current)</span>
              </h3>
              <div className="space-y-3">
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password" className={INPUT_CLS} />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)" className={INPUT_CLS} />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password" className={INPUT_CLS} />
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="submit"
                disabled={profileLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5">
                <Save size={15} />
                {profileLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Account stats ── */}
        <Section delay={0.1}>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-5">
            <h2 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Sparkles size={14} className="text-violet-400" />
              </div>
              Your Stats
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Guides", value: user?.total_guides ?? 0, emoji: "📚" },
                { label: "Day Streak",   value: `${user?.streak ?? 0}d`, emoji: "🔥" },
                { label: "XP Earned",   value: (user?.xp ?? 0).toLocaleString(), emoji: "⚡" },
              ].map(s => (
                <div key={s.label} className="bg-white/3 border border-white/6 rounded-xl p-3 text-center">
                  <div className="text-xl mb-1">{s.emoji}</div>
                  <p className="text-white font-black text-base leading-none">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Appearance ── */}
        <Section delay={0.08}>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-sm text-white">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Sun size={14} className="text-amber-400" />
              </div>
              Appearance
            </h2>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              Choose how StudyBuddi looks. Your preference is saved and synced across sessions.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Dark mode option */}
              <button
                onClick={setDark}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  isDark
                    ? "bg-indigo-600/15 border-indigo-500/40 shadow-sm shadow-indigo-500/10"
                    : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isDark ? "bg-indigo-500/20" : "bg-white/6"
                }`}>
                  <Moon size={20} className={isDark ? "text-indigo-400" : "text-gray-500"} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-bold leading-none ${isDark ? "text-indigo-300" : "text-gray-400"}`}>Dark</p>
                  <p className={`text-[10px] mt-0.5 leading-none ${isDark ? "text-indigo-400/60" : "text-gray-600"}`}>
                    {isDark ? "Active" : "Comfortable"}
                  </p>
                </div>
                {isDark && (
                  <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>

              {/* Light mode option */}
              <button
                onClick={setLight}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  !isDark
                    ? "bg-amber-500/10 border-amber-400/40 shadow-sm shadow-amber-500/10"
                    : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  !isDark ? "bg-amber-500/15" : "bg-white/6"
                }`}>
                  <Sun size={20} className={!isDark ? "text-amber-500" : "text-gray-500"} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-bold leading-none ${!isDark ? "text-amber-600" : "text-gray-400"}`}>Light</p>
                  <p className={`text-[10px] mt-0.5 leading-none ${!isDark ? "text-amber-500" : "text-gray-600"}`}>
                    {!isDark ? "Active" : "Bright & airy"}
                  </p>
                </div>
                {!isDark && (
                  <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </Section>

        {/* ── Referrals ── */}
        <Section delay={0.095}>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
            <h2 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center">
                <Gift size={14} className="text-pink-400" />
              </div>
              Refer Friends
            </h2>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              Share your link. Each friend who signs up gives you a free extra guide credit.
            </p>

            {referralData ? (
              <>
                {/* Share link */}
                <div className="flex gap-2 mb-4 min-w-0">
                  <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-400 text-xs font-mono truncate overflow-hidden">
                    {`${window.location.origin}/signup?ref=${referralData.referral_code}`}
                  </div>
                  <button
                    onClick={handleCopyReferral}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-pink-600/20 border border-pink-500/25 hover:bg-pink-600/30 rounded-xl text-pink-400 font-semibold text-xs transition-all shrink-0 min-h-[40px]">
                    {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Total Referrals", value: referralData.stats?.total ?? 0 },
                    { label: "Converted",        value: referralData.stats?.converted ?? 0 },
                    { label: "Credits",          value: referralData.referral_credits ?? 0 },
                  ].map(s => (
                    <div key={s.label} className="bg-white/3 border border-white/6 rounded-xl p-3 text-center">
                      <p className="text-white font-black text-lg leading-none">{s.value}</p>
                      <p className="text-gray-600 text-xs mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Redeem credit */}
                {!isPro && (referralData.referral_credits ?? 0) > 0 && (
                  <button
                    onClick={handleRedeemCredit}
                    disabled={redeemLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600/20 border border-pink-500/25 hover:bg-pink-600/30 disabled:opacity-50 rounded-xl text-pink-400 font-semibold text-sm transition-all min-h-[44px]">
                    <Gift size={14} className="shrink-0" />
                    <span className="text-center leading-tight">
                      {redeemLoading ? "Redeeming…" : `Redeem 1 credit — ${referralData.referral_credits} available`}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className="text-gray-600 text-xs">Loading…</div>
            )}
          </div>
        </Section>

        {/* ── Change Email ── */}
        <Section delay={0.09}>
          <form onSubmit={handleChangeEmail} className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <ExternalLink size={14} className="text-sky-400" />
              </div>
              Change Email Address
            </h2>
            <div className="space-y-3">
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="New email address" className={INPUT_CLS} />
              <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
                placeholder="Current password to confirm" className={INPUT_CLS} />
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={emailLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600/80 hover:bg-sky-500/80 disabled:opacity-50 rounded-xl text-white font-bold text-sm transition-all">
                <Save size={14} />
                {emailLoading ? "Updating…" : "Update Email"}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Data Export ── */}
        <Section delay={0.12}>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
            <h2 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Download size={14} className="text-green-400" />
              </div>
              Export Your Data
              {!isPro && (
                <span className="ml-auto flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                  <Crown size={9} /> Pro only
                </span>
              )}
            </h2>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              Download all your guides, quiz history, study sessions, and account data as a JSON file.
              {!isPro && <span className="text-amber-500/80"> Upgrade to Pro to unlock data exports.</span>}
            </p>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                isPro
                  ? "bg-green-600/20 border border-green-500/25 hover:bg-green-600/30 hover:border-green-500/40 text-green-400"
                  : "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 cursor-pointer"
              }`}>
              {isPro ? <Download size={14} /> : <Crown size={14} />}
              {exportLoading ? "Preparing export…" : isPro ? "Download My Data" : "Upgrade to Export Data"}
            </button>
          </div>
        </Section>

        {/* ── Sign out ── */}
        <Section delay={0.13}>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-5">
            <button
              onClick={logout}
              className="flex items-center gap-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors group">
              <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                <LogOut size={15} />
              </div>
              Sign out of your account
            </button>
          </div>
        </Section>

        {/* ── Danger Zone ── */}
        <Section delay={0.16}>
          <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-6 mb-6">
            <h2 className="text-red-400 font-bold mb-1.5 flex items-center gap-2 text-sm">
              <Trash2 size={15} /> Danger Zone
            </h2>
            <p className="text-gray-500 text-xs mb-5 leading-relaxed">
              Permanently delete your account and all your data. This cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="flex-1 bg-white/3 border border-red-500/15 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors text-sm"
              />
              <button
                onClick={() => {
                  if (!deletePassword) return toast({ message: "Enter your password first.", type: "error" });
                  setShowDeleteModal(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600/20 border border-red-500/25 hover:bg-red-600/30 hover:border-red-500/40 rounded-xl text-red-400 font-semibold text-sm transition-all shrink-0">
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </div>
        </Section>

        <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </main>

      <ConfirmModal
        open={showDeleteModal}
        title="Delete your account?"
        message="This will permanently delete your account, all guides, quizzes, and progress. There is absolutely no way to recover this data."
        confirmText={deleteLoading ? "Deleting…" : "Yes, Delete Everything"}
        onConfirm={handleDeleteAccount}
        onCancel={() => { setShowDeleteModal(false); setDeletePassword(""); }}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
