"use client";

import { useI18n } from "@/components/i18n-provider";

/**
 * Its own component only because it needs the dictionary, and the root layout
 * is a server component. The first thing a keyboard or screen reader user
 * meets should not be the one string on the page still stuck in English.
 */
export function SkipLink() {
  const { t } = useI18n();

  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      {t.nav.skipToContent}
    </a>
  );
}
