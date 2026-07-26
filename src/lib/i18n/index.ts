/**
 * Locale plumbing.
 *
 * Deliberately not the routing approach Next.js recommends. The official guide
 * puts every language behind its own path (`/fr/cases`) and generates static
 * pages per locale. The blueprint rules that out: machine translations get no
 * URL of their own, because thin unreviewed pages in four languages is exactly
 * the shape search engines penalise, and it would quadruple the indexed surface
 * of an archive whose English version is the reviewed one.
 *
 * So the locale lives in a cookie, the server always renders English, and the
 * client swaps the strings after hydration. English is what lands in the HTML,
 * in the index and in a shared link. This mirrors what `case-account.tsx`
 * already does for the account body, so the site has one story about
 * translation rather than two.
 *
 * The cost is a visible flip from English on first paint for readers in the
 * other three languages. That is the trade the blueprint asks for.
 */

import type { Lang } from "@/lib/types";

export const LOCALES: Lang[] = ["en", "fr", "pt", "es"];

/**
 * Typed as the literal `"en"` rather than widened to `Lang`, so that a check
 * like `if (locale === DEFAULT_LOCALE) return` actually narrows the remaining
 * type to the three loadable languages. Widening it here would push a cast into
 * every consumer instead.
 */
export const DEFAULT_LOCALE = "en" satisfies Lang;

/** What each language calls itself. Never translated: a French speaker looking
 *  for their language scans for "Français", not for "French" in Portuguese. */
export const LOCALE_NAMES: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  pt: "Português",
  es: "Español",
};

/** Short form for the narrow control in the header. */
export const LOCALE_SHORT: Record<Lang, string> = {
  en: "EN",
  fr: "FR",
  pt: "PT",
  es: "ES",
};

/**
 * Strictly a preference cookie, in the same class as the theme: it holds no
 * identifier, it is not read by anyone else, and it exists only because the
 * reader asked for it. That keeps it outside consent requirements, which is
 * also why the privacy page names it explicitly rather than glossing it.
 */
export const LOCALE_COOKIE = "gan_lang";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Lang {
  return !!value && (LOCALES as string[]).includes(value);
}

export function readLocaleCookie(): Lang {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));

  const value = match?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function writeLocaleCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  // Lax rather than Strict so the choice survives arriving from a shared link.
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

/**
 * The reader's browser languages, used only when no cookie exists yet.
 *
 * Matched on the primary subtag, so `pt-BR` and `pt-PT` both find `pt`. A
 * Brazilian reader getting European Portuguese is a much smaller failure than
 * a Brazilian reader getting English.
 */
export function detectLocale(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag?.split("-")[0]?.toLowerCase();
    if (isLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}
