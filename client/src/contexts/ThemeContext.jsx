/**
 * ThemeContext.jsx — Light / Dark mode management
 *
 * Strategy
 * ────────
 * • The <html> element carries a `light` or `dark` class that gates all
 *   CSS variable overrides in index.css and Tailwind's dark: variants.
 * • An inline <script> in index.html sets the class BEFORE React mounts
 *   (see the "anti-flash" block) so there is never a flash of wrong theme.
 * • This context syncs React state with what that script already applied,
 *   so no hydration mismatch occurs.
 * • Preference is persisted to localStorage under key "sb_theme".
 * • The `meta[name="theme-color"]` tag is updated so the mobile browser
 *   chrome matches the active theme.
 */

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "sb_theme";
const THEME_COLOR_DARK  = "#0a0a12";
const THEME_COLOR_LIGHT = "#f0f4fe";

function readInitialTheme() {
  // Sync with what the anti-flash inline script already painted on <html>.
  // This prevents any React-side re-flash.
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("light")) return "light";
    if (document.documentElement.classList.contains("dark"))  return "dark";
  }
  // Fallback: localStorage → dark (StudyBuddi always defaults to dark)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {}
  return "dark";
}

function applyTheme(theme) {
  const root = document.documentElement;

  // Class toggle
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
  root.setAttribute("data-theme", theme);

  // Mobile browser chrome colour
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.content = theme === "light" ? THEME_COLOR_LIGHT : THEME_COLOR_DARK;
  }

  // Persist
  try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  // Sync DOM whenever theme changes (and on first mount to be safe)
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // No system-preference listener — StudyBuddi always defaults to dark.
  // Users who explicitly choose light mode have that saved to localStorage.

  const toggle  = () => setTheme(t => t === "dark" ? "light" : "dark");
  const setDark  = () => setTheme("dark");
  const setLight = () => setTheme("light");

  return (
    <ThemeContext.Provider value={{
      theme,
      toggle,
      setDark,
      setLight,
      isDark:  theme === "dark",
      isLight: theme === "light",
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
