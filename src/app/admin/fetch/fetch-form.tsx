"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { fetchFromYouTube, type FetchState } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "channel", label: "A channel", hint: "@handle or a UC... id" },
  { value: "search", label: "A search", hint: "words to search for" },
  { value: "url", label: "A single link", hint: "one YouTube video URL" },
] as const;

export function FetchForm() {
  const [mode, setMode] = useState<string>("channel");
  const [state, action, pending] = useActionState<FetchState | null, FormData>(
    fetchFromYouTube,
    null,
  );

  const current = MODES.find((m) => m.value === mode)!;

  return (
    <form action={action} className="max-w-xl space-y-5">
      <input type="hidden" name="mode" value={mode} />

      <div>
        <p className="mb-2 text-sm">What are you fetching from?</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              aria-pressed={mode === m.value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                mode === m.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="value" className="mb-1.5 block text-sm">
          {current.label}
        </label>
        <input
          id="value"
          name="value"
          placeholder={current.hint}
          className="h-11 w-full rounded-md border border-border bg-card px-3 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {mode !== "url" && (
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="since" className="mb-1.5 block text-sm">
              Only newer than
            </label>
            <input
              id="since"
              name="since"
              type="date"
              className="h-11 rounded-md border border-border bg-card px-3 outline-none focus-visible:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty for the whole history
            </p>
          </div>
          <div>
            <label htmlFor="max" className="mb-1.5 block text-sm">
              How many at most
            </label>
            <input
              id="max"
              name="max"
              type="number"
              defaultValue={50}
              min={1}
              max={500}
              className="h-11 w-28 rounded-md border border-border bg-card px-3 outline-none focus-visible:border-primary"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Fetching" : "Fetch"}
      </button>

      {pending && (
        <p className="text-sm text-muted-foreground">
          Asking YouTube. A large channel can take a minute.
        </p>
      )}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {state?.message && (
        <div className="rounded-md border border-border bg-acknowledged/30 px-4 py-3 text-sm">
          <p>{state.message}</p>
          {state.quotaUsed !== undefined && (
            <p className="mt-1 text-muted-foreground">
              Used {state.quotaUsed} of today&apos;s 10,000 allowance.
            </p>
          )}
          <Link
            href="/admin/inbox"
            className="mt-2 inline-block text-primary hover:underline"
          >
            Open the review inbox
          </Link>
        </div>
      )}
    </form>
  );
}
