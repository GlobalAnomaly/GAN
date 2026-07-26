import { ExternalLink, FileText } from "lucide-react";
import type { BlockPlacement, CaseDocument, CaseMedia } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Media and documents rendered wherever they belong on the page.
 *
 * The point of these is that a case reads like a piece of journalism rather
 * than a database row: the sensor video sits under the passage describing what
 * it shows, the resolution report sits under the passage about the finding,
 * and a reader is never asked to hold six paragraphs in their head before
 * being shown the thing being described.
 */

function aspectFor(item: CaseMedia) {
  return item.type === "short" || item.type === "tiktok"
    ? "aspect-[9/16] max-h-[70vh] mx-auto"
    : "aspect-video";
}

function Caption({
  caption,
  credit,
}: {
  caption?: string | null;
  credit?: string | null;
}) {
  if (!caption && !credit) return null;

  return (
    <figcaption className="mt-2 text-sm leading-relaxed text-muted-foreground">
      {caption}
      {credit && (
        <span className={cn("text-xs", caption && "ml-2")}>
          Credit: {credit}
        </span>
      )}
    </figcaption>
  );
}

/** A single piece of media, self-hosted or embedded. */
export function MediaBlock({
  item,
  className,
}: {
  item: CaseMedia;
  className?: string;
}) {
  if (item.type === "image") {
    return (
      <figure className={className}>
        {/* Imagery comes from many hosts, including government CDNs, so a plain
            img avoids gatekeeping publication on a next.config change. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.embed_url}
          alt={item.caption ?? ""}
          loading="lazy"
          className="w-full rounded-xl border border-border"
        />
        <Caption caption={item.caption} credit={item.credit} />
      </figure>
    );
  }

  // A file we hold ourselves gets a real player rather than an iframe. Public
  // domain government footage is the case for this, and it means the clip
  // cannot vanish because someone else took it down.
  if (item.type === "video_file" || item.is_self_hosted) {
    return (
      <figure className={className}>
        <video
          controls
          preload="metadata"
          poster={item.poster_url ?? undefined}
          className={cn(
            "w-full rounded-xl border border-border bg-black",
            aspectFor(item),
          )}
        >
          <source src={item.embed_url} />
          Your browser cannot play this video. You can still download it from
          the source linked below.
        </video>
        <Caption caption={item.caption} credit={item.credit} />
      </figure>
    );
  }

  return (
    <figure className={className}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border border-border bg-muted",
          aspectFor(item),
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
      <Caption caption={item.caption} credit={item.credit} />
    </figure>
  );
}

/** A document, as a card the reader can act on rather than a bare link. */
export function DocumentBlock({
  doc,
  className,
}: {
  doc: CaseDocument;
  className?: string;
}) {
  const pages = doc.page_count ? `${doc.page_count}-page ` : "";

  return (
    <a
      href={doc.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50",
        className,
      )}
    >
      <FileText
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{doc.title}</span>
        {doc.published_by && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Published by {doc.published_by}
          </span>
        )}
        {doc.source_note && (
          <span className="mt-1 block text-sm text-muted-foreground">
            {doc.source_note}
          </span>
        )}
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
          Read the full {pages}report at the source
          <ExternalLink className="size-3" aria-hidden />
        </span>
      </span>
    </a>
  );
}

/**
 * Everything sitting at one placement point, media first then documents.
 *
 * Returns null when empty rather than an empty wrapper, so a case with nothing
 * at a given point does not leave a gap that reads as a broken layout.
 */
export function BlockGroup({
  media,
  documents,
  placement,
}: {
  media: CaseMedia[];
  documents: CaseDocument[];
  placement: BlockPlacement;
}) {
  const m = media
    .filter((x) => (x.placement ?? "hero") === placement)
    .sort((a, b) => a.sort_order - b.sort_order);

  const d = documents
    .filter((x) => (x.placement ?? "end") === placement)
    .sort((a, b) => (a.page_count ?? 0) - (b.page_count ?? 0));

  if (m.length === 0 && d.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      {m.map((item) => (
        <MediaBlock key={item.id} item={item} />
      ))}
      {d.map((doc) => (
        <DocumentBlock key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
