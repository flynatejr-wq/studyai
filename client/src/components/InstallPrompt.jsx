import { useState, useEffect } from "react";
import { X, Share, Plus, Download } from "lucide-react";

const STORAGE_KEY = "studybuddi_install_prompt_dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

function getPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null; // desktop — no prompt
}

/**
 * Bottom banner nudging mobile visitors (mainly QR-code scans) to add the app
 * to their home screen. iOS has no programmatic install API — Safari only
 * allows the user to trigger it via Share > Add to Home Screen, so that
 * platform gets instructions. Android/Chrome supports capturing the native
 * `beforeinstallprompt` event, so that platform gets a real one-tap button.
 */
export default function InstallPrompt() {
  const [platform, setPlatform] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (isStandalone()) return;
    const p = getPlatform();
    if (!p) return;
    const t = setTimeout(() => setPlatform(p), 1500);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setPlatform(null);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!platform || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-[#12121a] border border-white/10 rounded-2xl px-4 py-3 shadow-xl shadow-black/40 max-w-sm w-full">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
          <Download size={16} className="text-white" />
        </div>

        {platform === "ios" ? (
          <p className="text-white text-xs font-medium flex-1 leading-snug">
            Add StudyBuddi to your home screen — tap <Share size={12} className="inline -mt-0.5 mx-0.5" /> then "Add to Home Screen"
          </p>
        ) : (
          <p className="text-white text-xs font-medium flex-1 leading-snug">
            Install StudyBuddi as an app on your phone
          </p>
        )}

        {platform === "android" && deferredPrompt && (
          <button
            onClick={handleAndroidInstall}
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1">
            <Plus size={12} /> Install
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
