# Master Blueprint — The UFO & "Life Elsewhere" Directory

*The single source of truth for the whole project. Everything designed across planning, consolidated into one document to build from. Three companion files go with it: `editorial-template.md` (UFO voice), `science-template.md` (science voice), and `seed-source-list.md` (where content comes from).*

---

## 1. Vision & positioning

A free, worldwide, easy-to-browse directory with two sibling sections sharing one home:
- **Cases** — UFO/UAP sightings from the 1930s to today, from officially acknowledged government footage to unverified public clips, each with embedded video and a neutral account.
- **Science** — the "is there life elsewhere" story: exoplanets, the search for life, technosignatures, interstellar objects — explained plainly for non-scientists.

**Audience:** genuine seekers — people who want real answers and haven't stopped wondering. Serious, but not cold.

**The identity in one line:** rigor where rigor fits, awe where awe is earned. Two registers on purpose.

---

## 2. The editorial soul (read before anything)

The thing that makes this site trusted *and* loved is its stance, and it is strategic, not just tonal:

- **Open-minded neutrality, never the skeptic route.** Leaning skeptic is as much a bias as leaning believer, and it's a losing bet: a debunk-everything site looks foolish the day something real happens, and it condescends to the exact audience it wants. "No one has explained this — not the witnesses, not the investigators, not the government" is the most accurate *and* most compelling thing you can say.
- **Wonder scales with credibility.** Named pilots + radar + official acknowledgment earns genuine awe; a shaky anonymous clip stays gentle. Calibrate to the evidence.
- **Open questions, yes; invented answers, no.** Wonder as boldly as the evidence allows; never fill the mystery with a made-up answer, in either direction.
- **Two voices.** UFO section = reported phenomena, relayed with curiosity (see `editorial-template.md`). Science section = published findings, explained plainly and never hyped (see `science-template.md`). Never let a sighting borrow the standing of a peer-reviewed result.
- **Write like a human, not a model.** Over-polished prose reads as AI now and this audience trusts it less. No em dashes, no stock phrasing, varied rhythm. Both templates carry the full rule, and it applies to the bot's output in every language.

The public **about / our standards page** states this stance openly, which is exactly what earns a skeptic's trust and a believer's loyalty at once.

---

## 3. Technical approach

Built custom, with AI, by a non-coder, using a stack that hides the scary infrastructure:

- **Frontend:** an AI app-builder generates a responsive React/Next.js site.
- **Backend/database/auth/storage:** **Supabase** (Postgres, built-in authentication, file storage, automatic backups).
- **Hosting:** Vercel or Netlify (free tier to start).
- **Publishing: Git-based deploys, never FTP.** Connect the `D:\Git\Websites\UFO` repo to Vercel/Netlify; committing and pushing a change auto-rebuilds and goes live in under a minute, no manual file upload. The bot doesn't upload files either; it writes content straight into Supabase over its API. Pick a host by "connects to GitHub," not "offers FTP" (FTP is a signal of the older shared-hosting type that fits this build poorly). The only file-uploading that ever appears is the far-future user video feature, and even that goes through the app into cloud storage, not FTP.
- **Local repo:** `D:\Git\Websites\UFO` on the user's Windows PC; built with Claude Code in the desktop app working directly in that folder.
- **The bot runs on your PC, not the server** (full picture in Section 20): a local LLM via Ollama does the writing, the bot handles fetching/formatting/links, and finished rows are written straight into Supabase. The site just displays results, so it stays free.
- **Design principle:** **responsive**, one site that reflows to any screen, not device-detection. Mobile-first, since most traffic is phones.

---

## 4. Information architecture

Two content types, one navigation.

**Cases** browse by: **classification → continent → country**, plus an **Unknown location** bucket for clips with no known origin.
- Classifications: *Acknowledged* · *Unverified* · *Likely explained* · *Debunked*.
- Continents: North America, South America, Africa, Europe, Asia, Oceania, Unknown.

**Science** browse by topic: exoplanets · search for life · astrobiology/biosignatures · interstellar objects · space signals · missions & telescopes.

**Cross-cutting:** free-text **search**, and **tags** with related-case linking (so Rendlesham connects to other military-witness cases and readers fall down a rabbit hole).

