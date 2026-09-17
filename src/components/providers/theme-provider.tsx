"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DashboardTheme = "dark" | "light";

interface ThemeContextValue {
  isReady: boolean;
  setTheme: (theme: DashboardTheme) => void;
  theme: DashboardTheme;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "dashboard-v4-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function preferredTheme(): DashboardTheme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<DashboardTheme>("light");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(preferredTheme());
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const root = document.documentElement;
    const dark = theme === "dark";
    root.classList.toggle("dark", dark);
    root.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isReady, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isReady,
      setTheme,
      theme,
      toggleTheme: () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    }),
    [isReady, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useDashboardTheme must be used inside ThemeProvider.");
  }

  return context;
}
