"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { select } from "d3-selection";
// Imported for the side effect: d3-transition augments Selection with
// .transition(), which the zoom-to-region animation uses.
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { feature } from "topojson-client";
import { Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { clusterPins, type Pin, type PinCluster } from "@/lib/map/pins";
import { CLASSIFICATION_LABELS } from "@/lib/labels";
import type { Classification } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The world map.
 *
 * Rendered as SVG from a vendored TopoJSON file rather than from map tiles, and
 * that is a deliberate choice with three consequences worth keeping:
 *
 *   - **No third party sees the reader.** A tile provider receives the viewport
 *     of every pan and zoom, which would be a tracking disclosure on a site whose
 *     privacy page currently promises two preference cookies and nothing else.
 *   - **It themes properly.** Country fills and strokes come from the same CSS
 *     variables as the rest of the site, so light and dark are the site's own
 *     rather than a foreign basemap sitting inside our page.
 *   - **No key, no quota, no outage.** The atlas is 107KB in `public/geo/`.
 *
 * The cost is no street-level detail. For plotting where events were reported
 * across the world, country outlines are enough and arguably better: less noise
 * competing with the pins.
 *
 * Natural Earth 1 is the projection because it is a reading map rather than a
 * navigation map. It also keeps us visually distinct from every UFO site using
 * web-mercator tiles.
 */

/** Longitude and latitude bounds per continent, for the "zoom to region" jump. */
const CONTINENT_VIEW: Record<string, [[number, number], [number, number]]> = {
  north_america: [[-168, 7], [-52, 72]],
  south_america: [[-82, -56], [-34, 13]],
  europe: [[-25, 34], [45, 71]],
  africa: [[-18, -35], [52, 37]],
  asia: [[26, -10], [147, 78]],
  oceania: [[110, -48], [180, -1]],
};

/** Pin fill per classification. Uses the -foreground variables: the badge
 *  backgrounds are near-white and would be invisible as dots. */
const PIN_FILL: Record<Classification, string> = {
  acknowledged: "var(--acknowledged-foreground)",
  unverified: "var(--unverified-foreground)",
  likely_explained: "var(--explained-foreground)",
  debunked: "var(--debunked-foreground)",
};

const WIDTH = 960;
const HEIGHT = 500;
/** Below this many pixels apart, pins collapse. Roughly a comfortable target. */
const CELL_PX = 26;
const MAX_ZOOM = 40;
/**
 * Framing a continent is bounded separately from what a reader may zoom to by
 * hand, and much more tightly.
 *
 * The first version derived the scale purely from the projected width of the
 * region and clamped only at MAX_ZOOM. Choosing Europe put the map at scale 40,
 * which is street level: the reader asked to see a continent and got a suburb.
 * Whatever the arithmetic says, a continent fits somewhere between a little over
 * world view and roughly six times it, so that is the range.
 */
const REGION_ZOOM_MIN = 1.4;
const REGION_ZOOM_MAX = 6;

interface Land {
  type: "FeatureCollection";
  features: GeoPermissibleObjects[];
}

/**
 * Transition duration, or zero when the reader has asked for less motion.
 *
 * `AGENTS.md` requires any JS-driven animation to check this, since the global
 * CSS rule cannot reach a d3 transition. Zoom is not decoration here, so the
 * motion is removed and the movement kept: the view still reframes, it simply
 * arrives instead of gliding. Read at call time rather than cached, because a
 * reader can change the system setting while the page is open.
 */
function motionMs(ms: number): number {
  if (typeof window === "undefined" || !window.matchMedia) return ms;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}

export function WorldMap({
  pins,
  className,
  emptyLabel,
  focusKey,
}: {
  pins: Pin[];
  className?: string;
  emptyLabel: string;
  /** A continent key to frame, or null for the whole world. */
  focusKey?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [land, setLand] = useState<Land | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hovered, setHovered] = useState<PinCluster | null>(null);
  const [pinned, setPinned] = useState<PinCluster | null>(null);

  // The atlas is fetched rather than imported so it stays out of the JS bundle:
  // 107KB of geometry has no business being parsed before the page can paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/geo/countries-110m.json");
        if (!res.ok) return;
        const topo = await res.json();
        const collection = feature(topo, topo.objects.countries) as unknown as Land;
        if (!cancelled) setLand(collection);
      } catch {
        // A map that cannot draw its coastlines still draws its pins on a plain
        // field, which is worse but not useless.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const projection = useMemo(
    () => geoNaturalEarth1().fitExtent([[2, 2], [WIDTH - 2, HEIGHT - 2]], {
      type: "Sphere",
    } as unknown as GeoPermissibleObjects),
    [],
  );

  const pathFor = useMemo(() => geoPath(projection), [projection]);

  // Zoom and pan. d3-zoom is used rather than hand-rolled pointer handling
  // because wheel, pinch, drag momentum and bounds are all subtly wrong when
  // written from scratch, and it is the one part of this a reader notices.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const behaviour = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([[0, 0], [WIDTH, HEIGHT]])
      .on("zoom", (event) => setTransform(event.transform));

    zoomRef.current = behaviour;
    select(svg).call(behaviour);

    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  const zoomTo = useCallback((scale: number) => {
    const svg = svgRef.current;
    const behaviour = zoomRef.current;
    if (!svg || !behaviour) return;
    select(svg).transition().duration(motionMs(320)).call(behaviour.scaleTo, scale);
  }, []);

  const reset = useCallback(() => {
    const svg = svgRef.current;
    const behaviour = zoomRef.current;
    if (!svg || !behaviour) return;
    setPinned(null);
    setHovered(null);
    select(svg).transition().duration(motionMs(400)).call(behaviour.transform, zoomIdentity);
  }, []);

  /** Frames a continent, used by the filter bar when a continent is chosen. */
  const focusRegion = useCallback(
    (key: string) => {
      const svg = svgRef.current;
      const behaviour = zoomRef.current;
      const box = CONTINENT_VIEW[key];
      if (!svg || !behaviour || !box) return;

      const a = projection([box[0][0], box[1][1]]);
      const b = projection([box[1][0], box[0][1]]);
      if (!a || !b) return;

      const w = Math.abs(b[0] - a[0]);
      const h = Math.abs(b[1] - a[1]);
      if (w < 1 || h < 1) return;

      const scale = Math.max(
        REGION_ZOOM_MIN,
        Math.min(REGION_ZOOM_MAX, 0.85 / Math.max(w / WIDTH, h / HEIGHT)),
      );
      const cx = (a[0] + b[0]) / 2;
      const cy = (a[1] + b[1]) / 2;

      select(svg)
        .transition()
        .duration(motionMs(500))
        .call(
          behaviour.transform,
          zoomIdentity
            .translate(WIDTH / 2, HEIGHT / 2)
            .scale(scale)
            .translate(-cx, -cy),
        );
    },
    [projection],
  );

  // Declarative rather than imperative: the parent says which region it wants
  // framed and this reacts. An earlier version hung a function off `window` for
  // the filter bar to call, which worked and was the wrong shape, since it put a
  // global in the way of what React already does.
  useEffect(() => {
    if (focusKey) focusRegion(focusKey);
    else reset();
  }, [focusKey, focusRegion, reset]);

  /**
   * Clusters are computed in the *zoomed* screen space, so the cell size is
   * divided by the current scale. That is what makes groups dissolve as the
   * reader zooms rather than staying stubbornly merged.
   */
  const clusters = useMemo(
    () =>
      clusterPins(
        pins,
        (lng, lat) => projection([lng, lat]) as [number, number] | null,
        CELL_PX / transform.k,
      ),
    [pins, projection, transform.k],
  );

  const active = pinned ?? hovered;

  // A pinned bubble should close on Escape, the same as any other transient
  // overlay on the site.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pinned]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}>
      {!land && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label="World map of reported cases"
        onClick={(e) => {
          // A click on empty ocean dismisses a pinned bubble.
          if (e.target === svgRef.current) setPinned(null);
        }}
      >
        <g transform={transform.toString()}>
          {land?.features.map((f, i) => (
            <path
              key={i}
              d={pathFor(f) ?? undefined}
              className="fill-muted-foreground/[0.13] stroke-border"
              // Constant apparent stroke: without dividing by the scale, borders
              // grow into thick slabs as the reader zooms in.
              strokeWidth={0.6 / transform.k}
            />
          ))}

          {clusters.map((c) => {
            const single = c.single;
            const isActive = active?.key === c.key;
            const r = (single ? 4.2 : Math.min(12, 5.5 + Math.log2(c.members.length) * 2.2)) / transform.k;

            return (
              <g key={c.key}>
                {/* Approximate locations get a halo rather than a hard dot, so
                    "Phoenix and across Arizona" does not read as a street. */}
                {single?.approximate && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={r * 2.6}
                    fill={PIN_FILL[single.classification]}
                    opacity={0.16}
                  />
                )}

                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r}
                  fill={single ? PIN_FILL[single.classification] : "var(--primary)"}
                  fillOpacity={single ? 0.95 : 0.82}
                  stroke="var(--card)"
                  strokeWidth={(isActive ? 2 : 1.1) / transform.k}
                  className="cursor-pointer transition-[r]"
                  // Only a single pin offers a bubble. Hovering a collapsed group
                  // would have to name one of twelve events arbitrarily.
                  onMouseEnter={() => single && setHovered(c)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (single) setPinned(c);
                    else zoomTo(Math.min(MAX_ZOOM, transform.k * 2.4));
                  }}
                />

                {!single && c.members.length > 1 && (
                  <text
                    x={c.x}
                    y={c.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--primary-foreground)"
                    fontSize={Math.min(11, r * 1.05) / 1}
                    style={{ fontSize: `${Math.max(6, r * 0.95)}px` }}
                    className="pointer-events-none select-none font-medium"
                  >
                    {c.members.length}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* The bubble. Positioned in CSS pixels from the projected point, so it
          does not inherit the zoom transform and stays a readable size. */}
      {active?.single && (
        <MapBubble
          pin={active.single}
          x={((transform.applyX(active.x)) / WIDTH) * 100}
          y={((transform.applyY(active.y)) / HEIGHT) * 100}
          onClose={() => {
            setPinned(null);
            setHovered(null);
          }}
        />
      )}

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <MapButton label="Zoom in" onClick={() => zoomTo(Math.min(MAX_ZOOM, transform.k * 1.8))}>
          <Plus className="size-4" aria-hidden />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomTo(Math.max(1, transform.k / 1.8))}>
          <Minus className="size-4" aria-hidden />
        </MapButton>
        <MapButton label="Reset view" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden />
        </MapButton>
      </div>

      {pins.length === 0 && land && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <p className="rounded-md border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        </div>
      )}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

function MapBubble({
  pin,
  x,
  y,
  onClose,
}: {
  pin: Pin;
  x: number;
  y: number;
  onClose: () => void;
}) {
  // Flips to the other side near an edge, so a pin in the far east of the map
  // does not push its own bubble out of view.
  const flipX = x > 66;
  const flipY = y < 26;

  return (
    <div
      className="pointer-events-none absolute z-20 w-60"
      style={{
        left: `${Math.min(96, Math.max(4, x))}%`,
        top: `${Math.min(96, Math.max(4, y))}%`,
        transform: `translate(${flipX ? "-100%" : "0"}, ${flipY ? "8px" : "-100%"})`,
      }}
    >
      <div className="pointer-events-auto rounded-xl border border-border bg-card p-3 shadow-lg">
        <p className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">
          {CLASSIFICATION_LABELS[pin.classification]}
        </p>
        <p className="mt-1 font-[family-name:var(--font-serif)] text-sm leading-snug">
          {pin.title}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {pin.location} · {pin.dateLabel}
          {pin.approximate && " (approximate)"}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <Link
            href={`/cases/${pin.slug}`}
            className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
          >
            Read the case
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
