"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { ArrowRight } from "lucide-react";
import { greatCircleDegrees } from "@/lib/map/pins";
import type { Classification } from "@/lib/types";

/**
 * A slowly turning globe on the home page, and the way into the map.
 *
 * Orthographic rather than the flat Natural Earth of the map itself, because the
 * point here is different: the map is for finding a case, this is for showing
 * that the archive is worldwide. A globe says that in one glance and a rectangle
 * does not.
 *
 * Reuses the same vendored atlas as the map, so it costs no new download and no
 * third-party request.
 *
 * Motion rules, per `AGENTS.md`:
 *   - rotation stops entirely under `prefers-reduced-motion`, since it is
 *     decoration and the globe reads perfectly well standing still
 *   - it pauses on hover and on keyboard focus, so a reader aiming at a pin is
 *     not chasing a moving target
 *   - the rAF loop is torn down when the tab is hidden, because animating a
 *     globe nobody is looking at is pure battery cost
 */

const SIZE = 320;
/** Degrees per second. Slow enough to read as drift rather than spin. */
const SPEED = 4.5;

const PIN_FILL: Record<Classification, string> = {
  acknowledged: "var(--acknowledged-foreground)",
  unverified: "var(--unverified-foreground)",
  likely_explained: "var(--explained-foreground)",
  debunked: "var(--debunked-foreground)",
};

export interface GlobePin {
  lat: number;
  lng: number;
  classification: Classification;
}

interface Land {
  type: "FeatureCollection";
  features: GeoPermissibleObjects[];
}

export function GlobeTeaser({
  pins,
  caseCount,
  countryCount,
}: {
  pins: GlobePin[];
  caseCount: number;
  countryCount: number;
}) {
  const [land, setLand] = useState<Land | null>(null);
  const [rotation, setRotation] = useState(-20);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/geo/countries-110m.json");
        if (!res.ok) return;
        const topo = await res.json();
        const { feature } = await import("topojson-client");
        const collection = feature(topo, topo.objects.countries) as unknown as Land;
        if (!cancelled) setLand(collection);
      } catch {
        // The globe simply does not appear. The link beside it still works, so
        // the map stays reachable either way.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paused) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Modulo keeps the value bounded: left to accumulate it would drift into
      // float imprecision after a few hours on an idle tab.
      setRotation((r) => (r + SPEED * dt) % 360);
      frame = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [paused]);

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(SIZE / 2 - 2)
        .translate([SIZE / 2, SIZE / 2])
        .rotate([rotation, -12]),
    [rotation],
  );

  const pathFor = useMemo(() => geoPath(projection), [projection]);

  // Orthographic hides half the sphere, so a pin on the far side must not be
  // drawn: the projection returns a point regardless, and without this check the
  // back of the globe shows through as a ghost of pins that should be occluded.
  const visible = useMemo(() => {
    const centre: [number, number] = [-rotation, 12];
    return pins.flatMap((p) => {
      const point = projection([p.lng, p.lat]);
      if (!point) return [];
      const angle = greatCircleDegrees(centre, [p.lng, p.lat]);
      if (angle > 90) return [];
      return [{ ...p, x: point[0], y: point[1], fade: angle > 74 ? 0.35 : 1 }];
    });
  }, [pins, projection, rotation]);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <Link
        href="/map"
        aria-label="Open the interactive map"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        style={{ width: SIZE / 1.4, height: SIZE / 1.4 }}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full overflow-visible"
          aria-hidden
        >
          {/* The sphere itself, so the globe reads as an object rather than a
              floating scatter of countries. */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={SIZE / 2 - 2}
            className="fill-card stroke-border transition-colors group-hover:stroke-primary/50"
            strokeWidth={1}
          />

          {land?.features.map((f, i) => (
            <path
              key={i}
              d={pathFor(f) ?? undefined}
              className="fill-muted-foreground/20 stroke-border/70"
              strokeWidth={0.4}
            />
          ))}

          {visible.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.2}
              fill={PIN_FILL[p.classification]}
              opacity={p.fade}
              stroke="var(--card)"
              strokeWidth={0.9}
            />
          ))}
        </svg>
      </Link>

      <div className="text-center sm:text-left">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">
          Every case, where it happened
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {caseCount} {caseCount === 1 ? "case" : "cases"} across {countryCount}{" "}
          {countryCount === 1 ? "country" : "countries"}, plotted where they were
          reported. Filter by classification, region or decade, and zoom in until
          the events separate.
        </p>
        <Link
          href="/map"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open the map
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
