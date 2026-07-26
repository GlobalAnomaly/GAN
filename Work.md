# Work log

**Session 1 ended: 26 July 2026, 08:47 (UTC+02:00)**

Read this first in a new session to get up to speed. Everything below is
committed and pushed to `github.com/GlobalAnomaly/GAN` on `main` (24 commits,
working tree clean).

---

## The site is live

**https://globalanomaly.info** — deployed on Vercel, reading from Supabase,
indexed, mobile-verified.

| Thing | State |
|---|---|
| Domain | globalanomaly.info, NameSilo, Vercel nameservers |
| Hosting | Vercel free tier, auto-deploys on push to `main` |
| Database | Supabase project `azcwmwgoxtmmcpadpkxp`, schema + migration 001 applied |
| Content | 9 cases, 4 science entries, all published |
| Admin | `localhost:3000/admin`, password-gated, local only |
| Ollama | Running locally, `llama3.1:8b` default, `gemma4:12b` also installed |
| YouTube API | Key set and verified working |

---

## What was built

### The site (Phase 1, complete)

Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · Supabase · npm (not pnpm:
the pnpm store is on `C:` and this repo is on `D:`, and pnpm's hardlinks do not
cross drives).

- **Design identity** from `docs/design-direction.md`: Source Serif 4 headings,
  Inter body, "editorial paper" light theme, "night sky" dark theme, semantic
  classification badge colours defined once in `globals.css`.
- **Pages**: home (hero, search, strips, acknowledged spotlight, continent
  tiles, counter), cases index with filters, case page, science index and entry,
  browse, search, about/standards, privacy, terms, takedown, submit, 404.
- **SEO**: canonical URLs, Open Graph, sitemap (21 URLs), robots.txt, search
  pages excluded from indexing.
- **Hero + backdrop**: your artwork, home page only. Case pages stay plain
  because that is where people read 600 words.
- **Support**: Buy Me a Coffee in footer plus a small nav link.
- **Ads**: AdSense slots built and **switched off**. See the warning below.

### The bot

Runs on your PC, not the server. Writes into Supabase; the live site only
displays.

- **`src/lib/bot/youtube.ts`** — YouTube Data API client with quota accounting.
- **`src/lib/bot/normalize-url.ts`** — reduces every link shape to one key so
  the same clip is never reviewed twice. Tested.
- **`src/lib/bot/ollama.ts`** — local model client, JSON schema constrained.
- **`src/lib/bot/prompts.ts`** — staged prompts (draft → classify → translate).
- **`src/lib/bot/validate-account.ts`** — the house-style and grounding
  validator. Tested.
- **`src/lib/bot/known-events.ts`** — 32 well-documented events with verified
  dates and authorities. Tested.
- **`src/lib/bot/runner.ts`** — the overnight run.
- **`src/lib/admin/store.ts`** — review inbox, JSON file at `.data/`.

**38 tests pass:** `npm run bot:test`

### The admin panel

`localhost:3000/admin` — everything is buttons, no terminal needed.

- **Dashboard** reports what is and is not configured, with the exact fix.
- **Run overnight** (`/admin/run`) — paste channels, press start, go to bed.
- **Find videos** (`/admin/fetch`) — channel, search, or a single link.
- **Review inbox** (`/admin/inbox`) — source video beside the draft, edit,
  approve or dismiss. "Write it again" regenerates.

---

## Decisions that matter, and why

Do not undo these without knowing the reason.

**Channel uploads, not search.** A free YouTube key gets 10,000 units a day.
`search.list` costs 100 units per 50 videos; `playlistItems.list` costs 1. So
walking a channel is ~50x cheaper per video. A 10,000-case backfill by channel
costs about 400 units, or 4% of one day. Search is for *discovering* which
channels to walk.

**The validator, not eyeballs.** Reading thousands of drafts to catch a stray em
dash is not realistic. Blocking errors: em dashes, empty body sections, hype or
shouted headlines, `acknowledged` with no official body named. Warnings: stock
AI phrasing, missing attribution, any number or proper noun present in the
account but absent from the source. That last one is the important one: it is
the shape an invented altitude or witness count takes. It over-flags on purpose.

**A vetted reference, not the model's memory.** A Roswell documentary that never
says "1947" was producing "the date is unknown". The fix is not to let the model
recall dates from its weights, which is the same mechanism as inventing an
altitude. It looks the event up in `known-events.ts` and the facts arrive as
*sourced material* with the authority attached.

**Merge, do not duplicate.** A second Rendlesham video attaches to the existing
case as another angle rather than creating a rival entry.

**Translations load on demand and get no URL.** The blueprint warns thin
unreviewed machine pages get penalised. English stays canonical and prerendered.

**Ads are off, and the privacy page reads the same flag.** It says "we do not
run ads", which is true now and false the instant the script loads. Tying the
wording to the switch means they cannot drift apart.

**No kitsch rule was consciously relaxed**, not forgotten. Your reasoning: the
imagery represents what witnesses described, and looking like a bare repository
has its own cost. Agreed. Reading pages still stay plain.

---

## Bugs found and fixed (so they are not re-introduced)

1. **`rowsOf` returned `rowsOf(data)`** — a bulk find-and-replace rewrote the
   function body along with its call sites. Every Supabase query failed, the
   fallback served seed data, and since seed and database held the same 9 cases
   the site looked *fine*. The safety net hid it. The fallback now logs a stack.
