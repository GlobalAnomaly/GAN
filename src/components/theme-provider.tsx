"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Class-based theming so the .dark selector in globals.css drives both
 * palettes. next-themes injects a blocking script that sets the class
 * before paint, which is what stops the light-theme flash on load.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
