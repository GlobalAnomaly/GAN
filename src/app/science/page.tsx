import type { Metadata } from "next";
import Link from "next/link";
import { ScienceCard } from "@/components/science-card";
import { listScience } from "@/lib/content";
import { SCIENCE_TOPIC_LABELS, SCIENCE_TOPIC_ORDER } from "@/lib/labels";
import type { ScienceTopic } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Science",
  description:
    "The search for life beyond Earth, explained plainly: exoplanets, biosignatures, interstellar objects and space signals, with each finding's real maturity stated honestly.",
};

function parseTopic(v?: string): ScienceTopic | undefined {
  return SCIENCE_TOPIC_ORDER.includes(v as ScienceTopic)
    ? (v as ScienceTopic)
    : undefined;
}

export default async function SciencePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const sp = await searchParams;
  const topic = parseTopic(sp.topic);

  const [entries, all] = await Promise.all([
    listScience({ topic }),
    listScience(),
  ]);

  const countFor = (t: ScienceTopic) =>
    all.filter((e) => e.topic === t).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
          Science
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Published findings about life elsewhere, written for people who never
          studied astrophysics. Every entry says what the result does not
          establish, because that is usually the part the headlines drop.
        </p>
      </header>

      {/* A sighting must never borrow the standing of a peer-reviewed result,
          so the distinction is stated on the page and not just implied. */}
      <p className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
        These entries are not sightings. They are published or officially
        announced findings, and their label reflects how settled the science is,
        not whether we believe it.
      </p>

      <div className="mt-8">
        <p className="mb-2 text-xs text-muted-foreground">Topic</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/science"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              !topic
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            All
          </Link>
          {SCIENCE_TOPIC_ORDER.filter((t) => countFor(t) > 0).map((t) => (
            <Link
              key={t}
              href={`/science?topic=${t}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                topic === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {SCIENCE_TOPIC_LABELS[t]}
              <span className="ml-1.5 opacity-70">{countFor(t)}</span>
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <ScienceCard key={e.id} item={e} />
        ))}
      </div>
    </div>
  );
}
