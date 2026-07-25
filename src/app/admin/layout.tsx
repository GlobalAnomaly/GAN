import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
  // The panel must never be indexed, whatever else happens.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-baseline gap-4">
          <Link
            href="/admin"
            className="font-[family-name:var(--font-serif)] text-lg"
          >
            Admin
          </Link>
          <nav className="flex gap-3 text-sm">
            <Link
              href="/admin/fetch"
              className="text-muted-foreground hover:text-foreground"
            >
              Find videos
            </Link>
            <Link
              href="/admin/inbox"
              className="text-muted-foreground hover:text-foreground"
            >
              Review inbox
            </Link>
          </nav>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to the site
        </Link>
      </div>
      {children}
    </div>
  );
}
