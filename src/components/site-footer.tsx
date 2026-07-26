"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { SupportButton } from "@/components/support-button";
import { SITE } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Same arrangement as the nav links: the href is fixed, the label is a
 * dictionary key, so a footer link cannot be left in English by accident.
 */
const FOOTER_LINKS: { href: string; key: keyof Dictionary["footer"] }[] = [
  { href: "/about", key: "about" },
  { href: "/submit", key: "submit" },
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/takedown", key: "takedown" },
];

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="font-[family-name:var(--font-serif)] text-base">
              {SITE.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t.footer.tagline}
            </p>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t.support.footerLead}
            </p>
            <div className="mt-3">
              <SupportButton variant="footer" />
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.footer[link.key]}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          {t.footer.mediaNote}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t.footer.contact}{" "}
          <a
            href={`mailto:${SITE.email}`}
            className="text-primary hover:underline"
          >
            {SITE.email}
          </a>
        </p>
      </div>
    </footer>
  );
}
