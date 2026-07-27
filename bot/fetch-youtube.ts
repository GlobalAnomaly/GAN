/**
 * Fetch video candidates from YouTube and write them to a review file.
 *
 * This is the step that answers "where do ten thousand video URLs come from".
 * Every id here came back from the API, so every embed URL points at a video
 * that exists and carries the title, channel, date and description the account
 * will be written from.
 *
 * Usage:
 *   npm run bot:youtube -- --channel @SomeChannel --max 200
 *   npm run bot:youtube -- --query "UAP sighting" --since 2026-01-01
 *   npm run bot:youtube -- --channel UCxxxxxxxx --max 1000 --out candidates.json
 *
 * Requires YOUTUBE_API_KEY in .env.local (see bot/README.md).
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  QuotaTracker,
  listChannelUploads,
  resolveChannelId,
  searchVideos,
  type YouTubeVideo,
} from "@/lib/bot/youtube";
import { normalizeUrl } from "@/lib/bot/normalize-url";
import { SeenLog } from "@/lib/bot/seen-log";

interface Args {
  channel?: string;
  query?: string;
  since?: string;
  max: number;
  out: string;
  quota: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    max: 100,
    out: "bot/.cache/candidates.json",
    quota: 10_000,
  };

  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (!key || value === undefined) continue;

    switch (key) {
      case "channel":
        args.channel = value;
        break;
      case "query":
        args.query = value;
        break;
      case "since":
        // Accept a plain date and widen it to the timestamp the API wants.
        args.since = value.includes("T") ? value : `${value}T00:00:00Z`;
        break;
      case "max":
        args.max = Number(value);
        break;
      case "out":
        args.out = value;
        break;
      case "quota":
        args.quota = Number(value);
        break;
    }
  }

  return args;
}

/** What lands in the review file, one per candidate. */
interface Candidate {
  normalized_url: string;
  watch_url: string;
  embed_url: string;
  media_type: "youtube" | "short";
  title: string;
  description: string;
  channel: string;
  published_at: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  language: string | null;
}

function toCandidate(v: YouTubeVideo): Candidate {
  const n = normalizeUrl(v.watchUrl);
  return {
    normalized_url: n.key,
    watch_url: v.watchUrl,
    embed_url: v.embedUrl,
    media_type: v.isShort ? "short" : "youtube",
    title: v.title,
    description: v.description,
    channel: v.channelTitle,
    published_at: v.publishedAt,
    thumbnail_url: v.thumbnailUrl,
    duration_seconds: v.durationSeconds,
    language: v.defaultLanguage,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "YOUTUBE_API_KEY is not set.\n" +
        "Get a free key from console.cloud.google.com (enable YouTube Data API v3)\n" +
        "and put it in .env.local as YOUTUBE_API_KEY=...\n" +
        "See bot/README.md for the walkthrough.",
    );
    process.exit(1);
  }

  if (!args.channel && !args.query) {
    console.error("Pass either --channel <@handle|UC...> or --query <text>.");
    process.exit(1);
  }

  const quota = new QuotaTracker(args.quota);
  const seen = await SeenLog.open(resolve("bot/.cache/ingestion-log.json"));

  console.log(`Ingestion memory holds ${seen.size} URLs already seen.\n`);

  let videos: YouTubeVideo[] = [];

  if (args.channel) {
    const channel = await resolveChannelId(args.channel, { apiKey, quota });
    if (!channel) {
      console.error(`Could not resolve channel: ${args.channel}`);
      process.exit(1);
    }
    console.log(`Walking uploads for ${channel.title} (${channel.channelId})`);
    videos = await listChannelUploads(channel.channelId, {
      apiKey,
      quota,
      since: args.since,
      max: args.max,
    });
  } else if (args.query) {
    console.log(`Searching for: ${args.query}`);
    videos = await searchVideos(args.query, {
      apiKey,
      quota,
      publishedAfter: args.since,
      maxResults: args.max,
    });
  }

  // An uploader who disabled embedding has said no. Respect it rather than
  // attaching a player that will show "video unavailable" on the case page.
  const embeddable = videos.filter((v) => v.embeddable);
  const blocked = videos.length - embeddable.length;

  const fresh: Candidate[] = [];
  let skipped = 0;

  for (const v of embeddable) {
    const candidate = toCandidate(v);
    if (seen.has(candidate.normalized_url)) {
      skipped += 1;
      continue;
    }
    seen.add({
      normalized_url: candidate.normalized_url,
      source: args.channel ?? `search:${args.query}`,
      first_seen: new Date().toISOString(),
      outcome: "pending",
    });
    fresh.push(candidate);
  }

  await seen.save();

  const outPath = resolve(args.out);
  await writeFile(outPath, JSON.stringify(fresh, null, 2), "utf8");

  console.log(`
Fetched          ${videos.length}
Not embeddable   ${blocked}
Already seen     ${skipped}
New candidates   ${fresh.length}

Quota used       ${quota.used} of ${quota.limit}
Written to       ${outPath}
`);

  if (fresh.length > 0) {
    console.log("First few:");
    for (const c of fresh.slice(0, 5)) {
      console.log(`  ${c.published_at.slice(0, 10)}  ${c.title.slice(0, 70)}`);
      console.log(`    ${c.watch_url}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
