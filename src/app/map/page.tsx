import type { Metadata } from "next";
import Link from "next/link";
import { MapExplorer } from "@/components/map-explorer";
import { listCases } from "@/lib/content";
import { formatEventDate, formatLocation } from "@/lib/labels";
import { toPins } from "@/lib/map/pins";

export const metadata: Metadata = {
  title: "Map",
  description:
    "Every case in the archive plotted where it was reported, filterable by classification, continent and date.",
};

export default async function MapPage() {
  const cases = await listCases();

  // Formatting stays on the server, with the same helpers the cards use, so a
  // date on the map cannot disagree with the same date on a case page.
  const pins = toPins(
    cases,
    formatEventDate,
    (c) => formatLocation(c.location_name, c.country, c.continent, false),
  );

  const unmappable = cases.length - pins.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
          Map
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Every case we have written, plotted where it was reported. Zoom in to
          separate events that overlap at this scale, and select a pin to open the
          account.
        </p>
      </header>

      <div className="mt-8">
        <MapExplorer pins={pins} />
      </div>

      {/* Said rather than left as a silent difference between two numbers. A
          reader who counts nine cases and eight pins deserves to know why. */}
      {unmappable > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          {unmappable} {unmappable === 1 ? "case has" : "cases have"} no known
          coordinates and cannot be placed. {unmappable === 1 ? "It is" : "They are"}{" "}
          still in{" "}
          <Link href="/cases" className="text-primary hover:underline">
            the full list
          </Link>
          .
        </p>
      )}

      <p className="mt-2 text-sm text-muted-foreground">
        Coastlines are drawn from a public-domain atlas we host ourselves, so no
        third party is told which part of the world you are looking at.
      </p>
    </div>
  );
}
