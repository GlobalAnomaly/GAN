"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { NAV_LINKS, SITE } from "@/lib/site";
import { LanguageToggle } from "@/components/language-toggle";
import { SupportButton } from "@/components/support-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * The top bar carries five things now: wordmark, navigation, search, language,
 * theme, and the coffee link. That does not fit on a phone, so the row sheds
 * them in order of how much a reader on a small screen needs them.
 *
 *   below sm   short wordmark, search, language, theme, menu
 *              (coffee moves into the menu, where it has room for its label)
 *   sm and up  full wordmark
 *   md and up  inline navigation instead of the menu button
 *   xl and up  the coffee link shows its words
 *
 * Language stays in the bar at every width. A reader who cannot read the site
 * cannot be expected to find the control for that behind a hamburger.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-serif)] text-lg font-medium tracking-tight whitespace-nowrap"
        >
          <span className="sm:hidden">{SITE.shortName}</span>
          <span className="hidden sm:inline">{SITE.name}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                isActive(link.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.nav[link.key]}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/search"
            aria-label={t.nav.search}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden xl:inline">{t.nav.search}</span>
          </Link>

          <div className="hidden sm:block">
            <SupportButton variant="nav" />
          </div>

          <LanguageToggle />
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          >
            {open ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Menu className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-2.5 text-sm transition-colors",
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.nav[link.key]}
              </Link>
            ))}

            {/* Only below sm, where it is not in the bar. Above that it would
                appear twice in the same header. */}
            <div className="mt-2 border-t border-border pt-3 pb-1 sm:hidden">
              <SupportButton variant="footer" />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
