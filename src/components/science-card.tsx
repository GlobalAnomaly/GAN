import Link from "next/link";
import { ScienceStatusBadge } from "@/components/badges";
import { SCIENCE_TOPIC_LABELS } from "@/lib/labels";
import type { ScienceRecord } from "@/lib/types";

export function ScienceCard({ item }: { item: ScienceRecord }) {
  return (
    <div className="relative">
      <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
        <div className="flex flex-wrap items-center gap-2">
          <ScienceStatusBadge value={item.status} />
          <span className="text-xs text-muted-foreground">
            {SCIENCE_TOPIC_LABELS[item.topic]}
          </span>
        </div>

        <h3 className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-snug">
          <Link
            href={`/science/${item.slug}`}
            className="after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
          >
            {item.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        {item.institutions.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {item.institutions.slice(0, 2).join(" · ")}
          </p>
        )}
      </article>
    </div>
  );
}
