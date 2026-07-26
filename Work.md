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

## Session 2 planning (26 July 2026)

The roadmap in "Next session starts here" below is still valid but no longer
first. What follows supersedes its ordering.

### Reported broken

**No way to change language, anywhere.** Two separate gaps, and one is the wrong
way round from the blueprint.

- *Case prose*: the switcher exists (`case-account.tsx:185`) but is gated on
  `available.length > 1`. The only code path that writes `case_translations` is
  publishing through the bot inbox (`admin/actions.ts:562`). All 9 live cases came
  from the seed importer, so there are zero translation rows and the switcher
  renders on no page at all. Nothing is broken. There is no data.
- *The site itself*: no i18n layer exists. No dictionary, no locale, no cookie.
  Nav, filters, badge labels, headings and static pages are hardcoded English.
  `master-blueprint.md:252` says "Interface first, content second". The
  expensive half was built and the cheap half skipped.

**"Support" in the top bar reads as a help desk.** Also worth knowing: its label
is hidden below `lg` and the whole link below `sm`, so on a phone it is absent
and on a tablet it is a bare coffee cup.

### Competitor analysis

The field is much more crowded than the two sites named, and on raw record count
it is already lost. That is fine, because nobody is competing where we are.

| Site | Scale | Has | Lacks |
|---|---|---|---|
| [NUFORC](https://nuforc.org/databank/) | Largest independent set, 25 years | The reference databank, map, images | Raw witness text, no synthesis. Blocks bots (403) |
| [UFOSINT Explorer](https://ufosint.com/) | **618,316 deduped** from 6 DBs | Polygon-draw map, 1947–2026 timeline with playback, 0–100 quality score, 126k duplicate pairs flagged, Gemini enrichment, MCP endpoint, free | **Narrative text stripped from the export.** No editorial articles at all |
| [Enigma Labs](https://enigmalabs.io/) | 57k sightings, 573k users, venture-backed | App + web, map, curated collections, some articles | Monolingual, community-feed shaped, not an archive |
| [Black Vault](https://www.theblackvault.com/documentarchive/) | ~4M FOIA pages since 1996 | Deep documents, good explainer articles, global map, Stanton Friedman collection | UFO is ~1 of 8 categories. US-only records. Tone is investigative advocacy ("government secrets", interpretive artwork). No bylines |
| [MUFON](https://mufon.com/) | 138k reports | Reporting network, chapters, symposium | Archive **gated behind membership**. Dated. Reads as a membership funnel |
| [UAP Public Archive](https://uap-archives.org/) | US gov records | **Multilingual**, auto-redirects by browser language | Mirror and index, not written accounts |
| [UFOFiles.app](https://ufofiles.app/) | Case files | Search by case, location, timeline, **credibility** | Closest conceptual overlap. Worth watching |

**The gap, stated precisely.** Every large competitor is either a data table or
an advocacy blog. UFOSINT literally strips the narrative. NUFORC serves raw
witness text. MUFON hides it. Black Vault frames it as revelation. Not one of
them offers a readable, neutrally written, fully attributed account per case, and
not one of the big ones is multilingual. That is the whole product.

**Where not to compete:** record count. 618k aggregated rows is unbeatable and
also not worth beating, because those rows are unreadable. 200 well-written cases
beat 600,000 rows for a human reader and for search.

**Non-US coverage is genuinely open.** All three big US databases are US-centric.
GEIPAN has published French case files since 1977, and the Brazilian Air Force
declassified roughly 4,500 documents covering 1952–2016 in five tranches. That
material pairs exactly with the Portuguese and Spanish translations, and nobody
in English is working it properly.

### Decisions taken this session

**Legal pages are written last**, once the feature set is settled, so they
describe what exists rather than what was planned. Confirmed.

**Cookie consent with accept and refuse**, not a notice-only bar. The current
site sets only a theme preference, and a locale cookie is equally functional, so
neither legally requires a banner today. The banner becomes mandatory the moment
analytics or AdSense land, and AdSense needs a Google-certified CMP for EEA and
UK traffic. So the consent layer is built as the **gate that ads and analytics
cannot load without**, wired to the same flag pattern the privacy page already
reads. This closes the "needs a real decision" item from session 1.

**Never gate cases behind membership.** The MUFON criticism is the lesson: gating
the archive is what makes a site feel like a money grab, and it also destroys the
SEO that a free archive earns. Membership sells what costs us money or takes
nothing from the free reader: ad-free reading, alerts, saved searches and
collections, bulk data export, early access. The archive itself stays open.

**A third content type: articles.** Topic pieces that are not cases (the role of
hypnotic regression in abduction claims, how radar corroboration actually works,
what AARO does and does not do). These answer evergreen queries no database row
can, and they give cases somewhere to link. Same editorial rules, same "what
remains unknown" honesty. Note this changes the blueprint's "two sibling
sections" into three.

**Witness submissions stay scoped.** Worth having, but MUFON, NUFORC and Enigma
have 25 years and 573k users of network effect. A new form attracts spam and
hoaxes, and moderating it is the expensive part. Submissions enter the same
review gate as bot candidates. We do not compete on volume.

### The map, and why it is not built on UFOSINT's data

Investigated properly. **We cannot host UFOSINT's 618k records.** Not risky:
contrary to stated terms for half of it and unlicensed for the rest.

- **NUFORC (159,320)** — [ToS](https://nuforc.org/terms/) forbids scraping *and*
  distributing, and prohibits reproducing or exploiting for **any commercial
  purpose**. Ads and memberships make us commercial.
- **MUFON (138,310)** — this is the data MUFON sells memberships to access.
- **UFOSINT grants nothing.** Repo README: "redistribution of the raw source
  datasets is subject to each source's individual terms." Code licence is "to be
  finalized — likely MIT" and covers code, not data. No licence file, no terms
  page. Absence of a licence is not permission.
- **The decisive signal:** they had all 618k records and stripped every narrative
  from the public export *for copyright reasons*. If they believed they could
  redistribute that text they would not have deleted it.

**Taking only the facts and writing our own prose does not rescue this source**,
though the method itself is sound and is now our standing rule for every ingest.
Facts are not copyrightable (*Feist v. Rural Telephone*, 1991, which rejected
sweat-of-the-brow outright), so harvesting dates, places and coordinates and
writing our own account is legitimate. The problem is that **the wanted fields
are not in the export.** Actual schema of `ufo_public.db`:

| Wanted | Present? |
|---|---|
| Where and when | ✅ `lat`, `lng` (418,001 of 618,316 geocoded), `datetime` (608,073) |
| The details | ❌ No shape, duration or witness count. Only `quality_score` + 16 emotion columns |
| What was claimed | ❌ `description`, `summary`, `notes`, `raw_json` stripped. `has_description` is a **boolean** |
| Media available somewhere | ❌ `attachment` table **dropped**. `has_media` is a boolean, so we would know media exists and never where |
| Documents | ❌ `sighting_reference` and `reference` tables both dropped. No source links |

It is 418k dots with a timestamp and a sentiment score. Writing our own account
of a report means reading the report, and reading it means going back to NUFORC or
MUFON directly, which is the forbidden step. They kept the flag saying a
description exists and deleted the description.

**Two things survive Feist and matter for the sources we do use.**

1. **NUFORC's terms are a contract claim, not copyright.** Uncopyrightable facts
   do not help, because the exposure is breach of stated terms. But their terms
   forbid *taking* and nothing forbids *asking*: their CTO reportedly provides
   data on request. **Action: send that email.** One message, and a free, neutral,
   multilingual, unpaywalled archive that credits them is a plausible yes. It is
   the only legitimate route to those 159,320 reports.
2. **EU database right.** Separate from copyright, 15-year term, protects
   extraction of a substantial part of a database even where contents are not
   protectable. Bites on GEIPAN and any EU source, which is why that licence check
   is not optional.

**Add [Wikidata](https://www.wikidata.org/) (CC0)** to the source table: outright
public-domain dedication, holds dates and coordinates for most notable incidents.
No permission, no share-alike drag.

**One honest use for UFOSINT's export:** as a local research aid, never
published. 418k geocoded dots with quality scores show where the clusters are and
which reports score high, so our own digging points at the right places. Using it
to decide what to research is not redistribution. Shipping it is.

**Build the map on public-domain government data instead.** More on-brand: it
becomes the world's official record of *investigated* cases, not a copy of
someone else's blend of six civilian databases.

| Source | Records | Status |
|---|---|---|
| [Project Blue Book](https://www.archives.gov/research/military/air-force/ufos) | **12,618 cases, 701 unidentified** | USAF records at NARA, declassified, US federal public domain |
| [GEIPAN](https://www.cnes-geipan.fr/fr/recherche/cas) | **3,368 cases** | Downloadable Excel of cases *and* testimonies, coordinates, own A/B/C/D classification |
| AARO | 64 videos + resolution PDFs | Already scoped, session 1 |
| [NARA UAP bulk downloads](https://www.archives.gov/research/catalog/catalog-bulk-downloads/uap-bulk-download) | Growing | Public domain |
| Brazilian FAB | ~4,500 docs, 1952–2016 | Government works. Pairs with Portuguese, and Varginha |

Two known costs: Blue Book is scanned microfilm, so structured extraction and
geocoding is real work (city + state against the public-domain US Census
gazetteer). And **verify GEIPAN's licence on their mentions légales before
ingesting**: French public data defaults to Licence Ouverte 2.0 under Decree
2017-638, which permits commercial reuse with attribution, and publishing bulk
Excel is consistent with that, but do not assume it.

**Two rules the map must follow.**

1. **Pins get no URLs.** 16,000 thin auto-generated pages is exactly what the
   blueprint warned about for translations, for the same reason. Pins live on the
   map and in a side panel. Only written cases get a URL and a sitemap entry.
2. **A pin is not a case.** An imported row is attributed to the database holding
   it and labelled as not reviewed by us. This is better than competitors, not
   worse: "reported to Project Blue Book, closed as unidentified, not
   independently reviewed" says more than an unlabelled dot.

**Three axes, not one tier list.** The proposed tiers (has info / no info / video
but no debunk) collapse two different things into one and would corrupt the
existing classification: if "no info" becomes `unverified`, then `unverified`
means both "we checked and found no official validation" and "we never looked",
which are different claims to a reader. Instead:

- **`record_type`** — `case` (written, has a URL) or `report` (imported, map
  only). The new field.
- **`classification`** — unchanged, only ever set on a written case. Never
  guessed for an imported row.
- **`source_disposition`** — the source's *own* verdict kept as theirs: Blue
  Book's "unidentified"/"balloon"/"aircraft", GEIPAN's A/B/C/D. Never translated
  into our classification. Makes the 701 Blue Book unidentifieds filterable as a
  set on day one.

The "maybe" tier needs no field: it *is* `unverified` + has video, which the
derived media markers in step 4 already provide. The map styles that combination.

**Side effect worth keeping:** an unidentified Blue Book pin with no case
attached is a work-queue item. The map becomes the backlog, feeding the relevance
scoring at the top of the session-1 list.

### The cross-reference engine (the actual product)

Not a bigger database. The one that knows when two records are the same event.

**The dedup output is itself a feature.** When a 1980 event appears in NUFORC, in
the UK MoD files and in an Essex police log, that convergence is corroboration,
and displaying it is something no competitor does. UFOSINT flags 126,729
duplicate pairs and shows none of them; MUFON only has itself. "Independently
reported to three separate archives, one of them official" is the line that makes
us better rather than bigger.

**Schema.** `cases` stays central for articles. Pins need their own tables:

```
sources_registry   NUFORC, GEIPAN, Blue Book, Essex Police, Le Parisien...
  id, name, licence, attribution_required, may_publish_narrative (bool)

reports            what one source says about one event
  id, source_id, source_ref, cluster_id, case_id (nullable),
  occurred_at, date_precision, lat, lng, location_raw,
  shape, duration, observers, source_disposition,
  narrative (ingested, never served)

report_links       candidate matches awaiting review
  a_id, b_id, score, signals jsonb, state (suggested/confirmed/rejected)
```

- **`cluster_id` means the map shows events, not records.** Without it one
  sighting appears five times as five pins.
- **`may_publish_narrative` puts the licence in the data**, so publishing code
  physically cannot serve narrative from a source that does not permit it. Same
  pattern as the ads flag driving the privacy page wording. New sources added
  later get the safe default.

**Matching.** Signals strongest first: date proximity + coordinate distance (the
primary block), fuzzy location string, shape/duration/observer agreement as weak
corroboration, narrative similarity computed locally, and `known-events.ts` as the
anchor set. **Block by `(year, geohash prefix)` before any comparison**, or 350k+
records is O(n²) and never finishes.

**Thresholds are asymmetric on purpose.** A missed link costs a corroboration. A
wrong link puts the wrong video under a sourced account, the exact failure
`AGENTS.md` anticipates when it ships every seed case with an empty embed URL
rather than a guessed one.

| Action | Confidence needed |
|---|---|
| Attach media or a document to a case | Very high, or human confirmation |
| Merge two reports into one cluster | High |
| Suggest "possibly the same event" in the inbox | Medium |

**Never auto-merge on medium.** An auto-merge of two genuinely different events at
the same place and date destroys both silently and nobody ever discovers it.

**Enrichment flow:** a report arrives carrying a video, the matcher clusters it
with an existing case, the video enters the review inbox as *a proposed addition
to that case* rather than as a new candidate. This is session 1's "merge, do not
duplicate" generalised from YouTube to every source.

### UFOCAT 2023 (acquired, in `UFO Data/`)

Read with `access-parser`, a pure-Python reader, in a scratchpad venv. **This
machine has no ACE or Jet OLEDB provider**, so the normal Access route is closed
and that venv is how the `.accdb` gets opened. Nothing installed system-wide.

The `.accdb` is the one to use: it carries `Hynek`, `GENDER` and `Images` tables
that **the Excel export does not include**.

**Shape.** 320,412 records, 55 columns, **238,499 distinct cases** (`PRN`).

| Field | Coverage | Why it matters |
|---|---|---|
| `LATITUDE`/`LONGITUDE` | **91.7%** (293,896) | Map-ready. UFOSINT managed 67.7% |
| `YEAR` / `MO` / `DAY` / `TIME` | 100 / 98.1 / 93.0 / 82.9% | Best date coverage of anything we have |
| `SOURCE` + `AUTHOR` + `PAGEVOL` | 100 / 99.8 / 93.6% | **A citation to the original publication on every record** |
| `HYNEK` / `VALLEE` / `SVP` | 88.9 / 77.2 / 16.1% | Established classifications, kept as theirs |
| `EXPL` / `EXPLAN` | 30.8 / 6.6% | Maps to `source_disposition` |
| `NOTES` | 68.7% | CUFOS's own summaries. Local only, never served |

Year range runs from antiquity (` 034`) to 2023. `SOURCES` holds 818 sources with
full bibliographic detail (author, title, publisher, year, ISBN, LCC). `Images`
holds 298 images keyed by `URN`.

**Top source is `UFOReportCtr` at 123,304 records**, so UFOCAT already contains a
large slice of NUFORC. The two sets in `UFO Data/` overlap heavily and must be
reconciled, not concatenated.

**The find: `PRN` is a hand-built cross-reference set.** The codebook defines it
as "primary record ID number (indicates first record for that case)", and entries
sharing one "all refer to the same event, but are based on different sources".

- 36,424 cases carry more than one record
- 118,337 records sit inside those cases
- Largest group is 70: Socorro 1964, cited by Hynek, Hall, Lorenzen, the Condon
  report, Olsen and 65 others
- Second largest is 56: Mantell 1948, where the sources disagree on the location
  itself (`FORT KNOX`, `FRANKFORT`, `FRANKLIN SW`, `F-51`)

That last detail is the point. **This is labelled ground truth for the matcher.**
We can run our blocking and scoring against 36,424 expert-resolved clusters and
measure precision and recall before pointing the thing at anything else. It turns
the cross-reference engine from something we hope works into something measured.

**Terms, and they bite.** Copyright © 2023 Donald A. Johnson, Ph.D. / J. Allen
Hynek Center for UFO Studies, published by Sun River Research Institute. The
codebook is explicit:

> Permission to reproduce or publish material extracted from UFOCAT 2023 must be
> obtained in writing from the author or publisher.

So: **using it is fine and is what they sell it for. Publishing extracted material
needs written permission.** No LEVEL code changes that.

The separate confidentiality restriction turns out to be nearly moot. `LEVEL`
encodes the contributor's availability choice, and only **94 records (0.03%)** are
restricted: LEVEL 1 (83 records, whole case confidential, "may be reported only as
a tally"), LEVEL 0 (9, undetermined), LEVEL 2 (2, witness names confidential).
Everything else is LEVEL 3 to 9, published sources, which the codebook calls
freely available. Filter rule: **drop LEVEL 0 and 1 entirely, suppress names on
LEVEL 2.** (The prose says "less than 10% of primary records hold back more than
witness names", which the data contradicts. Treat the data as authoritative and
the sentence as legacy.)

**How we actually use it: as a bibliography, which is what it is.** The
codebook's own opening quote (Hendry, 1979) calls it one, and the data agrees:
`SOURCE` on 100% of records, `AUTHOR` on 99.8%, `PAGEVOL` on 93.6%.

So we do **not** reformulate CUFOS's `NOTES`. We use UFOCAT as an index telling
us where the primary sources are ("Socorro 1964: Hynek here, Hall there, Condon
at this page") and write from those. Better on every axis at once:

- Editorially better: primary published accounts, not a paraphrase of a terse
  coded summary. Their `NOTES` is compressed coding, not publishable prose.
- Cleaner: using a bibliography to find sources is what a bibliography is for.
- It is the differentiator. Competitors cite a database. We cite Hynek, page 47,
  which is the attribution discipline `AGENTS.md` already demands.

**The facts are ours to use; the clustering is the one thing to be careful with.**
Individual facts (date, place, coordinates, shape, which publication carried it)
carry no copyright, and an account written in our own words is our expression.
The `PRN` grouping is different: deciding that 70 published accounts describe one
event at Socorro is CUFOS's judgement, not a lookup. Lifting that table wholesale
is taking their work. Our design already avoids it, by computing our own clusters
and using theirs only to score ours. Their table never ships.

**Settled approach:** ingest the facts, compute our own clusters, use `PRN` as the
validation set, treat the whole database as a finding aid pointing at primary
literature, never serve `NOTES`. That needs nobody's permission.

**Still send the email** (Donald A. Johnson / Sun River Research Institute, or
`infocenter@cufos.org`), but for goodwill rather than as a blocker. Their stated
criterion is people "with a scientific interest in the UFO problem and who will,
in turn, make their findings freely available", which describes this site. Being
able to say the archive is cross-referenced against UFOCAT with CUFOS's knowledge
is worth more than the alternative.

**Caveat:** the above is reasoning about copyright, not legal advice. The archive
wants a real review before publishing at scale, same as the legal pages. The
design above is the one needing the least of it.

**Unresolved:** the codebook says "over 146,000 records"; the table holds 320,412.
Do not quote either number publicly until the difference is understood. Also, the
codebook notes some entries are deliberately **not UFO events** (nuclear tests,
aircraft crashes, power failures, crop circles, deaths of UFO figures), so ingest
needs a filter on `TYPE`.

### Pipeline stages, not "three bots"

Extends blueprint line 269 (stages, not one kitchen-sink prompt). **A pipeline
stage is not an agent.** If every stage becomes an LLM loop we pay latency and
non-reproducibility for work a plain function does perfectly, and at 320k records
that difference is the project.

| Stage | Work | LLM? |
|---|---|---|
| Fetch | Per-source fetchers, normalise, land raw | No |
| Match | Blocking, scoring, cluster, flag | **No.** Algorithm, now measurable |
| Enrich | Given date + place, find news, documents, footage | **Yes**, genuinely agentic |
| Assess | Relevance score, exclusions | Mostly no. Rules over signals |
| Write | The four-section account | **Yes** |
| Validate | House style, grounding | No. `validate-account.ts` exists |
| Translate | Three languages | **Yes** |
| Publish | Media, documents, page, sitemap | No |

Three LLM roles inside a mostly deterministic pipeline, two of which already exist.

**The valuable part is the queue between stages, with per-record state.** Each
stage independently retryable, output inspectable, and a crash at hour six does
not lose the batch. At this scale a monolithic run is not survivable.

**Lock in now: the writer must not see the classification.** Given the verdict it
will write toward it. It gets source material and writes what the material says;
classification happens separately. Cheap now, very hard to retrofit.

### n8n: right for half the job

**Licence is fine.** Sustainable Use License permits "your own internal business
purposes"; the restriction targets redistributing or hosting n8n for others. We
run it locally to build our own site. n8n is not the product.

**The blueprint already draws the line**: "the staged backfill" (one heavy job)
versus ongoing work where "cost is a trickle".

- **Backfill: scripts, not n8n.** n8n passes items between nodes as in-memory JSON
  arrays. Built for tens-to-thousands of items, not 320,000. The matcher would end
  up inside a Code node, i.e. the script we would have written anyway but harder
  to test and version.
- **Trickle: n8n is a good fit.** New AARO releases, police FOI checks, channel
  walks, enrichment, draft → validate → translate → review queue. Tens of items,
  several services, needs scheduling and retries. **The real argument is that the
  operator is not a coder**: seeing which node failed and pressing retry beats
  reading a stack trace.

**Qdrant: not yet, and it is a measurable question.** We are already on Postgres,
so pgvector avoids a fifth service. More to the point, vector similarity is the
fourth signal, not the first: date + coordinates is the primary block, and
semantic matching on "bright light moving fast" only helps *inside* an already
small candidate set. So: build the deterministic matcher, score it against
UFOCAT's 36,424 clusters, and inspect the misses. Wording differences → vectors
help, add them. Bad coordinates and vague dates → vectors change nothing. **Decide
by measurement, using the only dataset that makes it possible.**

**Scraping:** most high-value sources are plain file downloads (NARA bulk, GEIPAN
Excel, AARO mp4s). HTTP first, scraping only for police FOI pages. Playwright
already hit three walls on YouTube in session 1.

**Nothing existing is wasted.** `validate-account.ts`, `known-events.ts`,
`normalize-url.ts` and `prompts.ts` are library code with 38 passing tests. Under
n8n they become CLI commands or small HTTP endpoints that nodes call. The
orchestrator changes; the logic does not.

### Disk: new things go on D

Operator rule: **an app or two on C is fine; multi-GB payloads are not.** What is
already on C stays. Anything added from now on goes to D.

Measured 26 July 2026: C has 61.5GB free, D has 275.1GB free. Docker Desktop
28.1.1 is already installed (engine stopped), and its data disk
`C:\Users\utilisateur\AppData\Local\Docker\wsl\disk\docker_data.vhdx` is **already
3.14GB**. Adding n8n + Postgres + Qdrant images and volumes pushes that into the
10GB+ range the operator has ruled out, so **relocate it before installing
anything**. Easiest while the engine is stopped.

| Thing | Defaults to C | Fix |
|---|---|---|
| Docker Desktop disk image | **Yes, already 3.14GB** | Settings → Resources → Advanced → Disk image location → D |
| Playwright browsers | Yes, under AppData | `PLAYWRIGHT_BROWSERS_PATH` |
| npm cache | Yes | `npm config set cache` |
| pip cache | Yes | `PIP_CACHE_DIR` |
| Embedding models, if added | Yes, HuggingFace cache | `HF_HOME` |

Docker Desktop itself may stay on C (it is an app, not a payload). Ollama already
has its own D folder.

**Resolved 26 July 2026.** Docker updated to 29.6.2 and its disk image moved to
`D:\Git\Websites\Docker` (4.72GB), outside the repo. An empty leftover `Docker/`
directory remains in the project and is harmless. Git's `safe.directory`
exception was added, so git works normally from both shells now.

**Security check, done once git was usable:** `stripe_backup_code.txt` was sitting
untracked in the repo root. Confirmed against **full history** (`git log --all`),
not just the current tree, that it has **never been committed**, and the only
secret-shaped filename ever added across all 24 commits is `.env.example`, the
documented template. Repo is clean. The file should still be moved out of
`D:\Git\` entirely: gitignoring a secret leaves it in a directory that gets
synced, backed up and indexed, and one `git add -f` undoes the protection.

### Two things caught while checking the above

**1. `UFO Data/` was not gitignored.** 1.4GB of acquired source data sitting in
the working tree. Now ignored, and the reason recorded in `.gitignore` is
licensing before size: UFOCAT is copyright CUFOS and requires written permission
to reproduce or publish extracted material, NUFORC's terms forbid redistribution,
and **pushing either to a public repository is publishing them**. Every file also
exceeds GitHub's 100MB limit so the push would have failed regardless, but that is
the lesser reason. Believed untracked (the folder postdates the last commit) but
**unverified**, see below.

**2. Git will not run in this repo from either shell.** `.git` is owned by
`BUILTIN\Administrateurs` while the session user is `DESKTOP-CUN51H2\utilisateur`,
so git refuses with "dubious ownership". The repo was presumably created from an
elevated terminal. Until it is resolved, no tooling here can inspect or commit.
Fix is either:

```
git config --global --add safe.directory 'D:/Git/Websites/Global Anomaly Network'
```

or taking ownership of `.git` back to the normal user. **Operator decision, not
taken unilaterally**, since it edits global git config.

### The standing enrichment rule

**Operator decision, 27 July 2026.** For any case we write up, after clustering
has settled whether it is a duplicate, the pipeline goes looking for
contemporaneous local reporting and police records. Not an occasional extra: a
standard step.

**Order matters, and it is what makes this affordable.** Enrichment runs on the
*cluster*, never on the report, and only on clusters being written up. Per report
that is 306,817 searches; per cluster 238,499; gated behind relevance scoring it
is a few hundred. Same work, three orders of magnitude apart, and clustering has
to come first for the gating to mean anything.

**Search the event date and the following two days, not just the date.** An
evening sighting appears in the *next* morning's edition, and a weekly paper may
carry it two or three days later. Searching only the event date would miss most
local coverage of exactly the evening events that make up the bulk of the
archive. Police logs are the same shape: a call at 23:40 lands in the next day's
occurrence book.

**Where to look, by era:**

- **Pre-1963 US**: [Chronicling America](https://chroniclingamerica.loc.gov/),
  Library of Congress, public domain, full text, has an API. Lands squarely on the
  1947 wave, the 1952 Washington flap and the 1897 airship reports. Nobody in this
  field uses it systematically.
- **Australia**: [Trove](https://trove.nla.gov.au/), the same idea.
- **Post-1963**: mostly paywalled and in copyright. Cite, link, quote sparingly,
  write our own. Same rule as every other source.
- **Police**: the harvest-versus-request split recorded below.

**What it produces.** Not prose to paraphrase, but citations: a named newspaper, a
date, a page. That attaches to the case as a source and puts contemporaneous
primary reporting under our account, which is the same discipline as using UFOCAT
as a bibliography rather than as a text. It is also the thing that separates a
written case from a database row, and no competitor does it.

**Cost, stated plainly:** this is the slowest step in the whole pipeline and it
will dominate the time budget for any case it runs on. That is the trade, and it
was made deliberately: accuracy and primary sourcing over volume.

### Enrichment research from date + place

Gated behind the relevance scoring, always. It cannot run across 238,499 cases;
it runs on the few hundred worth writing. News archives are copyrighted like
everything else: cite, link, quote sparingly, write our own.

**[Chronicling America](https://chroniclingamerica.loc.gov/) is the standout
source and nobody in this field uses it systematically.** Library of Congress,
public domain, full-text searchable, has an API, covers to 1963. Lands on the 1947
wave, the 1952 Washington flap and the 1897 airship reports with *contemporaneous
local* coverage rather than a book written thirty years later. Trove does the same
for Australia.

### Wave detection (spatiotemporal clustering)

Genuinely nobody is doing this, and we hold the data it needs: 91.7% coordinates,
100% year, 98.1% month, 93% day. Computable today.

**1. It is a different relation from deduplication and must never share a table.**
A duplicate cluster is *one event, many sources*. A wave is *many events, one day,
one region*. Merging London, Manchester and Cardiff into a single event is the
worst bug this system could produce, and it is exactly what happens if the two
ideas share a field. Separate relation, separate name, separate storage.

**2. Normalise against local base rate.** Raw counts rediscover population
density and every ordinary Tuesday in California becomes a wave. Measure
statistical excess over a local baseline, not volume.

**3. The framing stops short of the claim.** "Four reports filed within six hours
and 300km of each other" is a fact about the reports. "Four people saw the same
object" is an assertion, and we do not make those. The page states the
co-occurrence and shows the data; the reader draws the line.

**Validation:** the known waves (1897 airships, 1952 Washington, 1954 France, 1973
October, the Belgian wave) should light up automatically. Test against those
before trusting anything it finds that nobody has named. Same method as scoring
the matcher against UFOCAT's `PRN` clusters.

### The full source list

**`docs/source-registry.md`** holds every source, triaged by licence class with a
status mark and a next action for each: public domain, non-US government needing
per-country checks, worldwide police FOI, ~25 private organisations to ask,
what is already acquired, reference-only, and the three not to touch. It also
tracks the emails to send.

That file is the working checklist and becomes the `sources_registry` table. Keep
it current; do not let source knowledge live only in conversation.

### UFOCAT extraction: the encoding facts, hard-won

`scripts/ingest/ufocat_extract.py` reads the `.accdb` and writes normalised JSONL
to `.pipeline/`. Run it with `.tools/venv/Scripts/python.exe` (Python because
nothing else reads Access without the Microsoft ACE driver, which this machine
lacks). Facts and narratives go to **separate files**, so publishable data and
local-only prose cannot be confused downstream.

**Result: 306,817 records from 320,412 rows.**

| Rule | Count | Why |
|---|---|---|
| Dropped, LEVEL 0 and 1 | 92 | Contributor marked confidential |
| Dropped, `TYPE` starts `0` | 13,503 | **Deliberately not UFO events**: nuclear tests, aircraft crashes, power failures, crop circles, deaths of UFO figures. Would have become sightings on the map |
| Names withheld, LEVEL 2 | 2 | Witness names confidential |
| Coordinates kept | 282,103 | 92% |
| Coordinates dropped | 179 | 140 British grid, 33 out of range, 4 flagged erroneous, 2 French metric |
| Dates | 283,134 day / 15,300 month / 7,939 year / 444 unknown | Precision downgraded, never invented into a 1 January |

**Every one of these was verified, not assumed, and each would have corrupted the
archive silently:**

- **Longitude sign.** The codebook's English system makes **West and North
  positive**. Standard practice is West negative, so **longitude is negated and
  latitude is not.** Checked both hemispheres: Newport WA stores `117.05` and
  sits at 117.05 W; Hoppers Crossing, Australia stores `-144.69` and sits at
  144.69 E. Get this wrong and every US pin lands in Central Asia.
- **`X3` selects one of four coordinate systems**, but is null on 320,400 of
  320,412 rows. The exotic cases are 12 records: `=` known erroneous, `Q`
  unchecked, `M` French metric at 400 grads from the Paris meridian.
- **148 rows put an Ordnance Survey grid square in `LATITUDE`** (`' SD .27'`).
  Proper OSGB36 conversion is real work and a 100km square is too coarse for a
  pin, so the record is kept and coordinates dropped.
- **33 rows hold impossible values**, from a missing separator in the fixed-width
  field (`4005` for 40.05, `-8155` for -81.55) and from plain typos (`94.77`
  where North Little Rock is at 34.77). **Deliberately not repaired**: dividing by
  100 would also convert the typos into plausible but wrong locations, which is
  the worst available outcome. Dropped, record kept.
- **`REGION` is not a country.** It is one of 17 continent-level codes where
  **`CA` means Central America and `CN` means Canada**, and `STATE` is the
  subdivision (`GBR` is Great Britain inside `EU`). **`STATE` alone is not
  unique**, since `CA` is both California and the Central America region, so
  WORLD is keyed on the pair. An early check that assumed REGION was a country
  reported hundreds of false errors.

**Geography, once resolved:** United States 195,946, Canada 22,047, Great Britain
16,999, France 10,864, Brazil 4,340, Argentina 4,284, Spain 3,128, Italy 2,731.
The French and Iberian volume is real material behind the multilingual argument.

### The matcher, measured

`src/lib/ingest/match.ts` with 24 tests. Validated by
`scripts/ingest/match-validate.ts` against UFOCAT's 35,109 hand-built
multi-record cases: 91 million pairs compared, ~510s per run.

**First guesses were wrong and the measurement caught it.** LINK 0.86 gave 72.2%
precision, meaning one auto-merge in four disagreed with CUFOS. Against our own
rule that a wrong merge destroys two events silently, unusable.

**Measured, cross-publication pairs only:**

| score | precision | pairs |
|---|---|---|
| >= 1.000 | **97.1%** | 93,001 |
| >= 0.950 | 89.7% | 177,631 |
| >= 0.900 | 80.7% | 253,380 |
| >= 0.700 | 56.6% | 403,761 |
| >= 0.650 | 49.0% | 488,998 (93.4% recall of reachable) |

**Constants now `LINK = 0.97`, `SUGGEST = 0.65`.** Link buys 35% recall, which is
fine: the other 65% are not lost, they go to review. Suggestions are context shown
when someone opens a cluster, not a global to-do list, so a large pool is
acceptable where 500,000 review items would not be.

**Why cross-publication is the fair test, and why we do not tune to maximise
agreement with UFOCAT.** Precision plateaued at 94.9% overall, and a plateau is
usually a definition problem. Inspecting perfect-score disagreements
(`scripts/ingest/match-inspect.ts`) found them dominated by *same-publication*
pairs: `UFOReportCtr` with itself 716, `CanadUFOSurv` with itself 709, `BPratt2`
with itself 307. Examples were identical date, identical coordinates, identical
shape, consecutive URNs, different PRN. That is **UFOCAT's unit, which the
codebook states is one witness via one source**: a mass sighting reported by forty
people to NUFORC is forty cases describing one event. Ours is the event, which is
what a map pin needs. Restricting to cross-publication pairs lifts precision to
97.1%, and that is also exactly the link that carries the corroboration claim.

**Some disagreements are UFOCAT's own errors.** Aveley 1974, a well-known UK case
documented by Rosales, Webb, Spencer, Hall and *Flying Saucer Review*, splits
across PRN `166684` and `106684`. Transposed digits orphaned a record from its own
cluster. So 97.1% understates us further.

**Blocking reaches 93.0% of true pairs** (267,229 of 287,460). The missing 7% is a
blocking problem, not a scoring one, and no threshold recovers it. Worth revisiting
before tuning scores further.

**Design notes carried in the code:**

- Date is a **gate**: no date agreement means no match, whatever else aligns.
- Distance tolerance is deliberately generous to ~150km, because sources disagree
  about where an event happened. UFOCAT places Mantell 1948 at `FORT KNOX`,
  `FRANKFORT`, `FRANKLIN SW` and `F-51`, roughly 100km apart. A tight matcher
  would miss the best-documented case in the database.
- Shape is corroboration, never evidence. `Disc` is the commonest value, so
  agreeing on it says almost nothing, and disagreeing is normal between witnesses
  to one event.
- Year-precision dates were stored as 1 January, so they must never read as an
  exact same-day match. Tested.
- Name similarity substitutes for coordinates only at >= 0.8, because
  `springfield`/`springville` scores 0.5 while a transposition scores 0.67. The
  margin is narrow, so coordinates decide whenever we have them.
### Saturation and blocking, fixed 27 July 2026

**Saturation: fixed, and it raised peak precision.** The stepped distance score
returned exactly 1 for anything within 5km, which combined with an exact date to
pin 93,001 pairs at precisely 1.0, destroying all ranking at the one place ranking
decides anything. Replaced with a continuous curve, `1/(1 + km/60)`, and weights
that sum to 0.97 rather than 1.0 so nothing clamps.

**A new signal came out of it: time of day.** UFOCAT carries a clock time on 82.9%
of records, and it discriminates exactly where date and distance have both
saturated. Two accounts of one event at 21:00 and 21:05 are a far better match
than 21:00 and 04:00 on the same date, and those previously scored identically.

A subtlety worth keeping: **a missing time counts as neutral (0.5), not absent.**
The first version withheld the bonus, which ranked a pair seven hours apart
*above* a pair with no times at all. Silence is uninformative; disagreement is
evidence. The three cases now order correctly and the tests assert the ordering.

| Cross-publication precision | before | after |
|---|---|---|
| >= 0.950 | 89.7% | **98.3%** (61,119 pairs) |
| >= 0.900 | 80.7% | 94.6% (155,299) |
| >= 0.850 | 75.3% | 86.1% |

Previously precision fell off a cliff from 97.1% at exactly 1.0 to 89.7%; it now
grades smoothly, and >= 95% precision is reachable on *all* pairs, which it never
was. **`LINK` is 0.92, `SUGGEST` 0.65.** 0.92 is not arbitrary: maximum possible
is 0.97, a pair agreeing perfectly but with no time on either side reaches 0.925,
and one actively disagreeing on time tops out at 0.8935. So 0.92 is the only bar
that admits the 17% without times while still rejecting time disagreement.

**Blocking: improved from 94.4% to 95.2% reachable, not solved.** The diagnosis
found 44% of the gap was structural: coordinate records blocked on grid cells,
coordinate-less ones on place names, so the two populations could never meet.
Emitting the name key for *every* record fixed that half, and also catches pairs
where one record's coordinates are simply wrong (UFOCAT holds SANDWICH at both
-1.339 and +1.34, 186km apart, one a sign error).

Remaining gap, in order, with the honest reason each is left:

| Cause | Pairs | Why not fixed |
|---|---|---|
| One has coordinates, the other not | 5,866 | **No longer structural.** These are pairs whose place names *also* differ (`CHEREPOVETS` vs `CHAROVSK`). Next lever is a `year\|county:` key: UFOCAT has COUNTY on 91.8% and county buckets stay small |
| Sources disagree on the year | 3,485 | The date gate correctly refuses a pair twelve months apart. CUFOS linked these with case-specific knowledge; automating that trades a real gain for silent errors we cannot audit |
| Coordinates over 200km apart | 2,285 | Mostly not duplicates at all. CHEREPOVETS and CHAROVSK, 127km apart on one day, are two events in a **wave**, which is a separate relation with its own table. Refusing to merge is correct |
| Neither has coordinates, names differ | 1,907 | Little to work with |

Note the validator reports a lower reachability (93.0%) than `block-diagnose`
(95.2%) because the validator also skips blocks over 400 records. That difference
is a harness sampling cap, not a blocking failure.

**Also fixed:** `pairKey` in the validator had lost its separator to a stray
`sed`, leaving null bytes in the file and, once naively stripped, concatenating
ids so `"12"+"345"` and `"123"+"45"` would have collided. Caught before it
corrupted a measurement.

### Clustering, and the drift guard

`src/lib/ingest/cluster.ts`, 14 tests. Turns linked pairs into event clusters.

**Grouping is transitive; matching is not.** If A links B and B links C, naive
union-find groups all three even when A and C were never compared, or were
compared and rejected. Chains walk: 60km hops merge reports 500km apart into one
"event". At 98% pair precision this still happens, because a cluster of 30 records
holds 435 pairs and only a few need to be chains.

**Why it is the worst available failure.** A cluster is shown to readers as
"independently reported in five archives". A drifted cluster is therefore a
fabricated corroboration claim, invented by an algorithm and asserted in the
site's own voice. Every other number on the page borrows credibility from that one.

**The guard:** a merge that would stretch a cluster past `MAX_CLUSTER_DAYS = 3` or
`MAX_CLUSTER_KM = 250` is refused, and the pair is demoted to a suggestion for a
human. Both limits derive from the matcher rather than from taste: it already
treats more than two days apart as no match, and its distance score floors at
200km, so a wider cluster necessarily contains a pair the matcher itself would
have refused. Pairs are consumed **strongest first**, so confident links shape a
cluster before a marginal one can stretch it, and the weak link is the casualty.

Two decisions the tests pin down:

- **A cluster reports the earliest date a source actually named**, never an
  average. Averaging 20 and 22 December gives the 21st, a day nobody reported,
  which is inventing a fact.
- **`source_count` counts publications, not records.** Five rows from one database
  is not corroboration; three rows from three is. That distinction is the claim.

### Two consequences of LINK = 0.92, found by running it

Both fall out of the arithmetic rather than having been designed, so they are
written down before they get mistaken for intent.

**The drift guard is nearly inert at this threshold: 1 refusal in 144,245 links.**
Work out what 0.92 demands. With date, name, time and shape all perfect the fixed
part contributes 0.67, so `0.30 * place >= 0.25`, meaning `place >= 0.833`, and
`1/(1 + km/60) >= 0.833` puts the pair **within about 12km**. A chain of 12km hops
needs some twenty consecutive links to drift past 250km, and clusters that long do
not occur. So the guard is cheap insurance, not an active filter.

It becomes load-bearing the moment any of these change: the threshold drops, or a
source arrives whose coordinates are geocoded to a city centroid across a wide
metro area, or a wave-heavy dataset produces long chains of genuine near-misses.
Keep it. Do not mistake the low count for the guard being unnecessary.

**Reports without coordinates can never auto-link.** The name substitute caps
`place` at 0.7, so the best a coordinate-less pair can score is
`0.67 + 0.30 * 0.7 = 0.88`, below the 0.92 bar. Every such pair goes to human
review instead. That is defensible and arguably right, since less evidence should
mean a person decides, and it affects 8% of UFOCAT and more of the older material.
But it was not a deliberate choice, and if the review queue ever needs shrinking,
this is where a large slice of it comes from.

### The Supabase loader

`scripts/ingest/load-supabase.ts`. Ready, but **migration 002 must be applied by
hand** in the Supabase SQL editor: `supabase-js` cannot run DDL and the project
holds only REST keys, no Postgres connection string. The loader detects the
missing schema and says exactly that rather than failing obscurely.

It refuses two things by construction:

- **It never sets `may_publish_facts` true.** That flag is what RLS reads to
  decide public visibility, so it is the line between storing and publishing. A
  loader able to grant itself publication rights would defeat the flag's purpose.
  UFOCAT therefore loads invisible and stays so until CUFOS answers.
- **It never writes narrative or witness names.** Neither has a column.

**The real gate on a visible map is not this loader.** UFOCAT cannot be shown
without permission, so loading it produces 300,000 invisible rows and no pins. The
critical path is **GEIPAN's licence check**: 3,368 cases, coordinates already
present, and if it is Licence Ouverte 2.0 as expected, that is the first dataset
we can actually put on a map.

### Police FOI, worldwide

Yield varies enormously because the regimes do. Two different jobs:

- **Harvest** where forces publish disclosure logs proactively: UK, Ireland,
  Australia, New Zealand, Canada, Sweden (1766 law, oldest in the world). Bot work.
  Do this first.
- **Request** where FOI exists but nothing is published by default: much of the
  EU, India (RTI), Brazil (LAI), Mexico. Operator time, one at a time.

Police call logs are frequently exempt even where FOI is strong.

### NUFORC: settled

Facts in, our own prose out, rename and reframe events as suits the site,
cross-check against news reporting for detail. News articles are copyrighted the
same way: cite, link, quote sparingly, write our own. Because we never serve their
text, copyright exposure is near zero; what remains is only how the file was
obtained. **Still worth confirming provenance, no longer blocking.**

### Historical and ecclesiastical material (the Vatican idea)

Approved in principle. A record of what people in 1561 wrote down is a real
historical document and dismissing it is its own bias. Neutral cuts both ways.

**The guardrail is not the question, it is the retro-diagnosis.** "The Nuremberg
broadsheet describes spheres and rods in the dawn sky, printed within days, by a
named printer" is solid. "The Nuremberg UFO battle" is us asserting, and it is the
one move that costs the credibility everything else is built to earn.

The honest angle is also the more interesting one: for historical material we
usually cannot know what was *seen*, but we know precisely what was *reported* and
how it was *interpreted at the time*. That is the actual subject. It fits "wonder
scales with credibility" cleanly, being weak for identification and strong as
history.

**Therefore: articles section, with framing and a byline. Never map pins beside
radar-confirmed military cases.**

### Revised order of work

Cheapest first, each visible before the next starts.

1. **Top bar** — DONE. Coffee link renamed, language control added, row
   re-laid out. Responsive tiers: below `sm` the wordmark becomes "GAN" and the
   coffee link moves into the menu; `md` brings inline nav; `xl` gives the coffee
   link its words. **Language stays in the bar at every width**, because a reader
   who cannot read the site cannot be expected to find that control behind a
   hamburger. Verified at 375px with no horizontal overflow.
2. **UI dictionary** — PARTLY DONE. `src/lib/i18n/` with `index.ts` and four
   dictionaries; `Dictionary = typeof en` (not `as const`, which would freeze
   values to the English literals) so a missing key is a build error.
   `I18nProvider` reads the cookie, falls back to `navigator.languages` matched
   on the primary subtag (`pt-BR` finds `pt`), and dynamic-imports the three
   non-English dictionaries so a reader using one language does not download
   four. **Departs from the Next.js guide on purpose**: the official pattern is
   `[lang]` sub-path routing, which the blueprint rules out. Cookie + client swap
   keeps English in the served HTML and **kept case pages prerendered (SSG)**,
   confirmed in the build output.
   - *Translated:* header, nav, footer, support button, skip link,
     classification badges, language control.
   - *Still English:* page headings and intros (cases, science, search, browse,
     about), filter pill labels, science status and topic labels, search box
     placeholder, and card meta lines. `formatEventDate` also hardcodes `en-GB`
     and needs the active locale.
   - Filter labels are deliberately left for item 6, so they get translated once
     when the shared filter bar is built rather than twice.
   - Legal pages stay English with a line saying so: machine-translated terms and
     takedown policy is a liability the rest of the site does not carry.
   - **Privacy page updated in the same pass**: it claimed no cookies beyond the
     theme, which the `gan_lang` cookie made false. Named explicitly there now.
3. **Case translation backfill** — admin action translating already-published
   cases, so the existing switcher stops being invisible. Wired to the header
   control so choosing Français carries into case pages.
4. **Media markers on cards** — derived, never stored. A stored "video" tag goes
   stale the moment media changes and starts lying to readers. `SUMMARY_COLUMNS`
   already fetches `media(*)`, so video and image cost no extra query; documents
   needs `documents(id)` added to that select. Topic tags become visible on cards
   too, which is what blueprint line 57's related-case linking needs.
5. **Thumbnails on cards** — `design-direction.md:34` always specified
   "media/image at top"; the text-only card is the departure. Distinct desktop and
   mobile sizing. Falls back to text when there is no media, which is every case
   today, since all seed media URLs are empty.
6. **One shared filter bar** — extracted from `/cases`, then given to `/search`
   too, gaining media type, continent and decade. Decades need a "date unknown"
   bucket or every unknown-date case silently vanishes from all decade filters.
7. **Articles section** — third content type, schema, admin, index, entry page.
8. **Report ingest and the cross-reference engine** — `sources_registry`,
   `reports`, `report_links`; blocking, scoring and the asymmetric thresholds
   above. Ingest NUFORC (147,890, already local) and GEIPAN (licence check first,
   coordinates present) before Blue Book (needs extraction and geocoding). Gates
   the map, so it comes first. This is the biggest single piece of work in the list.
9. **Interactive world map** — table stakes now, everyone has one. Reads `report`
   rows, pins link to `case` rows where one exists. Needs server-side clustering
   or hex binning: 16k raw points shipped to a browser is not viable.
10. **Chronological timeline** — 1930s to today, decade buckets shared with (6).
10b. **Wave detection** — same-day, same-region clustering with base-rate
   normalisation. Separate relation from dedup. Validate against the known waves
   first. The genuinely novel feature: nobody else has it.
10. **Case relationships** — `getRelatedCases` already ranks by shared tags.
    Needs surfacing and explicit links, not rebuilding.
11. **Newsletter and email alerts** — needs consent, unsubscribe and a lawful
    basis, so it lands after the consent layer.
12. **Cookie consent layer** — the gate for ads and analytics.
13. **Legal pages rewritten** — last, by design, then reviewed by a lawyer.
14. **Membership** — only once there is something to offer that does not remove
    anything from the free reader.

Then the session-1 list below: relevance scoring, AARO fetcher, PDF extraction,
case updates.

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
