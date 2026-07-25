import Link from "next/link";
import { SITE } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/about", label: "About and our standards" },
  { href: "/submit", label: "Send us something" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/takedown", label: "Takedown requests" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="font-[family-name:var(--font-serif)] text-base">
              {SITE.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              An open archive. Every account is written from sourced material,
              every claim is attributed, and what remains unknown is said
              plainly.
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Video remains hosted by its original platform and is embedded here
          under each platform&apos;s player. Documents link to their source.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Contact us at{" "}
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
