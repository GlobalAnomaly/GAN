"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Both icons are always rendered and CSS picks one off the .dark class. The
 * usual alternative, a mounted flag flipped in an effect, exists only to dodge
 * a hydration mismatch, and it costs an extra render plus a frame of the wrong
 * icon. Letting CSS decide means the server and client markup already agree.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();

  const toggle = () => {
    // Read the class the provider actually set rather than resolvedTheme,
    // which is still undefined on the first client render.
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
    </button>
  );
}
