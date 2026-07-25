/**
 * Site-wide constants. Kept in one place so the wordmark, metadata, and
 * Open Graph tags can never drift apart.
 *
 * NEXT_PUBLIC_SITE_URL is set by Vercel/Netlify once a domain exists. The
 * localhost fallback only ever applies in development.
 */
export const SITE = {
  name: "Global Anomaly Network",
  shortName: "GAN",
  tagline: "A worldwide record of the unexplained",
  description:
    "A free, worldwide directory of UFO and UAP cases, from officially acknowledged government footage to unverified public clips, alongside plain-language coverage of the search for life beyond Earth.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "gbanomaly@hotmail.com",
} as const;

export const NAV_LINKS = [
  { href: "/cases", label: "Cases" },
  { href: "/science", label: "Science" },
  { href: "/browse", label: "Browse" },
  { href: "/about", label: "About" },
] as const;
