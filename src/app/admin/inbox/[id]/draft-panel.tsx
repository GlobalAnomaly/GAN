"use client";

import { useActionState } from "react";
import { AlertTriangle, BookMarked, Info, Loader2 } from "lucide-react";
import {
  approveCandidate,
  dismissCandidate,
  draftCandidate,
  type ApproveState,
  type DraftState,
} from "@/app/admin/actions";
import type { Candidate } from "@/lib/admin/store";
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_ORDER,
} from "@/lib/labels";

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

            {approveState?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {approveState.error}
              </p>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <button
                type="submit"
                disabled={approving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {approving && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {approving ? "Publishing" : "Approve and publish"}
              </button>

              <button
                type="submit"
                formAction={dismissCandidate}
                className="rounded-md border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                Dismiss
              </button>
            </div>

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
