import type { Metadata } from "next";
import Link from "next/link";
import { CaseCardCell } from "@/components/case-card";
import { listCases, getArchiveCounts } from "@/lib/content";
import {
  CLASSIFICATION_DEFINITIONS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_ORDER,
  CONTINENT_LABELS,
  CONTINENT_ORDER,
} from "@/lib/labels";
import type { Classification, Continent } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cases",
  description:
    "Browse UFO and UAP cases by classification, continent and country, from officially acknowledged releases to unverified public footage.",
};

type Search = {
  classification?: string;
  continent?: string;
  country?: string;
  tag?: string;
};

/** Only accept values that exist in the schema, so a hand-typed query string
 *  cannot produce a filter the database has no concept of. */
function parseClassification(v?: string): Classification | undefined {
  return CLASSIFICATION_ORDER.includes(v as Classification)
    ? (v as Classification)
    : undefined;
}

function parseContinent(v?: string): Continent | undefined {
  return CONTINENT_ORDER.includes(v as Continent) ? (v as Continent) : undefined;
}

function FilterPill({
  href,
  active,
  children,
  title,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  const classification = parseClassification(sp.classification);
  const continent = parseContinent(sp.continent);
  const { country, tag } = sp;

  const [cases, counts] = await Promise.all([
    listCases({ classification, continent, country, tag }),
    getArchiveCounts(),
  ]);

  const qs = (patch: Partial<Search>) => {
    const next = { classification, continent, country, tag, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/cases?${s}` : "/cases";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
          Cases
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Every entry states what the evidence shows, who said what, and what
          remains unknown. The label on each case is our reasoning, shown so you
          can disagree with it.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Classification</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill href={qs({ classification: undefined })} active={!classification}>
              All
            </FilterPill>
            {CLASSIFICATION_ORDER.map((c) => (
              <FilterPill
                key={c}
                href={qs({ classification: c })}
                active={classification === c}
                title={CLASSIFICATION_DEFINITIONS[c]}
              >
                {CLASSIFICATION_LABELS[c]}
                <span className="ml-1.5 opacity-70">
                  {counts.byClassification[c]}
                </span>
              </FilterPill>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Continent</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill href={qs({ continent: undefined })} active={!continent}>
              All
            </FilterPill>
            {CONTINENT_ORDER.filter(
              (c) => (counts.byContinent[c] ?? 0) > 0,
            ).map((c) => (
              <FilterPill
                key={c}
                href={qs({ continent: c })}
                active={continent === c}
              >
                {CONTINENT_LABELS[c]}
                <span className="ml-1.5 opacity-70">
                  {counts.byContinent[c]}
                </span>
              </FilterPill>
            ))}
          </div>
        </div>

        {(country || tag) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Also filtering by</span>
            {country && (
              <FilterPill href={qs({ country: undefined })} active>
                {country} ✕
              </FilterPill>
            )}
            {tag && (
              <FilterPill href={qs({ tag: undefined })} active>
                {tag.replace(/-/g, " ")} ✕
              </FilterPill>
            )}
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {cases.length} {cases.length === 1 ? "case" : "cases"}
      </p>

      {cases.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing matches that combination yet. The archive is still being
            filled in, so an empty shelf here is a gap rather than an answer.
          </p>
          <Link
            href="/cases"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Clear the filters
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCardCell key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}
