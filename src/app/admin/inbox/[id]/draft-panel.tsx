"use client";

import { useActionState } from "react";
import { AlertTriangle, BookMarked, Info, Loader2, RotateCcw } from "lucide-react";
import {
  approveCandidate,
  dismissCandidate,
  draftCandidate,
  redraftCandidate,
  type ApproveState,
  type DraftState,
} from "@/app/admin/actions";
import type { Candidate } from "@/lib/admin/store";
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_ORDER,
} from "@/lib/labels";

const LANG_LABELS: Record<string, string> = {
  fr: "French",
  pt: "Portuguese",
  es: "Spanish",
};

/**
 * The parts compared between English and a translation, in reading order.
 * The key differs on the first row: the account calls it `headline`, the
 * translation record calls it `title`.
 */
const SECTION_FIELDS = [
  { en: "headline", tr: "title", label: "Headline" },
  { en: "summary", tr: "summary", label: "Summary" },
  { en: "body_footage", tr: "body_footage", label: "What it shows" },
  { en: "body_testimony", tr: "body_testimony", label: "Testimony" },
  { en: "body_status", tr: "body_status", label: "Status" },
  { en: "body_unknown", tr: "body_unknown", label: "What remains unknown" },
] as const;

function Field({
  label,
  name,
  defaultValue,
  rows = 5,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </div>
  );
}

