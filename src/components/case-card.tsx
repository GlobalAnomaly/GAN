import Link from "next/link";
import { ClassificationBadge } from "@/components/badges";
import { formatEventDate, formatLocation } from "@/lib/labels";
import type { CaseSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CaseCard({
  item,
  className,
}: {
  item: CaseSummary;
  className?: string;
}) {
  const location = formatLocation(
    item.location_name,
    item.country,
    item.continent,
    false,
  );

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <ClassificationBadge value={item.classification} className="self-start" />

      <h3 className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-snug">
        <Link
          href={`/cases/${item.slug}`}
          className="after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
        >
          {item.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {item.summary}
      </p>

      <p className="mt-4 text-xs text-muted-foreground">
        {location} · {formatEventDate(item.date_of_event, item.date_precision)}
      </p>
    </article>
  );
}

/**
 * The card's title link is stretched over the whole card, so the wrapper needs
 * a positioning context. Kept separate from the card itself so grids can size
 * the cell without fighting the absolute overlay.
 */
export function CaseCardCell({ item }: { item: CaseSummary }) {
  return (
    <div className="relative">
      <CaseCard item={item} />
    </div>
  );
}
