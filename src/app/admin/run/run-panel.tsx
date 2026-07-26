"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Square } from "lucide-react";
import {
  startRunAction,
  stopRunAction,
  type RunActionState,
} from "@/app/admin/actions";
import type { RunState } from "@/lib/bot/runner";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="font-[family-name:var(--font-serif)] text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function RunPanel({
  state,
  running,
  models,
  defaultModel,
  ollamaUp,
  hasYouTubeKey,
  inboxWaiting,
}: {
  state: RunState;
  running: boolean;
  models: string[];
  defaultModel: string;
  ollamaUp: boolean;
  hasYouTubeKey: boolean;
  inboxWaiting: number;
}) {
  const router = useRouter();
  const [startState, startAction, starting] = useActionState<
    RunActionState | null,
    FormData
  >(startRunAction, null);

  // Progress lives on the server, so the page polls while a run is going.
  // Five seconds is frequent enough to feel live and rare enough to be
  // invisible next to a model call that takes half a minute.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [running, router]);

  const ready = ollamaUp && hasYouTubeKey;

  return (
    <div className="mt-8 space-y-8">
      {!ready && (
        <div className="rounded-xl border border-border bg-unverified/25 p-4 text-sm">
          <p>Not everything a run needs is set up yet.</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {!hasYouTubeKey && <li>YOUTUBE_API_KEY is missing, so it cannot find videos.</li>}
            {!ollamaUp && <li>Ollama is not running, so it cannot write anything.</li>}
          </ul>
        </div>
      )}

      {running ? (
        <div className="rounded-xl border border-primary/40 bg-accent/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {state.status === "stopping"
                ? "Finishing the current one, then stopping"
                : state.status === "fetching"
                  ? "Looking for videos"
                  : "Writing drafts"}
            </p>

            <form action={stopRunAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm transition-colors hover:bg-accent"
              >
                <Square className="size-3.5" aria-hidden />
                Stop
              </button>
            </form>
          </div>

          {state.current && (
            <p className="mt-3 text-sm text-muted-foreground">{state.current}</p>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            You can close this page or shut the browser. It keeps going as long
            as the server is up, so leave the terminal window open.
          </p>
        </div>
      ) : (
        <form action={startAction} className="max-w-2xl space-y-5">
          <div>
            <label htmlFor="sources" className="mb-1.5 block text-sm">
              What to look through
            </label>
            <p className="mb-1.5 text-xs text-muted-foreground">
              One per line. Anything starting with @ or UC is treated as a
              channel, everything else as a search. Channels are roughly fifty
              times cheaper, so prefer them for a big run.
            </p>
            <textarea
              id="sources"
              name="sources"
              rows={6}
              placeholder={"@SomeUAPChannel\n@AnotherChannel\nUAP sighting 2026"}
              className="w-full rounded-md border border-border bg-card p-3 font-[family-name:var(--font-mono)] text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="per_source" className="mb-1.5 block text-sm">
                Videos per source
              </label>
              <input
                id="per_source"
                name="per_source"
                type="number"
                defaultValue={50}
                min={1}
                max={500}
                className="h-10 w-28 rounded-md border border-border bg-card px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="max_drafts" className="mb-1.5 block text-sm">
                Most drafts to write
              </label>
              <input
                id="max_drafts"
                name="max_drafts"
                type="number"
                defaultValue={200}
                min={1}
                max={2000}
                className="h-10 w-28 rounded-md border border-border bg-card px-3 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Roughly one a minute
              </p>
            </div>

            <div>
              <label htmlFor="since" className="mb-1.5 block text-sm">
                Only newer than
              </label>
              <input
                id="since"
                name="since"
                type="date"
                className="h-10 rounded-md border border-border bg-card px-3 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Empty means the whole history
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="model" className="mb-1.5 block text-sm">
              Model
            </label>
            <select
              id="model"
              name="model"
              defaultValue={defaultModel}
              className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="translate" className="mt-0.5 size-4" />
            <span>
              Also write French, Portuguese and Spanish
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Roughly four times slower, so fewer cases get through in a
                night. Worth it once the English is reading well.
              </span>
            </span>
          </label>

          {startState?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {startState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={starting || !ready}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {starting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {starting ? "Starting" : "Start"}
          </button>
        </form>
      )}

      {state.started_at && (
        <section>
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            {running ? "Progress" : "Last run"}
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat value={state.totals.found} label="videos found" />
            <Stat value={state.totals.queued} label="new to us" />
            <Stat value={state.totals.drafted} label="drafted cleanly" />
            <Stat value={state.totals.blocked} label="need a fix" />
            <Stat value={state.totals.failed} label="failed" />
            <Stat value={state.totals.quota_used} label="quota used" />
          </div>

          {state.error && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          {inboxWaiting > 0 && (
            <Link
              href="/admin/inbox?status=drafted"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Review what it wrote
            </Link>
          )}

          {state.log.length > 0 && (
            <details className="mt-4 rounded-xl border border-border" open={running}>
              <summary className="cursor-pointer px-4 py-2.5 text-sm">
                What it did ({state.log.length} entries)
              </summary>
              <div className="max-h-80 overflow-y-auto border-t border-border p-3">
                {[...state.log].reverse().map((entry, i) => (
                  <p
                    key={i}
                    className={
                      entry.level === "error"
                        ? "py-0.5 font-[family-name:var(--font-mono)] text-xs text-destructive"
                        : entry.level === "warn"
                          ? "py-0.5 font-[family-name:var(--font-mono)] text-xs text-unverified-foreground"
                          : "py-0.5 font-[family-name:var(--font-mono)] text-xs text-muted-foreground"
                    }
                  >
                    {entry.at.slice(11, 19)} {entry.message}
                  </p>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
