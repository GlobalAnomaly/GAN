"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CaseCard } from "@/components/case-card";
import type { CaseSummary } from "@/lib/types";

const SPEED_PX_PER_SECOND = 18;

/**
 * A slow horizontal drift that pauses on hover, on focus, and whenever the
 * reader takes the scrollbar themselves. Motion here is decoration, so it is
 * switched off entirely under prefers-reduced-motion rather than merely
 * shortened, and the arrows keep the strip fully usable without it.
 */
export function ScrollStrip({ items }: { items: CaseSummary[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || paused) return;

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const max = track.scrollWidth - track.clientWidth;
      if (max > 0) {
        // Wrap back to the start instead of stopping dead at the end.
        const next = track.scrollLeft + SPEED_PX_PER_SECOND * dt;
        track.scrollLeft = next >= max - 1 ? 0 : next;
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const nudge = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.max(280, track.clientWidth * 0.8),
      behavior: "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={() => setPaused(true)}
      >
        {items.map((item) => (
          <div key={item.id} className="relative w-[280px] shrink-0 sm:w-[320px]">
            <CaseCard item={item} className="h-full" />
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll left"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll right"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