2. **`NEXT_PUBLIC_SITE_URL=globalanomalynetwork.vercel.app`** — a bare domain is
   not a valid URL, and that value reaches `new URL()` at module load, so it
   killed the whole Vercel build. Now normalised and never throws. Test pins it.
3. **Supabase configured but schema not run** — the dispatcher switched to the
   database and hard-crashed every page. Now falls back to seed with a loud log.
4. **Route handler prerendered at build time** — captured an empty database and
   served that forever, so adding a translation changed nothing and raised no
   error. Now `force-dynamic`.
5. **Gallery had its own media rendering** — a self-hosted video quietly went
   into an iframe. One component draws media now.
6. **Split DNS delegation** — Vercel's nameservers were *added* alongside
   NameSilo's, so resolvers disagreed and half of visitors got nothing.
7. **`USAF` flagged as shouting** — the all-caps rule fired on agency acronyms,
   which this domain is full of. Now measured across the whole headline.
8. **Supabase batch inserts** normalise keys across rows and send explicit
   `null` for any a row is missing, defeating column defaults. Every row in a
   batch needs the same keys.

---

## Things deliberately not done

**Automated YouTube transcripts.** Tested properly and abandoned. The caption
endpoint returns HTTP 200 with a zero-byte body without a proof-of-origin token
(0 of 9 videos). A real browser via Playwright hit three further walls: French
UI from IP geolocation, the transcript button hidden inside the collapsed
description, and a consent dialog unreachable by ordinary selectors. Also
decisive: **only 9 of 25 UFO videos have captions at all**, so a perfect scraper
would improve barely a third of material. The manual paste box in the drafting
form works and stays. The `has_captions` badge in the inbox shows which videos
are worth opening YouTube for.

**Whisper.** Deprioritised on your correction: official UAP footage is silent
sensor video, so there is nothing to transcribe. For official material the text
is in the case-resolution PDFs, so **PDF text extraction** is the high-value
input. Whisper only matters for spoken-word sources.

**A consent banner.** AdSense requires a certified consent platform for EU and
UK traffic before personalised ads. One whose wording nobody has chosen is worse
than none. Needs a real decision, and the blueprint starred it for a lawyer.

---

## Next session starts here

### 1. Relevance scoring and exclusions — the blocker

You were right to insist on this before fetching: a run that queues 500
irrelevant items is worse than one that queues 50 good ones. AARO publishes a
lot that does not deserve a case.

Score candidates on signals that actually indicate a case worth writing: named
witnesses, instrument or radar data, official acknowledgment, resolution status,
document backing. Plus exclusion rules you control from the admin panel.

### 2. The AARO fetcher

Already investigated, and it is a better source than expected:

- `/UAP-Cases/Official-UAP-Imagery/` has **64 official DoD videos**, direct
  `.mp4` URLs on a government CDN, **each with a poster frame**
- Organised by release month: `2512` = Dec 2025, `2601` = Jan 2026
- Named case-resolution PDFs at
  `/Portals/136/PDFs/case_resolution_reports/`
- Other sections: `/UAP-Case-Resolution-Reports/`, `/UAP-Records/`,
  `/Congressional-Press-Products/`, `/EFOIA-Reading-Room/`

Being **US federal public domain** means we can host the files rather than embed
(no dead-embed risk), the poster frames give the visuals, and there is no terms
or scraping question at all.

Verified working URL shapes:
```
video   https://d34w7g4gy10iej.cloudfront.net/video/2512/DOD_111426410/DOD_111426410.mp4
poster  https://d1ldvf68ux039x.cloudfront.net/thumbs/frames/video/2512/989430/DOD_111426410.0000001/604x340_q95.jpg
pdf     https://www.aaro.mil/Portals/136/PDFs/case_resolution_reports/Mt-Etna-Object.pdf
```

### 3. PDF text extraction

Replaces Whisper as the way to give the model real material for official cases.

### 4. Case updates and front-page spotlight

`case_updates` table exists (migration 001). Needs the UI: append a dated update
rather than rewriting an account, and let a major one lead the home page. This is
the "military finally acknowledges Roswell" scenario.

### 5. Content, then AdSense

Apply for AdSense **after** the archive is full. With 9 cases you would likely
be rejected, and reapplying after rejection is slower than applying once with a
hundred entries.

---

## Running it

```bash
npm run dev              # site + admin on :3000
npm run build            # production build, also typechecks
npm run lint             # eslint
npm run bot:test         # 38 tests
npm run bot:youtube      # CLI fetch (the admin panel is easier)
npm run bot:import-seed  # push seed content into Supabase
```

PowerShell eats the `--` separator npm uses for arguments, so call `node`/`tsx`
directly there. npm also swallows `--dry-run` as its own flag, which is why the
importer uses `--dry`.

`.env.local` holds the admin password, both Supabase keys, the YouTube key and
the Ollama model. It is gitignored. `.env.example` documents the variables.

**Change `ADMIN_PASSWORD`** — it is still the placeholder I set.

---

## Reference

- `docs/` — the five planning documents, the source of truth
- `AGENTS.md` — the editorial rules that never loosen, and conventions
- `README.md` — setup, and what is deliberately unfinished
- `bot/README.md` — quota maths, validator rules, model guidance
- `supabase/schema.sql` — full schema with row-level security
- `supabase/migrations/001-modular-media.sql` — applied
