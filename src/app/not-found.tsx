import Link from "next/link";

/**
 * A missing case is a normal thing to hit here: links get shared years later
 * and entries get renamed. So this page points somewhere useful rather than
 * just apologising.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        We do not have this one
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        The page you followed does not exist, or the case has been renamed since
        the link was made. If you were looking for something specific, search
        for it: the account may be here under a different title.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/search"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          Search the archive
        </Link>
        <Link
          href="/cases"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Browse all cases
        </Link>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        If you think this case should exist,{" "}
        <Link href="/submit" className="text-primary hover:underline">
          tell us about it
        </Link>
        .
      </p>
    </div>
  );
}
