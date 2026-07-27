"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Search, X } from "lucide-react";
import { WorldMap } from "@/components/world-map";
import { decades, matchesFilters, type Pin } from "@/lib/map/pins";
import {
  CLASSIFICATION_DEFINITIONS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_ORDER,
  CONTINENT_LABELS,
  CONTINENT_ORDER,
} from "@/lib/labels";
import type { Classification, Continent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Map plus filters.
 *
 * Filtering runs on the client because the whole pin set is already here: nine
 * cases now, and a viewport query only becomes worth its complexity in the tens
 * of thousands. `matchesFilters` is a pure function precisely so that moving it
 * behind an RPC later changes where it runs and not what it means.
 *
 * Choosing a continent also frames that continent on the map. Filtering the pins
 * without moving the view leaves a reader looking at an empty ocean wondering
 * what happened to their results.
 */
export function MapExplorer({ pins }: { pins: Pin[] }) {
  const [classification, setClassification] = useState<Classification | null>(null);
  const [continent, setContinent] = useState<Continent | null>(null);
  const [decade, setDecade] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [showRange, setShowRange] = useState(false);

  const buckets = useMemo(() => decades(), []);

  // A decade button and a custom range are two ways to say the same thing, so
  // the custom range wins when it is set rather than the two silently fighting.
  const range = useMemo(() => {
    if (from || to) return { from: from || null, to: to || null };
    const bucket = buckets.find((d) => d.label === decade);
    return bucket ? { from: bucket.from, to: bucket.to } : { from: null, to: null };
  }, [from, to, decade, buckets]);

  const filtered = useMemo(
    () =>
      pins.filter((p) =>
        matchesFilters(p, {
          classification,
          continent,
          from: range.from,
          to: range.to,
          query,
        }),
      ),
    [pins, classification, continent, range, query],
  );

  const dated = pins.filter((p) => p.date).length;
  const anyFilter =
    classification || continent || decade || from || to || query.trim();

  const clearAll = () => {
    setClassification(null);
    setContinent(null);
    setDecade(null);
    setFrom("");
    setTo("");
    setQuery("");
    setShowRange(false);
  };

  return (
    <div className="space-y-4">
      {/* Search sits above everything: it is the fastest way in. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by place, witness or keyword"
            aria-label="Search the map"
            className="h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowRange((v) => !v)}
          aria-expanded={showRange}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
            showRange || from || to
              ? "border-primary text-primary"
              : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <CalendarRange className="size-4" aria-hidden />
          Date range
        </button>

        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {showRange && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3">
          <label className="text-xs text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear dates
            </button>
          )}
          {/* Said plainly rather than left for someone to notice. */}
          <p className="basis-full text-xs text-muted-foreground">
            {dated < pins.length
              ? `${pins.length - dated} of ${pins.length} cases have no known date and are hidden while a range is set.`
              : "Every case currently on the map has a known date."}
          </p>
        </div>
      )}

      <FilterRow label="Classification">
        <Pill active={!classification} onClick={() => setClassification(null)}>
          All
        </Pill>
        {CLASSIFICATION_ORDER.map((c) => (
          <Pill
            key={c}
            active={classification === c}
            title={CLASSIFICATION_DEFINITIONS[c]}
            onClick={() => setClassification(classification === c ? null : c)}
          >
            {CLASSIFICATION_LABELS[c]}
          </Pill>
        ))}
      </FilterRow>

      <FilterRow label="Continent">
        <Pill active={!continent} onClick={() => setContinent(null)}>
          All
        </Pill>
        {CONTINENT_ORDER.filter((c) => c !== "unknown").map((c) => (
          <Pill
            key={c}
            active={continent === c}
            onClick={() => setContinent(continent === c ? null : c)}
          >
            {CONTINENT_LABELS[c]}
          </Pill>
        ))}
      </FilterRow>

      <FilterRow label="Decade">
        <Pill active={!decade} onClick={() => setDecade(null)}>
          All
        </Pill>
        {buckets.map((d) => (
          <Pill
            key={d.label}
            active={decade === d.label}
            onClick={() => {
              setDecade(decade === d.label ? null : d.label);
              setFrom("");
              setTo("");
            }}
          >
            {d.label}
          </Pill>
        ))}
      </FilterRow>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {pins.length} {pins.length === 1 ? "case" : "cases"} shown
      </p>

      <WorldMap
        pins={filtered}
        focusKey={continent}
        emptyLabel="No cases match these filters."
        className="aspect-[960/500] w-full"
      />

      <Legend />
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The legend earns its space by explaining the halo, which is otherwise just an
 * unexplained visual difference between two pins.
 */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {CLASSIFICATION_ORDER.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{
              backgroundColor: `var(--${
                c === "likely_explained" ? "explained" : c
              }-foreground)`,
            }}
            aria-hidden
          />
          {CLASSIFICATION_LABELS[c]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="relative inline-flex size-2.5 items-center justify-center" aria-hidden>
          <span className="absolute size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-1 rounded-full bg-muted-foreground" />
        </span>
        A halo marks an approximate location, such as an area or open sea
      </span>
    </div>
  );
}
