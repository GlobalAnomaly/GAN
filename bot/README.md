# The bot

Runs on your PC, not the web server. It finds material, writes accounts with a
local model, and writes finished rows into Supabase. The live site only displays
what it is given, which is why the site stays free.

## Getting a YouTube API key

Free, takes about five minutes, no credit card.

1. Go to console.cloud.google.com and create a project.
2. In **APIs and services → Library**, search for **YouTube Data API v3** and
   enable it.
3. In **APIs and services → Credentials**, click **Create credentials → API key**.
4. Put it in `.env.local` at the repo root:

   ```
   YOUTUBE_API_KEY=AIza...
   ```

`.env.local` is already gitignored, so the key never reaches the repo.

## Running it

```bash
# Walk a channel's entire upload history
npm run bot:youtube -- --channel @SomeChannel --max 500

# Only what is new since a date (watch mode)
npm run bot:youtube -- --channel @SomeChannel --since 2026-06-01

# Search, for finding channels worth walking
npm run bot:youtube -- --query "UAP footage" --max 50
```

Results land in `bot/.cache/candidates.json`. Every URL the bot has ever seen is
recorded in `bot/.cache/ingestion-log.json`, so a second run returns only what is
genuinely new.

```bash
npm run bot:test   # verifies the dedup logic
```

## Quota: read this before planning a backfill

A free API key gets **10,000 units a day**. The costs are wildly uneven, and
this single fact shapes the whole ingestion strategy:

| Call | Cost | Videos returned | Cost per video |
|---|---|---|---|
| `search.list` | 100 units | 50 | **2 units** |
| `playlistItems.list` | 1 unit | 50 | **0.02 units** |
| `videos.list` | 1 unit | 50 | 0.02 units |

Search is **100 times more expensive per video** than walking a channel's
uploads playlist.

- Backfilling by search: about **5,000 videos a day**, and you burn the whole
  quota doing it.
- Backfilling by channel uploads: about **250,000 videos a day**, and you will
  never come close to the ceiling.

So the strategy is: **use search rarely, to discover which channels are worth
following. Then walk those channels' uploads.** Ten thousand videos across
twenty channels costs roughly 400 units, which is 4% of one day's quota.

If you do hit the limit, the run stops with a clear message and the ingestion
log keeps its place, so tomorrow's run picks up where it left off rather than
starting over.

## What each piece does

| File | Job |
|---|---|
| `lib/youtube.ts` | YouTube Data API client, with quota accounting |
| `lib/normalize-url.ts` | Reduces every link shape to one canonical key |
| `lib/seen-log.ts` | The ingestion memory, so nothing is reviewed twice |
| `fetch-youtube.ts` | CLI: fetch candidates, skip what is known, write a review file |

## Why URLs get normalized

The same clip arrives as `youtube.com/watch?v=X`, `youtu.be/X`,
`youtube.com/shorts/X`, and any of those with tracking parameters bolted on.
Without normalization each one looks new and you review the same footage five
times. `normalize-url.ts` reduces all of them to `youtube:X`, and there is a
test proving it.

## What is not built yet

- **Transcription and translation.** Non-English material needs a pass before
  synthesis.
- **The Ollama writing step.** Draft the English account first, then the three
  translations, in stages rather than one prompt.
- **Classification.** Suggest a label with a reason, against the rubric.
- **Supabase writes.** `seen-log.ts` becomes the `ingestion_log` table and
  candidates become review-inbox rows.
- **The other sources.** AARO, the National Archives, GEIPAN and NUFORC each
  need their own fetcher. YouTube came first because it is the one with a
  friendly API and the one that supplies embeds.

## What the bot must never do

- Publish anything. A human approves every entry, always.
- Attach a video whose uploader disabled embedding. The fetcher already filters
  these out.
- Invent a detail that is not in the source material. Missing details go in
  "what remains unknown", which is why that is its own database column.
- Crawl the open web deciding what is credible. It proposes new sources into the
  review inbox and you approve them.
