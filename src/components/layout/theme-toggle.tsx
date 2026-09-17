"use client";

import { Moon, Sun } from "lucide-react";

import { useDashboardTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { isReady, theme, toggleTheme } = useDashboardTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <Button
      aria-label={label}
      aria-pressed={isDark}
      className={className}
      disabled={!isReady}
      onClick={toggleTheme}
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
      {showLabel ? <span>{isDark ? "Modo claro" : "Modo oscuro"}</span> : <span className="sr-only">{label}</span>}
    </Button>
  );
}
