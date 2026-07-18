import { useEffect } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/**
 * Dark/light theme controller.
 *
 * NOTE: dark mode is temporarily disabled — the storefront is locked to light.
 * The full controller (stored choice → OS preference, toggle, persistence) is
 * kept below in a comment so it can be restored. To re-enable, swap the body
 * back and un-hide the toggle button in Header.tsx.
 */
export function useTheme() {
  // Force light: ensure the `dark` class is never present, regardless of any
  // previously persisted choice or OS preference.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const noop = () => {};

  return { theme: "light" as Theme, toggle: noop, setTheme: noop } as const;
}

/* --- dark mode (disabled for now) ---------------------------------------
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle, setTheme } as const;
}
------------------------------------------------------------------------- */
