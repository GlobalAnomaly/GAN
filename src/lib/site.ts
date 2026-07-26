/**
 * Site-wide constants. Kept in one place so the wordmark, metadata, and
 * Open Graph tags can never drift apart.
 */

/**
 * The public origin, used for canonical links, Open Graph tags and the
 * sitemap. Getting it wrong is quietly costly: every shared link and every
 * indexed page would point at localhost.
 *
 * Resolved in order of how much it can be trusted:
 *   1. NEXT_PUBLIC_SITE_URL, once a real domain exists and is set by hand
 *   2. the Vercel production domain, which Vercel injects on its own, so a
 *      first deploy is correct without anyone having to know the URL first
 *   3. localhost, which only ever applies in development
 */
export function normalizeOrigin(value: string | undefined): string | null {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return null;

  // A bare domain is the natural thing to type into a hosting dashboard, and
  // it is not a URL. Prefixing it is friendlier than failing the build.
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    // Anything still unparseable is ignored rather than propagated. This runs
    // at module load, so throwing here takes the entire build down, and a
    // mistyped variable should not be able to do that.
    return null;
  }
}

function resolveSiteUrl(): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    "http://localhost:3000"
  );
}

export const SITE = {
  name: "Global Anomaly Network",
  shortName: "GAN",
  tagline: "A worldwide record of the unexplained",
  description:
    "A free, worldwide directory of UFO and UAP cases, from officially acknowledged government footage to unverified public clips, alongside plain-language coverage of the search for life beyond Earth.",
  url: resolveSiteUrl(),
  email: "gbanomaly@hotmail.com",
} as const;

export const NAV_LINKS = [
  { href: "/cases", label: "Cases" },
  { href: "/science", label: "Science" },
  { href: "/browse", label: "Browse" },
  { href: "/about", label: "About" },
] as const;
