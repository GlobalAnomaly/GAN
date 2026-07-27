import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CaseCardCell } from "@/components/case-card";
import { GlobeTeaser } from "@/components/globe-teaser";
import { ScienceCard } from "@/components/science-card";
import { ScrollStrip } from "@/components/scroll-strip";
import { SearchBox } from "@/components/search-box";
import {
  getAcknowledgedCases,
  getArchiveCounts,
  getLatestCases,
  getRotatingCases,
  listCases,
  listScience,
} from "@/lib/content";
import { CONTINENT_LABELS, CONTINENT_ORDER } from "@/lib/labels";

export default async function Home() {
  const [counts, latest, rotating, acknowledged, science, allCases] = await Promise.all([
    getArchiveCounts(),
    getLatestCases(10),
    getRotatingCases(10),
    getAcknowledgedCases(3),
    listScience(),
    // The globe wants every case with a coordinate, which no other strip needs.
    listCases(),
  ]);

  const globePins = allCases
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      lat: c.lat as number,
      lng: c.lng as number,
      classification: c.classification,
    }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <section className="text-center">
        {/* The wordmark lives in the artwork, so the heading below carries the
            tagline rather than repeating the name. Priority because this is
            the largest thing above the fold and would otherwise pop in late. */}
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl">
          {/* Unoptimized on purpose. scripts/optimize-images.ts already sized
              and compressed this to 37KB of WebP; putting it through the image
              optimizer again re-encoded it to a 6.6KB JPEG at 640px for a
              ~900px slot, which is both softer and a worse format. Serving the
              file as-is is smaller than most of the variants it would generate
              and always crisp, including on retina. */}
          <Image
            src="/images/hero.webp"
            alt="Global Anomaly Network"
            width={1800}
            height={600}
            priority
            unoptimized
            className="h-auto w-full"
          />
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <h1 className="font-[family-name:var(--font-serif)] text-3xl leading-tight sm:text-4xl">
            A worldwide record of the unexplained
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Sightings from the 1930s to today, and the science of whether anyone
            is out there. Sourced, attributed, and honest about what nobody
            knows.
          </p>

          <SearchBox className="mt-8" />

          <p className="mt-4 text-sm text-muted-foreground">
            {counts.cases} {counts.cases === 1 ? "case" : "cases"} across{" "}
            {counts.continents}{" "}
            {counts.continents === 1 ? "continent" : "continents"} ·{" "}
            {counts.science} science{" "}
            {counts.science === 1 ? "entry" : "entries"}
          </p>
        </div>
      </section>

      {acknowledged.length > 0 && (
        <section className="mt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl">
              Acknowledged by governments
            </h2>
            <Link
              href="/cases?classification=acknowledged"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              See all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cases where an official body released or confirmed the material and
            then offered no conventional explanation for it.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {acknowledged.map((c) => (
              <CaseCardCell key={c.id} item={c} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          Latest additions
        </h2>
        <div className="mt-6">
          <ScrollStrip items={latest} />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          From the archive
        </h2>
        <div className="mt-6">
          <ScrollStrip items={rotating} />
        </div>
      </section>

      <section className="mt-16 rounded-xl border border-border bg-card/40 p-6 sm:p-8">
        <GlobeTeaser
          pins={globePins}
          caseCount={counts.cases}
          countryCount={counts.byCountry.length}
        />
      </section>

      <section className="mt-16">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          Browse by continent
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

      {science.length > 0 && (
        <section className="mt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl">
              Is anyone out there
            </h2>
            <Link
              href="/science"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              All science entries
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Published findings, explained plainly and never oversold. Kept
            separate from the case archive on purpose.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {science.slice(0, 3).map((e) => (
              <ScienceCard key={e.id} item={e} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 rounded-xl border border-border p-6 sm:p-8">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          Where we stand
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          We are not here to tell you it was aliens, and we are not here to tell
          you it was a weather balloon. Some of these cases have ordinary
          explanations, and we say so plainly. Others have been examined by
          governments, pilots and scientists, and nobody has explained them.
          That is worth recording carefully.
        </p>
        <Link
          href="/about"
          className="mt-5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Read our standards
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
