import { Coffee } from "lucide-react";
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
 */

const BMC_URL = `https://www.buymeacoffee.com/${SITE.buyMeACoffee}`;

export function SupportButton({ variant }: { variant: "footer" | "nav" }) {
  if (variant === "nav") {
    return (
      <a
        href={BMC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
      >
        <Coffee className="size-4" aria-hidden />
        <span className="hidden lg:inline">Support</span>
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
      Buy me a coffee
    </a>
  );
}