---

## 5. Database schema

Core tables (Supabase/Postgres). Feature-flagged tables sit dormant until switched on.

- **users** — id, email, nickname, role (`admin`/`mod`/`user`), email_verified, prefs (watchlist_emails on/off, newsletter opt-in), created_at
- **cases** — id, title, slug, summary, account_body, date_of_event (nullable), location_name, continent, country, location_unknown (bool), classification, classification_reason, view_count, published (bool), created_at, updated_at
- **categories** — id, name, slug, description, sort_order *(if not using enum classifications)*
- **media** — id, case_id, type (`youtube`/`short`/`tiktok`/`gov_file`/`image`), embed_url, caption, role (`primary`/`additional`), sort_order  *(many per case; enables multi-angle galleries)*
- **documents** — id, case_id, title, source_url, source_note  *(linked, not hosted)*
- **sources** — id, case_id, source_name, source_url, source_type (`govt`/`news`/`witness`/`research`)
- **tags** / **case_tags** — flexible labels + join table
- **science_entries** — id, title, slug, topic, status (`candidate`/`proposed`/`confirmed`/`disputed`/`superseded`), institutions, date, body, view_count, published
- **science_images** — id, entry_id, image_url, credit, caption
- **science_sources** — id, entry_id, name, url (paper/DOI, press release)
- **submissions** — id, user_id (nullable), type (`link`/`upload`), url, note, status (`new`/`reviewed`/`dismissed`)  *(feeds the review inbox)*
- **comments** — id, case_id/entry_id, user_id, body, status (`visible`/`removed`), created_at  *(behind a flag)*
- **watchlist** — id, user_id, target (case_id or category/region), created_at
- **newsletter_subscribers** — id, user_id/email, opted_in_at, unsubscribed_at
- **case_translations** / **science_translations** — id, case_id/entry_id, lang (`en`/`fr`/`pt`/`es`), title, body, is_machine (bool)  *(one record holds several language versions; see Section 19)*
- **monitored_sources** — id, name, type, section (`cases`/`science`), endpoint/query, last_checked, mode (`backfill`/`watch`), status (`proposed`/`approved`/`rejected`), enabled  *(the bot's source list and per-source memory; discovery adds `proposed` rows for you to approve; see Section 6)*
- **ingestion_log** — id, normalized_url, source, first_seen, outcome (`published`/`merged`/`dismissed`)  *(everything the bot has ever seen, so it never re-decides)*
- **social_drafts** — id, case_id/entry_id, platform (`x`/`instagram`/`facebook`), draft_text, media_ref, status (`queued`/`posted`/`skipped`), scheduled_for  *(see Section 14)*
- **settings** — feature flags: comments_on, accounts_on, uploads_on, ads_on, newsletter_on; ad config; about-page content

---

## 6. Content pipeline (the bot)

The bot does the legwork; a human gate stands between "found" and "live." It never auto-publishes.

Flow: **curated sources → fetch legally (APIs/embeds, never scraping) → transcribe & translate (non-English → English) → synthesize an account (per the templates) → suggest a classification with reasoning → deduplicate → land in the review inbox → human approves/edits/dismisses → publish.**

- **Synthesis, not transcription.** It writes a reportage account (observable description → attributed claims → status → what remains unknown), never a literal subtitle dump. Grounded: no invented details; unknowns stay unknown. Human voice, no em dashes (per the templates), in all four languages.
- **Remembers what it's seen (ingestion memory).** An `ingestion_log` records every URL the bot has ever encountered, including ones you rejected or dropped as duplicates, with its outcome. On each run, anything already logged is skipped before it reaches your inbox, so you never re-decide the same clip. URLs are normalized first (strip tracking params, resolve shortened/mobile variants) so the same video via different links counts as one.
- **Fetches only what's new (timestamps + modes).** Each source stores a `last_checked` timestamp; recurring runs ask only for material published since then. Two modes per source: a one-time **backfill** sweep of the full history when a source is first added (so the old 1930s–1970s cases still come in), then **watch** mode that pulls only new items.
- **Deduplication.** Exact link matches are caught free by the ingestion log. For the same event reposted or re-filmed, fuzzy-match on date/location/description and flag "possible duplicate of case #X." Where it's the same event from a *different angle*, attach it as additional media to the existing case (a multi-angle case is stronger, not spam).
- **Thorough *within* vetted sources.** When pointed at an approved source, the bot follows the material wherever it leads inside that source rather than fetching only the exact page named. Point it at the Italian material (the academic community, CUN reports, the Vatican Observatory's astronomers) and it mines the whole vein, not one page. This is the "not limited to what we told it" behavior, and it's safe because it stays on vetted ground.
- **Source discovery (propose, don't roam).** The bot must not be turned loose to crawl the open web deciding what's credible; that burns money, drags in junk, and erodes the vetted-source promise the whole site rests on. Instead it runs a discovery lane: it notices when an unapproved outlet keeps getting cited, or an uncovered country or institution keeps recurring (e.g. a thinly-covered African commission, or an Italian research body), and surfaces a card in the review inbox: "this source keeps appearing, add it?" You approve or reject. The list grows from what the material reveals, but every addition passes your judgment. Discovery can propose into **either** section, since a credible new source may belong to Cases (sighting reports) or Science (researchers and institutions). The Vatican Observatory is the test case: approve the real observatory as a science source, reject the "Vatican hides aliens" blogs that name-drop it. No fixed rule makes that call; you do.
- **Runs manually first** (an admin "fetch now" button), on a schedule only later. Source discovery is the most advanced piece and belongs in Phase 3+, not launch; early on, a hand-built source list plus thoroughness within it gets most of the value.
- **Also writes the weekly newsletter** by pulling "what got added this week," drafting a roundup to house style, and routing it for human review before sending.

---

## 7. Admin & moderation

- **Review inbox** — the newsroom wire: candidate cards (bot finds, user submissions, uploads) with source, suggested classification, and the synthesized account. Actions: *Add to site* (one-click = human approval), *Review first* (full editor), *Dismiss*. Uploads and comments never bypass it.
- **Roles:**

| Capability | Admin | Mod |
|---|---|---|
| Review inbox: approve/edit/dismiss | ✓ | ✓ |
| Edit a published case/entry | ✓ | ✓ |
| Delete comments · ban users | ✓ | ✓ |
| Unpublish questionable content | ✓ | ✓ |
| Permanently delete a case | ✓ | — |
| Add/remove moderators | ✓ | — |
| Toggle features (comments, uploads, ads, accounts) | ✓ | — |
| Edit the about page · site & ad settings | ✓ | — |

- **Admin-editable about page**, plus feature toggles and an ad-config panel.
- **A "fetch now" trigger** for the bot and a **social drafts panel** (Section 14).
- **Export / backup button** bundles all content into a downloadable `.zip` for local safekeeping, on top of Supabase's automatic backups.

---

## 8. Public experience

**Home page:** prominent search; two auto-scrolling strips (latest additions + random from the database) with pause-on-hover and manual arrows; a dedicated **"recently acknowledged by governments"** spotlight (the credibility hook); **browse-by-continent** tiles or map; a **running counter** ("1,240 cases across 6 continents"); an optional hand-curated **featured classic case**.

**Case page:** video(s) at the top as a **multi-angle gallery** (primary clip leads, additional angles below, each labeled by source); adaptive embed (16:9 for full/gov video, 9:16 for TikTok/Shorts); classification badge; the recap account; a clear **"Read the full PDF report here"** button linking to the source; attributed sources; an honest **"What do you think?"** prompt.

**Science page:** images instead of video (each credited); plain-language body; a *status* label (candidate/confirmed/…); source paper + announcement links.

**Everywhere:** responsive layout; accessibility (screen-reader support, keyboard nav, accessible embeds); a helpful **404 / case-not-found** page; **social share buttons open to everyone** (no login needed) with **Open Graph tags** so links unfurl with title + thumbnail.

---

## 9. Accounts & community

Read freely without an account. Accounts unlock participation, and only ship when they *do* something:

- **Auth:** email + password with a verification link, plus Google social login (add Facebook later, more app-review hoops). Handled by Supabase.
- **Watchlist** to bookmark cases and follow a category/region; the first real reason to sign up, and near-zero moderation cost.
- **Comments** behind a flag, off at launch. Post-moderation, with a **report button** feeding the mod queue. Ship *with* accounts, since a login that does nothing is pointless.
- **Uploads** much later, behind a flag, on a bigger server; every upload routes through the review inbox and requires an ownership-attesting agreement.
- **Profiles** as a someday, seeded by the watchlist.

---

## 10. Content sources

Full detail in `seed-source-list.md`. In brief:
- **UFO Tier A (official):** the U.S. AARO/PURSUE disclosure releases (the freshest, richest vein, top monitoring priority), U.S. National Archives, FBI/CIA reading rooms, **NASA**, the UK National Archives (MoD files), **France's GEIPAN** (official + non-English), and the Project Blue Book Archive.
- **UFO Tier B (databases):** NUFORC (large, self-submitted, neutral), MUFON (field-investigated, partly gated).
- **UFO Tier C (video):** YouTube via API; TikTok manual.
- **Science Tier A:** NASA (Astrobiology, Exoplanet Archive, JWST/TESS/Roman), ESA, the SETI Institute, ESO, JAXA, Breakthrough Listen, Harvard's Galileo Project; journals (Nature, Science) as source-of-record.
- **Rules:** government/public-domain content is safe to use and link; databases and journals give facts + links, never copied text; news outlets are *leads only, never content*; embed video, never re-host; credit all imagery.

---

## 11. Monetization

- **Ad slots designed in, toggled off.** Reserved spaces on the sides and page bottom, never popups, never invasive. Built now, switched on whenever.
- **How ads work:** join an ad network (Google AdSense to start), get approved, paste their code into the slots; they auto-fill and pay per view/click. Needs live traffic + a privacy policy. Pays little until there's an audience, hence the toggle.
- **Later:** direct sponsorships (space/UFO/documentary brands), a supporter/donation tier, and the YouTube channel.

---

## 12. Email

Two kinds, treated differently:
- **Transactional** (verification links, watchlist alerts): opt-out; **batch watchlist alerts into a digest**, don't fire one per update.
- **Marketing** (weekly newsletter): **opt-in**, with a working unsubscribe link and consent records (GDPR).
- Both go through a proper **transactional email service** for deliverability, not the server's default mailer.
- The **bot drafts the newsletter**; a human reviews before it sends. Fits a cheap start (free tiers scale with volume).

---

## 13. Discovery, SEO & growth

- **SEO baked in from day one** (cheap now, painful later): clean URLs, page titles + meta descriptions, Open Graph tags, an XML sitemap, fast load times, mobile-friendliness.
- **Community seeding:** UFO subreddits, Discords, and social, by *genuinely contributing* strong entries into real discussions, not spamming links.
- **Social presence:** the daily hand-off flow (Section 14).
- **Audience feedback:** the analytics + view counts (Section 15) tell you what's working so you spend your time on it.
- **YouTube channel** (later): submitted footage + narrated accounts, reusing the synthesis engine.

---

## 14. Social distribution (generate & hand-off)

A lightweight way to keep a daily social presence without API friction or account risk. The bot drafts, you post.

- **No API, no stored passwords, no Meta app review.** A human posts in a normal logged-in browser, so there's nothing for the platforms to detect and nothing to break when they change their layout. This is deliberately *not* browser-automation (which risks account suspension and credential theft).
- **The admin "social" panel holds the day's drafts.** For each: ready-to-post text tuned per platform (short + link for X, caption-style for Instagram/Facebook), a copy button, the prepped image/clip to download, and a link that opens the platform's posting page in a new tab. You log in yourself if needed, paste, attach, post. Three platforms, a few minutes, once or twice a day.
- **Small refinements that keep the habit alive:** the bot drafts a few candidate posts per item (so a flat suggestion isn't a dead end) and queues a day or two ahead (so a missed day doesn't dry the pipeline). "Most read this week" (Section 15) is a good source for what to feature.
- **Always link back to the case page** with a strong teaser; never re-host someone's video onto your own accounts. Keeps you clean on creator rights and drives traffic to the site.
- **Timing:** no API friction means this can come early, as soon as there's content worth sharing, not Phase 5. Schema: `social_drafts`; no tokens, no auto-post flag, because nothing posts automatically.

---

## 15. Audience monitor & analytics

Two questions, two tools.

- **How the site is doing** (visits, traffic sources, popular pages, countries): a **privacy-friendly analytics service** (Plausible or Fathom), not Google Analytics. No cookie banner needed (simpler GDPR for a worldwide audience), light on page speed, clean dashboard. One snippet and done. This shows whether Reddit or search is sending people.
- **What to write more of:** a **`view_count` on each case and science entry**, stored in your own database and surfaced as a sortable **"most read"** list in the admin panel. This is the number that changes behavior; it tells you which cases, categories, and sources actually pull readers (maybe military-witness cases outperform blurry-light clips, or the South American cases are quietly your most-read).
- **Honest caution:** read view counts as "what's resonating," not "what to chase." Sensational junk spikes hardest, and your edge is being the credible archive that doesn't chase it. The trust is the asset; views are just the instrument reading.
- **Bonus:** "most read this week" feeds the newsletter and the social drafts for free.

---

## 16. Legal & safety

Documents needed (starter templates can be scaffolded; **not legal advice**; the starred ones warrant a real lawyer before you rely on them, especially at monetization/upload):
- Privacy policy (required once ads or accounts exist) ★ (GDPR, worldwide audience)
- Terms of use
- DMCA / takedown process (for embeds, submissions, and later uploads)
- Cookie consent (EU; largely avoided by choosing privacy-friendly analytics, but still needed once ads run)
- Upload agreement with an ownership-attesting clause ★ (only when uploads go live; a submitter can only license content they actually own)

**Safety hygiene:** rate-limit the submit and signup forms, spam protection on accounts, a fast takedown path for anything hosted, and the `.zip` export as a personal backup.

---

## 17. Phased roadmap

**Phase 0 — Planning.** Done (this document + the three companions).

**Phase 1 — MVP, read-only.** Supabase schema live. Public site: browse by category, case page with embedded video, search, responsive layout, SEO basics, view counts + a privacy-friendly analytics snippet, 404 + about pages. Hand-enter 15–20 flagship cases (Rendlesham, Varginha, Ariel School, recent US footage). Legal pages up. Sharing open to all.

**Phase 2 — Admin, science & social.** Build the admin panel + review inbox with a manual "fetch now." Add filters, tags, the Science section, and the social hand-off panel (an early growth tool, since it needs no API).

**Phase 3 — The bot & accounts.** Pipeline on a schedule with the ingestion memory (seen-links log, backfill/watch modes) and dedup. Accounts + watchlist (+ watchlist-alert emails). Moderator panel.

**Phase 4 — Community & revenue.** Comments (post-moderation + report button). Weekly newsletter. Turn on ad slots.

**Phase 5 — Scale.** Video uploads (bigger server, upload agreement). YouTube channel. Profiles/community. Direct sponsorships. Optional true API auto-posting on X.

---

## 18. Feature-flag summary (ship OFF, enable when ready)

`comments_on` · `accounts_on` · `uploads_on` · `ads_on` · `newsletter_on`, all default off. Launch is a clean, read-only, zero-moderation archive; each capability switches on when there's audience or moderation capacity to match. (Analytics, view counts, the social hand-off panel, and the ingestion memory aren't flagged, since none of them post or expose anything publicly on their own.)

---

## 19. Internationalization (language-ready now, switch on later)

Same philosophy as every other heavy feature: architect for it from day one, turn it on when there's an audience. Retrofitting language support later is painful; planning for it is cheap.

- **Target languages:** English, French, Portuguese, Spanish. French pairs with the GEIPAN sourcing; Portuguese and Spanish unlock the South American cases (Varginha and the wider wave) for the large audiences nearest those events.
- **Interface first, content second.** The UI strings (nav, buttons, category names, badges) are a finite set translated once, and frameworks like Next.js swap them by language automatically. Content is the bigger job and is done selectively, never "everything in every language."
- **The bot writes all four at generation time.** It produces the grounded English account first (where attribution and classification live), then the French, Portuguese, and Spanish versions from that same English text in one pass, so all four say exactly the same thing.
- **Review and honesty:** the operator fully reviews the language they read (English); the other three carry a small "auto-translated" label. A bad translation that turns a *candidate* into *confirmed*, or drops an attribution, is a credibility risk, so the templates' rules must survive translation.
- **Schema:** a case (or science entry) is one record with several language versions attached via `case_translations` / `science_translations` (Section 5), not one record per language.
- **SEO upside:** a French version of a case ranks for French searches, so this is a real growth lever, but only when done well. Thin, unreviewed machine pages get penalized, which is why it's a "later, carefully" feature, not a launch one.

---

## 20. Compute & cost

The architecture is built to run for pocket change. The one real variable cost is AI writing, and you meter it yourself.

**Where the work runs.** The bot runs on your PC, not the web server. Your machine (Radeon 6800 XT, 16GB VRAM; the old i5 barely matters, since the GPU does the model work) runs the model locally through Ollama and handles fetching, transcribing, formatting, and link-placement, then writes finished rows into Supabase over the internet. The live site only displays what it's given, so it stays free. Heavy-and-occasional work lives on hardware you own; easy-and-constant work lives on the cheap host. Content flows while your PC is running the bot; the site serves 24/7 regardless. (If you ever want hands-off always-on discovery, that's a much later reason to rent a small cheap always-on box, not a GPU server.)

**The model is a swappable setting, chosen by stakes:**
- **Llama 3.1 8B locally (free)** is the main drafting engine for the backfill. It fits comfortably in 16GB with headroom (run a higher-precision build, or step up to a stronger ~12–14B multilingual model later). Always feed it the source text and tell it to use only what's there; grounded-in-provided-text is where 8B is most reliable and least likely to invent details.
- **A paid API (cheap, optional)** is the quality escape hatch for the two spots 8B is weakest and you can't fully self-review: the French/Portuguese/Spanish translations, and any flagship case wanting top-tier polish. Cost stays tiny because it's only the trickle, never the whole archive.
- Work in **stages, not one kitchen-sink prompt** (draft English → translate → classify); that's where 8B holds together best.
- AMD note: Ollama supports the 6800 XT, but more advanced tooling sometimes assumes Nvidia and needs an extra config step.

**The staged backfill.** The first population is the one genuinely heavy job: thousands of existing cases across four languages, hours-to-days of local grinding. Do it locally, in staged batches, cleanest highest-value sources first (government releases, GEIPAN, flagship cases), written straight into Supabase and reviewed in human-sized chunks. Launch as soon as the first strong batch is in, then work through the rest over days or weeks. This spreads cost, catches quality problems on a small batch before repeating them ten thousand times, and keeps the review gate from drowning. After the backfill, ongoing cost is a trickle (only the few new cases each week).

**What it costs, plainly:**
- Hosting (Vercel/Netlify): free tier.
- Database (Supabase): free tier holds a text database comfortably.
- Analytics: free, or a few dollars a month.
- Email: free tier covers thousands of sends.
- Domain: about $10–15 a year, the one guaranteed cost.
- AI writing: **$0 on your own GPU** for the local backfill; optional small pay-per-use only if you route translations or flagship cases through a paid API.
- Later, only if you succeed: paid tiers when free ones fill (a good problem), and video hosting (the one genuinely pricey feature, parked in Phase 5 behind a flag).

Bottom line: launch and run for roughly the price of a domain, with the heavy AI writing done free on hardware you already own and paid AI used only where quality demands it.

---

## 21. First three build steps

1. **Create a free Supabase project** and stand up the `cases`, `categories`, `media`, and `sources` tables from Section 5.
2. **Hand-enter three flagship cases** (Rendlesham, Varginha, a recent US Navy clip) directly, to feel the data model before any front-end exists.
3. **Open `D:\Git\Websites\UFO` in Claude Code** and build the Phase-1 read-only site against that database, one screen at a time, case page first, since it's the atom.

---

*Companion documents: `editorial-template.md`, `science-template.md`, `seed-source-list.md`. This blueprint is living; refine it as real cases and real traffic teach you where the edges are, but never loosen the editorial soul in Section 2.*
