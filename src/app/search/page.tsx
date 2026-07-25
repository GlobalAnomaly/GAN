import type { Metadata } from "next";
import Link from "next/link";
import { CaseCardCell } from "@/components/case-card";
import { ScienceCard } from "@/components/science-card";
import { SearchBox } from "@/components/search-box";
import { searchCases, searchScience } from "@/lib/content";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search the archive by place, year, witness or keyword across cases and science entries.",
  // Result pages are thin and endlessly variable, so they stay out of the index.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [cases, science] = await Promise.all([
    searchCases(query),
    searchScience(query),
  ]);

  const total = cases.length + science.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Search
      </h1>

      <SearchBox defaultValue={query} autoFocus className="mt-6" />

      {!query ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Try a place, a year, a witness, or a word from the account. Both cases
          and science entries are searched.
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground">
            {total} {total === 1 ? "result" : "results"} for “{query}”
          </p>

          {total === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing here matches that. The archive is still small, so a miss
                usually means we have not covered it yet rather than that it is
                not real.
              </p>
              <Link
                href="/cases"
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Browse all cases instead
              </Link>
            </div>
          )}

          {cases.length > 0 && (
            <section className="mt-8">
              <h2 className="font-[family-name:var(--font-serif)] text-xl">
                Cases
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {cases.map((c) => (
                  <CaseCardCell key={c.id} item={c} />
                ))}
              </div>
            </section>
          )}

          {science.length > 0 && (
            <section className="mt-10">
              <h2 className="font-[family-name:var(--font-serif)] text-xl">
                Science
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {science.map((e) => (
                  <ScienceCard key={e.id} item={e} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
