import { listModels } from "@/lib/bot/ollama";
import { FetchForm } from "./fetch-form";

export const dynamic = "force-dynamic";

export default async function FetchPage() {
  const hasKey = Boolean(process.env.YOUTUBE_API_KEY);
  await listModels();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-serif)] text-3xl">
        Find videos
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        Nothing here publishes anything. It collects candidates into the review
        inbox, and anything already seen is skipped automatically.
      </p>

      {!hasKey && (
        <p className="mt-6 rounded-xl border border-border bg-unverified/30 p-4 text-sm">
          YOUTUBE_API_KEY is not set, so fetching will not work yet. Add it to
          .env.local and restart the server. bot/README.md has the walkthrough.
        </p>
      )}

      <div className="mt-8">
        <FetchForm />
      </div>

      <div className="mt-10 rounded-xl border border-border bg-muted/40 p-5">
        <h2 className="font-[family-name:var(--font-serif)] text-lg">
          Which mode to use
        </h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed">
          <div>
            <dt className="text-foreground">A channel</dt>
            <dd className="text-muted-foreground">
              The cheapest by far, and what a big backfill should use. Walking a
              channel costs about one hundredth of what searching costs per
              video, so this can pull thousands without trouble.
            </dd>
          </div>
          <div>
            <dt className="text-foreground">A search</dt>
            <dd className="text-muted-foreground">
              Expensive. A day&apos;s allowance covers roughly five thousand
              videos this way, against a quarter of a million by channel. Use it
              to discover which channels are worth following, then switch to
              channel mode.
            </dd>
          </div>
          <div>
            <dt className="text-foreground">A single link</dt>
            <dd className="text-muted-foreground">
              Paste one video you already know about. Costs almost nothing.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
