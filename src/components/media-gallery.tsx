"use client";

import { useState } from "react";
import { FileVideo } from "lucide-react";
import type { CaseMedia } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Phone-shot vertical video and gun-camera 16:9 footage both belong here, and
 * forcing one into the other's frame either crops evidence away or pillarboxes
 * it into a letterbox. The aspect follows the source.
 */
function aspectFor(type: CaseMedia["type"]) {
  return type === "short" || type === "tiktok"
    ? "aspect-[9/16] max-h-[70vh]"
    : "aspect-video";
}

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
    case "image":
      return "Image";
  }
}

function Frame({ item }: { item: CaseMedia }) {
  const aspect = aspectFor(item.type);

  if (item.type === "image") {
    return (
      // Sources are arbitrary external hosts, so a plain img avoids having to
      // allow-list every domain in next.config before a case can be published.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.embed_url}
        alt={item.caption ?? ""}
        className="w-full rounded-xl border border-border object-cover"
      />
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-xl border border-border bg-muted",
        aspect,
      )}
    >
      <iframe
        src={item.embed_url}
        title={item.caption ?? "Case footage"}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full border-0"
      />
    </div>
  );
}

/**
 * Shown when a case has no footage attached. Plenty of the strongest cases in
 * the archive are documentary rather than filmed, so this is a normal state
 * and should not read like a broken page.
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
    <figure className="space-y-3">
      <Frame item={active} />

      <figcaption className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
        <span className="text-foreground">{labelFor(active.type)}</span>
        {active.caption && <span>{active.caption}</span>}
      </figcaption>

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
    </figure>
  );
}
