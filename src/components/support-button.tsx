"use client";

import { Coffee } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { SITE } from "@/lib/site";

/**
 * Buy Me a Coffee link.
 *
 * Deliberately not their embed script. That version injects a button after
 * page load, which fights React's hydration, adds a third-party script to
 * every page, and shifts the layout when it lands. A plain link does the same
 * job with none of that, and it inherits the site's own theming instead of
 * carrying a foreign button that looks pasted on in one theme and clashes in
 * the other.
 *
 * The nav label says "buy me a coffee", not "support". On a navigation bar
 * "support" reads as a help desk, and a reader whose video will not play should
 * not be sent to a donation page.
 */

const BMC_URL = `https://www.buymeacoffee.com/${SITE.buyMeACoffee}`;

export function SupportButton({ variant }: { variant: "footer" | "nav" }) {
  const { t } = useI18n();

  if (variant === "nav") {
    return (
      <a
        href={BMC_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={t.support.nav}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Coffee className="size-4" aria-hidden />
        {/* The label appears only where there is room for it. The cup alone is
            unambiguous in a way the old "support" wording never was, so hiding
            the words costs nothing below that width. */}
        <span className="hidden xl:inline">{t.support.nav}</span>
        <span className="sr-only xl:hidden">{t.support.nav}</span>
      </a>
    );
  }

  return (
    <a
      href={BMC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <Coffee className="size-4 text-primary" aria-hidden />
      {t.support.footer}
    </a>
  );
}
