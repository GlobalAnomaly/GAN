import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { counts } from "@/lib/admin/store";
import { isAvailable, listModels, DEFAULT_MODEL } from "@/lib/bot/ollama";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function Status({
  ok,
  label,
  detail,
  fix,
}: {
  ok: boolean;
  label: string;
  detail: string;
  fix?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border p-4">
      <span
        className={
          ok
            ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-acknowledged text-acknowledged-foreground"
            : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-unverified text-unverified-foreground"
        }
      >
        {ok ? (
          <Check className="size-3" aria-hidden />
        ) : (
          <X className="size-3" aria-hidden />
        )}
      </span>
      <div>
        <p className="text-sm">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
        {!ok && fix && (
          <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
            {fix}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function AdminHome() {
  const [inbox, ollamaUp, models] = await Promise.all([
    counts(),
    isAvailable(),
    listModels(),
  ]);

  const hasYouTube = Boolean(process.env.YOUTUBE_API_KEY);
  const hasSupabase = isSupabaseConfigured;
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-serif)] text-3xl">
        What needs doing
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/inbox"
          className="rounded-xl border border-border p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <p className="font-[family-name:var(--font-serif)] text-3xl">
            {inbox.new}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            waiting to be drafted
          </p>
        </Link>

        <Link
          href="/admin/inbox?status=drafted"
          className="rounded-xl border border-border p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <p className="font-[family-name:var(--font-serif)] text-3xl">
            {inbox.drafted}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            drafted, waiting for you
          </p>
        </Link>

        <div className="rounded-xl border border-border p-5">
          <p className="font-[family-name:var(--font-serif)] text-3xl">
            {inbox.seen}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            videos ever seen, never shown twice
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/fetch"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          Find videos
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {inbox.new + inbox.drafted > 0 && (
          <Link
            href="/admin/inbox"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            Open the inbox
          </Link>
        )}
      </div>

      <h2 className="mt-12 font-[family-name:var(--font-serif)] text-xl">
        Setup
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Each of these unlocks one part of the workflow. Nothing breaks while one
        is missing, that step is just unavailable.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Status
          ok={ollamaUp}
          label="Ollama, for writing drafts"
          detail={
            ollamaUp
              ? `Running. ${models.length} model${models.length === 1 ? "" : "s"}: ${models.join(", ")}`
              : "Not running, so drafting is unavailable."
          }
          fix="Start the Ollama app, or run: ollama serve"
        />
        <Status
          ok={hasYouTube}
          label="YouTube key, for finding videos"
          detail={
            hasYouTube
              ? "Set. Channel and search fetching are available."
              : "Missing, so video fetching is unavailable."
          }
          fix="Add YOUTUBE_API_KEY to .env.local, then restart"
        />
        <Status
          ok={hasSupabase}
          label="Supabase, for the public site"
          detail={
            hasSupabase
              ? "Connected. The site reads from the database."
              : "Not connected. The site is serving the hand-entered seed content."
          }
          fix="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        />
        <Status
          ok={hasServiceRole}
          label="Supabase service key, for publishing"
          detail={
            hasServiceRole
              ? "Set. Approving a draft can publish it."
              : "Missing, so approving cannot write to the database."
          }
          fix="Add SUPABASE_SERVICE_ROLE_KEY to .env.local, then restart"
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Default model: {DEFAULT_MODEL}. Nothing is ever published without you
        pressing approve.
      </p>
    </div>
  );
}
