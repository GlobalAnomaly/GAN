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

## Writing accounts with a local model

The drafting runs on your own GPU through Ollama, so a backfill of thousands of
cases costs nothing per case.

### Setup

1. Install Ollama from ollama.com.
2. Start it and pull a model:

   ```bash
   ollama serve
   ollama pull llama3.1:8b
   ```

`llama3.1:8b` fits comfortably in 16GB of VRAM with headroom. Override the
default with `OLLAMA_MODEL` in `.env.local`, or `--model` on the command line.

### Running it

```bash
# From a text file (transcript, article text, PDF text)
npm run bot:write -- --file source.txt

# From a video fetched earlier, by its index in candidates.json
npm run bot:write -- --candidate 0

# With the French, Portuguese and Spanish versions too
npm run bot:write -- --candidate 0 --translate
```

In PowerShell the `--` separator gets swallowed, so call node directly there:

```bash
node --experimental-strip-types bot/write-account.ts --file source.txt
```

### Why it runs in stages

An 8B model holds together much better doing one thing at a time than juggling
everything in a single prompt. So: draft the English account, check it, classify
it against the rubric, check it again now the label can be tested against the
account, then translate. Each stage gets the original source text again, so
nothing is inferred from a summary of a summary.

### The validator

This is the part that makes a local model usable at volume. Reading ten thousand
drafts by eye to catch a stray em dash is not realistic, so every rule that can
be checked mechanically is:

**Errors** (the draft is blocked, it does not reach the review inbox):
- em or en dashes anywhere
- any of the four body sections empty, especially "what remains unknown"
- hype words or an exclamation mark in the headline, or a shouted headline
- classified `acknowledged` while the status section names no official body
- a translation that dropped a section the English has

**Warnings** (a human looks at that specific line):
- stock AI phrasing ("testament to", "delve", "genuinely")
- a number in the account that does not appear in the source
- a proper noun in the account that does not appear in the source
- no attribution verb anywhere in the testimony section
- a translation less than half the length of its English original
- `debunked` without a conclusive cause in the status section

The last two grounding checks are heuristics and are meant to over-flag. A false
positive costs a glance; an invented altitude that reaches publication costs the
credibility the whole site is built on. Agency acronyms (NASA, USAF, GEIPAN,
AARO) are deliberately exempt from the shouting rule, because this domain is full
of them.

Run `npm run bot:test` to see the rules exercised.

## What each piece does

| File | Job |
|---|---|
| `lib/youtube.ts` | YouTube Data API client, with quota accounting |
| `lib/normalize-url.ts` | Reduces every link shape to one canonical key |
| `lib/seen-log.ts` | The ingestion memory, so nothing is reviewed twice |
| `lib/ollama.ts` | Local model client |
| `lib/prompts.ts` | The staged prompts, with the editorial rules repeated at each stage |
| `lib/validate-account.ts` | House-style and grounding checks |
| `fetch-youtube.ts` | CLI: fetch candidates, skip what is known, write a review file |
| `write-account.ts` | CLI: draft, validate, classify, translate |
| `import-seed.ts` | Push the hand-entered seed content into Supabase |

## Why URLs get normalized

The same clip arrives as `youtube.com/watch?v=X`, `youtu.be/X`,
`youtube.com/shorts/X`, and any of those with tracking parameters bolted on.
Without normalization each one looks new and you review the same footage five
times. `normalize-url.ts` reduces all of them to `youtube:X`, and there is a
test proving it.

## What is not built yet

- **Transcription.** Right now a video's source material is its title and
  uploader description, which is thin. Whisper on the audio would give the
  model far more to work from, and would make the non-English material usable.
- **The review inbox.** Drafts land in `bot/.cache/drafts.json`. They need a
  screen where the source and the draft sit side by side and one click
  approves. Until then, approval means editing the file by hand.
- **Writing drafts into Supabase.** `seen-log.ts` becomes the `ingestion_log`
  table and drafts become review-inbox rows.
- **The other sources.** AARO, the National Archives, GEIPAN and NUFORC each
  need their own fetcher. YouTube came first because it is the one with a
  friendly API and the one that supplies embeds.
- **Deduplication beyond exact links.** The ingestion log catches the same URL.
  The same event reposted or refilmed needs fuzzy matching on date, location
  and description.
- **Source discovery.** Noticing that an unapproved outlet keeps getting cited
  and proposing it for your approval. Phase 3 or later, per the blueprint.

## What the bot must never do

- Publish anything. A human approves every entry, always.
- Attach a video whose uploader disabled embedding. The fetcher already filters
  these out.
- Invent a detail that is not in the source material. Missing details go in
  "what remains unknown", which is why that is its own database column.
- Crawl the open web deciding what is credible. It proposes new sources into the
  review inbox and you approve them.
