import {
  CLASSIFICATION_BADGE,
  CLASSIFICATION_DEFINITIONS,
  CLASSIFICATION_LABELS,
  SCIENCE_STATUS_BADGE,
  SCIENCE_STATUS_DEFINITIONS,
  SCIENCE_STATUS_LABELS,
} from "@/lib/labels";
import type { Classification, ScienceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function ClassificationBadge({
  value,
  className,
}: {
  value: Classification;
  className?: string;
}) {
  return (
    <span
      className={cn(base, CLASSIFICATION_BADGE[value], className)}
      title={CLASSIFICATION_DEFINITIONS[value]}
    >
      {CLASSIFICATION_LABELS[value]}
    </span>
  );
}

export function ScienceStatusBadge({
  value,
  className,
}: {
  value: ScienceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(base, SCIENCE_STATUS_BADGE[value], className)}
      title={SCIENCE_STATUS_DEFINITIONS[value]}
    >
      {SCIENCE_STATUS_LABELS[value]}
    </span>
  );
}
