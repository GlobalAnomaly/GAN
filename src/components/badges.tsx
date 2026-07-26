"use client";

import { useI18n } from "@/components/i18n-provider";
import {
  CLASSIFICATION_BADGE,
  SCIENCE_STATUS_BADGE,
  SCIENCE_STATUS_DEFINITIONS,
  SCIENCE_STATUS_LABELS,
} from "@/lib/labels";
import type { Classification, ScienceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Colour still comes from `labels.ts`, which reads it from the CSS variables in
 * `globals.css`. Only the words come from the dictionary. A classification means
 * the same thing in four languages and must therefore look the same in four
 * languages, so the badge colour is not something translation is allowed near.
 */

const base =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function ClassificationBadge({
  value,
  className,
}: {
  value: Classification;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <span
      className={cn(base, CLASSIFICATION_BADGE[value], className)}
      title={t.classificationDefinition[value]}
    >
      {t.classification[value]}
    </span>
  );
}

/**
 * Not yet translated: the science status labels are still in `labels.ts`.
 * They belong in the dictionary alongside the topic names, which is the next
 * slice of this work rather than something to half-do here.
 */
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