export function DraftPanel({
  candidate,
  models,
  defaultModel,
  ollamaUp,
}: {
  candidate: Candidate;
  models: string[];
  defaultModel: string;
  ollamaUp: boolean;
}) {
  const [draftState, draftAction, drafting] = useActionState<
    DraftState | null,
    FormData
  >(draftCandidate, null);

  const [approveState, approveAction, approving] = useActionState<
    ApproveState | null,
    FormData
  >(approveCandidate, null);

  const draft = candidate.draft;
  const flags = draft?.validation;
  const blocked = (flags?.errors.length ?? 0) > 0;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {/* Source, so the reviewer can check the draft against it. */}
      <section>
        <h2 className="font-[family-name:var(--font-serif)] text-lg">
          The source
        </h2>

        <div
          className={
            candidate.media_type === "short"
              ? "mt-3 aspect-[9/16] max-h-[60vh] overflow-hidden rounded-xl border border-border"
              : "mt-3 aspect-video overflow-hidden rounded-xl border border-border"
          }
        >
          <iframe
            src={candidate.embed_url}
            title={candidate.title}
            allowFullScreen
            loading="lazy"
            className="h-full w-full border-0"
          />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">
            Everything the model was given
          </p>
          <p className="mt-2 text-sm font-medium">{candidate.title}</p>
          <p className="mt-2 max-h-72 overflow-y-auto text-sm whitespace-pre-wrap text-muted-foreground">
            {candidate.description || "(the uploader wrote no description)"}
          </p>
        </div>

        {candidate.description.length < 200 && (
          <p className="mt-3 flex gap-2 rounded-md bg-unverified/30 p-3 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This is a thin source. A short account with most of the weight in
              what remains unknown is the correct result here, not a fuller one.
            </span>
          </p>
        )}
      </section>

      {/* Draft */}
      <section>
        <h2 className="font-[family-name:var(--font-serif)] text-lg">
          The draft
        </h2>

        {!draft && (
          <form action={draftAction} className="mt-3 space-y-4">
            <input type="hidden" name="id" value={candidate.id} />

            {!ollamaUp && (
              <p className="rounded-md bg-unverified/30 px-3 py-2 text-sm">
                Ollama is not running, so nothing can be drafted. Start the
                Ollama app and reload this page.
              </p>
            )}

            <div>
              <label htmlFor="model" className="mb-1.5 block text-sm">
                Model
              </label>
              <select
                id="model"
                name="model"
                defaultValue={defaultModel}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                {(models.length ? models : [defaultModel]).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Smaller models invent more detail. 8B is the smallest that holds
                the rules reliably.
              </p>
            </div>

            <div>
              <label htmlFor="transcript" className="mb-1.5 block text-sm">
                Transcript or extra source text (optional)
              </label>
              <p className="mb-1.5 text-xs text-muted-foreground">
                This is the single biggest thing you can do for quality. An
                uploader&apos;s description is thin, so names and dates spoken
                in the video get flagged as possibly invented. Paste the
                transcript and they become sourced facts instead.
              </p>
              <textarea
                id="transcript"
                name="transcript"
                rows={6}
                placeholder="Paste a transcript, an article, or notes from an official document."
                className="w-full rounded-md border border-border bg-card p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="translate" className="size-4" />
              Also write French, Portuguese and Spanish
            </label>

            <button
              type="submit"
              disabled={drafting || !ollamaUp}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {drafting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {drafting ? "Writing" : "Write the draft"}
            </button>

            {drafting && (
              <p className="text-sm text-muted-foreground">
                Running on your GPU. Usually under a minute, longer with
                translations.
              </p>
            )}

            {draftState?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {draftState.error}
              </p>
            )}
          </form>
        )}

        {draft && (
          <form action={approveAction} className="mt-3 space-y-5">
            <input type="hidden" name="id" value={candidate.id} />

            {draft.matched_event && (
              <div className="rounded-xl border border-border bg-proposed/20 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <BookMarked className="size-4" aria-hidden />
                  Matched to a known event: {draft.matched_event.name}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Established facts about this event were given to the model
                  alongside the video, so the date and place come from the
                  archive rather than from the model&apos;s memory. Recorded on
                  the authority of {draft.matched_event.authority}.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Matched because the text contains &ldquo;
                  {draft.matched_event.matched_on}&rdquo;. If that is a
                  coincidence and this is a different event, fix the fields
                  below before publishing.
                </p>

                {draft.matched_event.documents.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Official archives will be attached:{" "}
                    {draft.matched_event.documents
                      .map((d) => d.title)
                      .join(", ")}
                    .
                  </p>
                )}

                {draft.matched_event.canonical_slug && (
                  <label className="mt-3 flex gap-2 rounded-md bg-background/60 p-3 text-sm">
                    <input
                      type="checkbox"
                      name="merge_into"
                      value={draft.matched_event.canonical_slug}
                      defaultChecked
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <span>
                      Add this to the existing case instead of making a new one.
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        We already cover this event. Merging adds the video as
                        another angle on{" "}
                        <code>{draft.matched_event.canonical_slug}</code>, which
                        makes one strong case rather than two competing ones.
                        Your edits below are ignored when merging.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}

            {flags && flags.errors.length > 0 && (
              <div className="rounded-xl border border-border bg-debunked/20 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="size-4" aria-hidden />
                  {flags.errors.length} thing
                  {flags.errors.length === 1 ? "" : "s"} to fix before this can
                  publish
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {flags.errors.map((f, i) => (
                    <li key={i}>{f.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {flags && flags.warnings.length > 0 && (
              <details className="rounded-xl border border-border bg-unverified/20 p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {flags.warnings.length} thing
                  {flags.warnings.length === 1 ? "" : "s"} worth checking by eye
                </summary>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {flags.warnings.map((f, i) => (
                    <li key={i}>{f.message}</li>
                  ))}
                </ul>
              </details>
            )}

            <div>
              <label htmlFor="headline" className="mb-1.5 block text-sm">
                Headline
              </label>
              <input
                id="headline"
                name="headline"
                defaultValue={draft.account.headline}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-primary"
              />
            </div>

            <div>
              <label htmlFor="classification" className="mb-1.5 block text-sm">
                Classification
              </label>
              <select
                id="classification"
                name="classification"
                defaultValue={draft.classification?.classification ?? "unverified"}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                {CLASSIFICATION_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CLASSIFICATION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Why this label"
              name="classification_reason"
              rows={2}
              defaultValue={draft.classification?.classification_reason ?? ""}
            />

            <Field
              label="Summary"
              name="summary"
              rows={3}
              defaultValue={draft.account.summary}
            />

            <Field
              label="What the footage shows"
              name="body_footage"
              defaultValue={draft.account.body_footage}
              hint="Observable description only, no interpretation."
            />

            <Field
              label="What witnesses and officials say"
              name="body_testimony"
              defaultValue={draft.account.body_testimony}
              hint="Attributed. Credentials shown, never asserted."
            />

            <Field
              label="Status and corroboration"
              name="body_status"
              defaultValue={draft.account.body_status}
            />

            <Field
              label="What remains unknown"
              name="body_unknown"
              defaultValue={draft.account.body_unknown}
              hint="Never empty. If it looks empty, something has been smoothed over."
            />

            {/* Translations, side by side with their English original.
                Reviewing a translation you cannot read means checking that
                nothing was dropped and that hedged words stayed hedged, which
                only works if both versions are visible together. */}
            {Object.keys(draft.translations).length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <h3 className="font-[family-name:var(--font-serif)] text-lg">
                  Translations
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These publish with an auto-translated label. You do not need
                  to be fluent to check them: compare the lengths, confirm
                  nothing is missing, and look for hedging words surviving.
                  &ldquo;Reported&rdquo; must not have become
                  &ldquo;happened&rdquo;.
                </p>

                {(
                  Object.entries(draft.translations) as unknown as [
                    string,
                    Record<string, string>,
                  ][]
                ).map(([lang, t]) => (
                  <details key={lang} className="mt-3 rounded-md border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-sm">
                      {LANG_LABELS[lang] ?? lang}
                    </summary>

                    <div className="space-y-4 border-t border-border p-3">
                      {SECTION_FIELDS.map(({ en, tr, label }) => {
                        const english = String(
                          draft.account[en as keyof typeof draft.account] ?? "",
                        );
                        const translated = String(t[tr] ?? "");
                        const ratio = english
                          ? translated.length / english.length
                          : 1;

                        return (
                          <div key={en}>
                            <p className="mb-1 text-xs text-muted-foreground">
                              {label}
                              {english && (
                                <span
                                  className={
                                    ratio < 0.5 || ratio > 1.8
                                      ? "ml-2 text-debunked-foreground"
                                      : "ml-2"
                                  }
                                >
                                  {english.length} to {translated.length} chars
                                </span>
                              )}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <p className="rounded bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                                {english || "(empty)"}
                              </p>
                              <p className="rounded bg-muted/50 p-2 text-xs leading-relaxed">
                                {translated || "(missing)"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            )}

            {approveState?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {approveState.error}
              </p>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              {/* Blocked while a hard rule is broken. The server re-checks
                  anyway, so this is the honest version of the same answer
                  rather than a button that fails after you press it. */}
              <button
                type="submit"
                disabled={approving || blocked}
                title={
                  blocked
                    ? "Fix the blocking problems above first, or write it again."
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {approving && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {approving
                  ? "Publishing"
                  : blocked
                    ? "Cannot publish yet"
                    : "Approve and publish"}
              </button>

              <button
                type="submit"
                formAction={redraftCandidate}
                formNoValidate
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Write it again
              </button>

              <button
                type="submit"
                formAction={dismissCandidate}
                formNoValidate
                className="rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
              >
                Dismiss
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Writing it again throws this draft away and starts over, which is
              what you want after the prompts change or to compare two models.
              Your edits here are not kept.
            </p>

            <p className="text-xs text-muted-foreground">
              Your edits are what gets published, not the model&apos;s original.
              The rules are re-checked on your version too, so a hand-typed em
              dash is caught the same way.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
