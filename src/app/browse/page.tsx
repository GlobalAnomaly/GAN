import type { Metadata } from "next";
import Link from "next/link";
import { ClassificationBadge } from "@/components/badges";
import { getArchiveCounts } from "@/lib/content";
import {
  CLASSIFICATION_DEFINITIONS,
  CLASSIFICATION_ORDER,
  CONTINENT_LABELS,
  CONTINENT_ORDER,
  SCIENCE_TOPIC_LABELS,
  SCIENCE_TOPIC_ORDER,
} from "@/lib/labels";

export const metadata: Metadata = {
  title: "Browse",
  description:
    "Every way into the archive: by classification, by continent, by country, and by science topic.",
};

export default async function BrowsePage() {
  const counts = await getArchiveCounts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Browse
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        {counts.cases} {counts.cases === 1 ? "case" : "cases"} and{" "}
        {counts.science} science{" "}
        {counts.science === 1 ? "entry" : "entries"}, sorted every way we know
        how.
      </p>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          By classification
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CLASSIFICATION_ORDER.map((c) => (
            <Link
              key={c}
              href={`/cases?classification=${c}`}
              className="rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-3">
                <ClassificationBadge value={c} />
                <span className="text-sm text-muted-foreground">
                  {counts.byClassification[c]}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {CLASSIFICATION_DEFINITIONS[c]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          By continent
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CONTINENT_ORDER.map((c) => {
            const n = counts.byContinent[c] ?? 0;
            return (
              <Link
                key={c}
                href={`/cases?continent=${c}`}
                className="rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="block text-sm">{CONTINENT_LABELS[c]}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {n} {n === 1 ? "case" : "cases"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {counts.byCountry.length > 0 && (
        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-serif)] text-2xl">
            By country
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {counts.byCountry.map(({ country, count }) => (
              <Link
                key={country}
                href={`/cases?country=${encodeURIComponent(country)}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {country}
                <span className="ml-1.5 opacity-70">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          By science topic
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SCIENCE_TOPIC_ORDER.map((t) => (
            <Link
              key={t}
              href={`/science?topic=${t}`}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {SCIENCE_TOPIC_LABELS[t]}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
