"use client";

import { useState } from "react";
import { FileVideo } from "lucide-react";
import { MediaBlock } from "@/components/case-blocks";
import type { CaseMedia } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The lead media, with angle switching when a case has more than one.
 *
 * Rendering is delegated to MediaBlock so there is one place that knows how to
 * draw a piece of media. This component used to draw its own, which meant a
 * self-hosted video file arrived after the fact and was quietly rendered in an
 * iframe: the gallery had never heard of it. A multi-angle case is stronger
 * evidence than a single clip, so switching is the only job left here.
 */

function labelFor(type: CaseMedia["type"]) {
  switch (type) {
    case "youtube":
      return "YouTube";
    case "short":
      return "YouTube Shorts";
    case "tiktok":
      return "TikTok";
    case "gov_file":
      return "Official release";
    case "video_file":
      return "Official release";
    case "image":
      return "Image";
  }
}

/**
 * Shown when a case has no footage at all. Plenty of the strongest entries are
 * documentary rather than filmed, so this is a normal state and should not read
 * like a broken page.
 */
function NoMedia({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
      <FileVideo className="size-6 text-muted-foreground" aria-hidden />
      <p className="max-w-md text-sm text-muted-foreground">
        No footage is attached to this case.{" "}
        {hasDocuments
          ? "The record here is documentary, and the source files are linked below."
          : "The record here rests on testimony and reporting rather than film."}
      </p>
    </div>
  );
}

export function MediaGallery({
  media,
  hasDocuments = false,
}: {
  media: CaseMedia[];
  hasDocuments?: boolean;
}) {
  const ordered = [...media].sort((a, b) => {
    if (a.role !== b.role) return a.role === "primary" ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

  const [activeId, setActiveId] = useState(ordered[0]?.id);
  const active = ordered.find((m) => m.id === activeId) ?? ordered[0];

  if (!active) return <NoMedia hasDocuments={hasDocuments} />;

  return (
    <div className="space-y-3">
      <MediaBlock item={active} />

      {ordered.length > 1 && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {ordered.length} angles of this event
          </p>
          <div className="flex flex-wrap gap-2">
            {ordered.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveId(m.id)}
                aria-pressed={m.id === active.id}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  m.id === active.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {m.role === "primary" ? "Primary" : `Angle ${i + 1}`}
                <span className="ml-1.5 opacity-70">{labelFor(m.type)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
