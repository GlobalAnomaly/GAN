import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { listCandidates } from "@/lib/admin/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function secondsToClock(s: number | null) {
  if (s === null) return null;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, "0")}`;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; published?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.status === "drafted" ? "drafted" : undefined;

  const candidates = await listCandidates(filter);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-serif)] text-3xl">
        Review inbox
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        Nothing on this page is on the site. Each one needs a draft written, then
        your approval.
      </p>

      {sp.published && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-acknowledged/30 px-4 py-3 text-sm">
          <Check className="size-4" aria-hidden />
          <span>Published.</span>
          <Link
            href={`/cases/${sp.published}`}
            className="text-primary hover:underline"
          >
            View it on the site
          </Link>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <Link
          href="/admin/inbox"
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            !filter
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          Everything
        </Link>
        <Link
          href="/admin/inbox?status=drafted"
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            filter === "drafted"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          Drafted
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing waiting. Fetch some videos to fill this up.
          </p>
          <Link
            href="/admin/fetch"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Find videos
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {candidates.map((c) => {
            const flags = c.draft?.validation;
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/inbox/${c.id}`}
                  className="flex gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  {c.thumbnail_url ? (
                    // Thumbnails come from YouTube's CDN on several hosts, so a
                    // plain img avoids gatekeeping the inbox on next.config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="h-20 w-36 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-20 w-36 shrink-0 rounded-md bg-muted" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          c.status === "drafted"
                            ? "bg-proposed text-proposed-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {c.status === "drafted" ? "Drafted" : "Needs a draft"}
                      </span>
                      {c.media_type === "short" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Short
                        </span>
                      )}
                      {/* Worth knowing at a glance: only these are worth
                          opening YouTube for to copy a transcript. */}
                      {c.has_captions && (
                        <span
                          className="rounded-full bg-confirmed px-2 py-0.5 text-xs text-confirmed-foreground"
                          title="This video has captions, so a transcript can be copied from YouTube and pasted in."
                        >
                          Has captions
                        </span>
                      )}
                      {c.status === "failed" && (
                        <span className="rounded-full bg-debunked px-2 py-0.5 text-xs text-debunked-foreground">
                          Failed
                        </span>
                      )}
                      {flags && flags.errors.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-debunked px-2 py-0.5 text-xs text-debunked-foreground">
                          <AlertTriangle className="size-3" aria-hidden />
                          {flags.errors.length} blocking
                        </span>
                      )}
                      {flags && flags.errors.length === 0 && flags.warnings.length > 0 && (
                        <span className="rounded-full bg-unverified px-2 py-0.5 text-xs text-unverified-foreground">
                          {flags.warnings.length} to check
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 truncate text-sm">{c.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {c.channel} · {c.published_at.slice(0, 10)}
                      {c.duration_seconds
                        ? ` · ${secondsToClock(c.duration_seconds)}`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
