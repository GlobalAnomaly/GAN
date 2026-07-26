# Source registry

Every place we can look for material, and what stands between us and using it.

This is the working checklist. It eventually becomes the `sources_registry`
table, so the columns here mirror the fields that table needs:
`licence`, `attribution_required`, `may_publish_narrative`.

**Status key**

| Mark | Meaning |
|---|---|
| ✅ | Verified, usable, licence understood |
| ⚠️ | Usable with a named condition |
| ❓ | **Licence not yet checked.** Assume nothing |
| ✋ | Needs written permission before publishing |
| ❌ | Do not use |

**The standing rule for all of them:** ingest facts, write our own prose, credit
the source. Facts are not copyrightable; other people's sentences are. Where a
source's terms forbid redistribution, that governs the *narrative text*, and the
`may_publish_narrative` flag on each row is what stops publishing code from ever
serving it.

---

## A. Public domain: take freely

US federal works. No permission needed, attribution to NARA where asked.

| Source | Holds | Status | Next action |
|---|---|---|---|
| [NARA UAP Record Collection](https://www.archives.gov/research/topics/uaps) | Record Group 615, created by the 2024 NDAA, still receiving records. **Bulk catalog downloads.** "Can be republished with attribution to NARA" | ✅ | **Now first.** GEIPAN turned out to need permission, so this is the head of the queue |
| Project Blue Book | 12,618 cases, 701 unidentified, 1947-1969, at NARA | ✅ | **The first map dataset.** Scanned microfilm, so it needs extraction and geocoding rather than an Excel read |
| CIA UFO collection | Declassified reading-room documents | ✅ | Fetcher |
| FBI Vault UFO files | Declassified files | ✅ | Fetcher |
| AARO | 64 official DoD videos with poster frames, case resolution PDFs | ✅ | Scoped in session 1, URL shapes verified |
| [Wikidata](https://www.wikidata.org/) | Dates and coordinates for notable incidents | ✅ CC0 | Cheap win for coordinates |
| [Chronicling America](https://chroniclingamerica.loc.gov/) | Library of Congress newspapers to 1963, full text, **has an API** | ✅ | Enrichment for pre-1963 US cases. Nobody uses this systematically |

## B. Government, non-US: permissive but verify each

Most will be fine. None may be assumed.

| Source | Holds | Status | Next action |
|---|---|---|---|
| [GEIPAN](https://www.cnes-geipan.fr/fr/recherche/cas) (France) | 3,368 cases, downloadable Excel with coordinates, own A/B/C/D classification | ✋ **Checked, and restrictive.** See the note below | **Not** the first ingest target. Needs written permission from CNES |
| [UK National Archives](https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/postwar/ufo-reports/) | 209 files, ~52,000 pages, **~11,000 sighting reports**, PDFs | ❓ | Confirm Open Government Licence. Crown copyright normally is |
| Arquivo Nacional + FAB (Brazil) | ~4,500 documents, 1952-2016, five tranches | ❓ | Pairs with Portuguese. Varginha |
| Library and Archives Canada | UFO files | ❓ | |
| National Archives of Australia | UFO files | ❓ | |
| NZ Defence Force | UFO files | ❓ | |
| National Archives of India | UFO files | ❓ | |
| Spain, declassified Air Force | Expedientes, released 1990s | ❓ | |
| Danish Air Force archive | | ❓ | |
| Italian Air Force OVNI archive | | ❓ | |
| National Diet Library (Japan) | | ❓ | |

### GEIPAN: checked 27 July 2026, and the earlier expectation was wrong

I expected Licence Ouverte 2.0 on the French open-data default. **It is not.** Their
own terms:

> les droits de (i) reproduire, représenter, adapter et/ou traduire,
> (ii) **extraire**, ou (iii) de créer tout travail dérivé de tout ou partie du
> site Internet et/ou de contenus y afférent, sont formellement et strictement
> interdits en dehors du cadre strictement limité à l'exception de copie privée ou
> à visée éducative.

"Tous droits réservés © CNES", and **`extraire` named explicitly**, which is the
verb for what an ingest pipeline does.

**The educational exception does not cover us**, tempting as it reads. `À visée
éducative` points at Code de la propriété intellectuelle L.122-5 3° e), which is
tied to illustration within *teaching and research activities*, excludes
recreational purposes, and is understood to cover educational establishments. It is
not inherited by any site with an informative mission. Its pairing with "copie
privée" signals the intended scale: a person copying a page, not a pipeline taking
3,368 structured cases.

**Keeping that section free does not fix it either**, though it is the right
commitment and the strongest sentence in any request we send. A free section inside
a site carrying ads and memberships does not make the site non-commercial, and
"free" is not "educational" in the sense the exception means.

**And the facts-are-free argument fails here specifically.** Against NUFORC, Feist
carried the day. France implements the **EU database right**, which protects
extraction of a substantial part of a database even where the contents are not
themselves protectable. This is exactly the caveat flagged as surviving Feist, and
GEIPAN is where it bites.

**Required attribution, verbatim, for if permission arrives** (they specify the
exact wording):

> ce document est extrait du site Internet GEIPAN. Informations protégées - Tous
> droits réservés © CNES (+ année publication)

**Consequence: the first map dataset is Blue Book and NARA, not GEIPAN.** US
federal public domain, nobody to ask. Costs more work, since Blue Book is scanned
microfilm needing extraction and geocoding rather than an Excel read, but it has no
permission gate and it makes the map the *official* record, which was the more
differentiated version anyway.

One point not to overstate: GEIPAN publishes bulk Excel exports for download, and
it is fair to wonder what those are for if not reuse. But `extraire` is listed
explicitly, so do not build on that reading without asking.

## C. Police FOI, worldwide

Two different jobs, not one.

**Harvest** where forces publish disclosure logs by default: UK (Essex, Devon &
Cornwall, and every other force), Ireland, Australia, New Zealand, Canada,
Sweden (1766 law, oldest in the world). Bot work. **Do this first.**

**Request** where FOI exists but nothing is published proactively: much of the
EU, India (RTI), Brazil (LAI), Mexico. Operator time, one at a time.

Police call logs are frequently exempt even where FOI is strong. UK releases are
typically OGL. **This is the most original idea on the list: nobody has
aggregated it.** Also the worst-shaped work: no central index, inconsistent
formats, releases that appear and vanish.

## D. Private organisations: ask before publishing

Same position as NUFORC. Copyrighted, and mostly volunteer non-profits, which
means a free, unpaywalled, multilingual archive that credits them is an
attractive pitch. **Worth a batch email.**

| Source | Region | Note |
|---|---|---|
| **AFU** (Archives for the Unexplained) | Nordic + 10 countries | ✋ **Approach first, and it is the largest prize on this list.** See the section below |
| UFO-Sweden | Sweden | ✋ Linked to AFU |
| NICAP historical archive | US | ✋ Major historical collection |
| Project 1947 | US | ✋ Early-wave research |
| CISU / CisuCat | Italy | ✋ |
| CENAP | Germany | ✋ |
| GEP | Germany | ✋ |
| DEGUFO | Germany | ✋ |
| EuroUFO | Europe | ✋ Network of researchers |
| COBEPS | Belgium | ✋ Modern database |
| SOBEPS | Belgium | ✋ **Belgian wave archive.** High value: our Petit-Rechain case |
| Belgisch UFO-meldpunt | Belgium | ✋ |
| UFO Meldpunt Nederland | Netherlands | ✋ |
| SUFOI (Skandinavisk UFO Information) | Denmark | ✋ |
| FUFORA / Suomen Ufotutkijat | Finland | ✋ |
| UFO-Norge | Norway | ✋ |
| Project Hessdalen | Norway | ✋ **Instrumented observations.** Scientifically the strongest on this list |
| CIFA | Spain | ✋ |
| Kosmopoisk | Russia | ✋ |
| UFOCN | China | ✋ |
| UFO Afrinews | Africa | ✋ Rare African coverage. Fills a real geographic gap |
| International UFO Laboratory | Japan | ✋ |
| JP-UAP Database | Japan | ✋ |
| Korean UFO organisations | South Korea | ✋ To be identified individually |
| BETA-UFO | Indonesia | ✋ |

### AFU: not one archive, an aggregator across ten countries

Checked 27 July 2026 via [their report-files page](https://www.afu.se/collections/report-files/).
Roughly **50,000+ cases**, an order of magnitude more than GEIPAN, and it closes
the Nordic gap entirely.

| Country | Holdings |
|---|---|
| Sweden | UFO-Sweden/AFU **20,000+ cases**, 17,000 in their ScanCat database |
| Sweden | **Swedish Defence files, 3,000 reports, 1933 to present** |
| Denmark | SUFOI, **12,000 cases from 1958** |
| Norway | National Archives documents plus SUFOI Norwegian records |
| Finland | Suomen Ufotutkijat plus Finnish National Archives microfilm |
| UK | BUFORA, **10,000 digitised pages**, plus Contact International |
| Spain | CEI, 120 large folders with cross-indexes |
| Austria | Luis Schoenherr: 22 needle card files, 3,000+ CODAB records |
| Russia | ~1,200 reports in 14 folders, Moscow 1993 |
| US | Project Blue Book microfilms (~120), UFOCAT copies |
| **Zimbabwe** | **Cynthia Hind's investigative files, digitised** |

**Two entries matter more than their size suggests.**

Cynthia Hind is the primary investigator behind **Ariel School**, already one of the
nine seed cases. That is a direct upgrade to content we publish today, not a
speculative addition.

The **Swedish Defence files from 1933** are government records. They may be
separately reachable through Sweden's public-access principle, which dates from
1766 and is the oldest in the world, rather than through AFU's own terms.

**Access is by request.** No public downloads and no copyright statement on that
page, which from a preservation institution usually means "ask" rather than "no".
**Each subdivision needs checking individually**: Norwegian National Archives
material, Finnish National Archives microfilm and AFU's own holdings will not share
one set of terms, and the government-sourced parts may be freer than the rest.

Mostly text, which suits us: our value is written accounts, and text is what the
bot reads to produce them.

## E. Acquired, in `UFO Data/`

| Source | Holds | Status |
|---|---|---|
| **UFOCAT 2023** | 320,412 records, 238,499 cases, 91.7% coordinates, citation on every record, **36,424 hand-built same-event clusters** | ✋ **Purchase grants use, not publication.** A natural reading of "we bought it" is that it is ours to publish; the codebook says otherwise in as many words: "Permission to reproduce or publish material extracted from UFOCAT 2023 must be obtained in writing from the author or publisher." So: ingest, match, validate and research freely, and publish nothing extracted until CUFOS answers. This is why the loader refuses to set may_publish_facts. Also drop LEVEL 0 and 1 (92 records) and suppress names on LEVEL 2 |
| **NUFORC set** | 147,890 records with full narratives, shape, duration, observers, characteristics, NUFORC's own `Explanation` | ⚠️ Terms forbid distribution and commercial exploitation. **Provenance unconfirmed** (supplied by NUFORC, or a third-party mirror?). Facts-only use makes this near-moot; still worth knowing |

### How restricted sources are actually used: the finding-aid rule

Settled 27 July 2026, and it resolves most of the licensing worry by design rather
than by argument.

**A restricted source is a lead, never a publication.** UFOCAT tells us an event
happened at a place on a date and hands us the citation to the book that covered
it (`SOURCE`, `AUTHOR` and `PAGEVOL` on 94-100% of records). We then find that
event in public material, write our own account, and cite what *we* obtained. Using
an index to know where to look is ordinary journalism, and it is what UFOCAT's own
codebook calls the thing: a bibliography.

**The database enforces this, so nobody has to remember it.** From migration 002:

```sql
create policy "clusters are public when a report is" on event_clusters
  for select using (exists (
    select 1 from reports r
    join sources_registry s on s.id = r.source_id
    where r.cluster_id = event_clusters.id and s.may_publish_facts));
```

A cluster surfaces publicly **only** once it holds at least one report from a
publishable source. So:

- UFOCAT and NUFORC stay `may_publish_facts = false` **permanently**. Not pending,
  not provisional. That is their role.
- A UFOCAT-only cluster is invisible. It is a research lead sitting in the queue.
- When enrichment finds the event in Chronicling America, a NARA file, a newspaper
  or a police log, that source is ingested as publishable and the cluster surfaces
  **on its own**.
- Individual restricted reports stay invisible even inside a visible cluster.

**The scale argument is why this works rather than being a technicality.** A cluster
with 30+ reports means 30+ separate publications already covered that event.
Socorro has 55. Those are books, journals and official reports, all public. Finding
them independently is not a search problem when the bibliography names the page.

**Displayed counts must reflect only what a reader can check.** This is why
`event_clusters` carries two pairs of counts. `report_count` and `source_count`
cover everything and drive the work queue; `citable_report_count` and
`citable_source_count` count only publishable reports and are the only pair ever
shown. Announcing 55 sources when three are reachable fails our own standard before
it fails anyone's terms.

**The one thing that would break all of it** is a bot that copies narratives. It
cannot: narratives are written to a separate local file by the extractor, and there
is no column to hold them in the database that serves the site.

### Why NUFORC and GEIPAN are not the same problem

Easy to collapse into one "they said no", and the difference decides what is
possible with each.

**NUFORC is US.** No EU database right applies, and *Feist* means the underlying
facts genuinely carry no copyright. Their restriction bites on **how the data is
obtained** (their terms forbid scraping and distribution) rather than on the facts
themselves. So facts in, our own prose out, is a sound method there, and the
remaining question is provenance of the copy we hold.

**GEIPAN is French.** France implements the **sui generis database right**, which
protects extraction of a substantial part of a database *even where the contents
carry no copyright at all*. The facts-are-free argument therefore does not reach
it. Same words on the tin, different law underneath.

**How much GEIPAN would even add, measured rather than assumed.** UFOCAT already
holds **10,864 French records**, 9,750 with coordinates, across 4,132 distinct
locations, and **2,190 of them fall in 1977 or later**, which is GEIPAN's entire
era. **389 of those records cite GEIPAN itself as their source**, so CUFOS already
incorporated part of it. The rest comes through the published French literature:
1,453 records from Vallee, 1,211 from *Lumieres Dans La Nuit*, 327 from Aime
Michel, 254 from Poher.

Against GEIPAN's 3,368 total cases, the marginal gain is far smaller than it looks.
Their genuinely unique contribution is the official A/B/C/D disposition and the
investigation files, and we do not want their classifications anyway: our
classification is our own reasoning, shown so a reader can disagree with it.

## F. Public video platforms

What people film daily and no authority ever acknowledges. Legitimate material,
and **the highest-risk source on this entire list.** Everything below exists to
make it usable without it costing us the credibility the rest is built on.

| Platform | Discovery | Status |
|---|---|---|
| **YouTube** | Data API, **already built** (`src/lib/bot/youtube.ts`, quota accounting, `normalize-url.ts`, `has_captions` badge) | ✅ Channel walking at 1 unit per 50 videos, 10,000 units/day free. Search costs 100 per 50, so it is for finding channels, not videos |
| **YouTube Shorts** | Same API. `MediaType` already has `short` | ✅ **Where TikTok material ends up anyway.** Viral clips get reposted to Shorts, to compilation channels and to local news, usually with more context than the original carried. This is the practical answer to TikTok, at no risk |
| **TikTok** | **Closed.** Research API is restricted to verified academic and public-interest institutions and explicitly closed to commercial users. No free commercial access to public data through official channels | ⚠️ **Embed-only, and not pursued.** oEmbed works for a URL we already hold, so clips arrive by submission or by hand |

**On searching TikTok by hand:** browsing it as a normal user and pasting an
interesting link into the admin panel is fine, and it puts human editorial
judgement in the loop, which beats a keyword scraper. **Automating that browsing
is not.** Their terms prohibit automated access, doing it with a session cookie
makes it the operator's account carrying the breach, and their bot detection is
stronger than YouTube's, which already defeated a Playwright attempt in session 1.

The deciding argument is not the risk of a restricted account. It is that
`docs/source-registry.md` is about to ask NUFORC, CUFOS and two dozen volunteer
archives to trust us with their material, largely on the grounds that we are the
careful ones. That argument does not survive being caught scraping.

**Also worth having, and free:** Reddit's API is permissive, and r/UFOs carries
clips *plus* people arguing about whether it is a balloon, a drone or a render.
That argument is more useful to us than a comment thread of emoji, because it
frequently contains the debunk.

### Three risks specific to platform video

**1. AI-generated video is now the default suspicion, not an edge case.** By 2026
an anonymous clip with no named uploader and no corroboration has close to zero
evidentiary value. A case built on something that later turns out to be generated
is the single most damaging error this site could make, because it would confirm
exactly what a sceptical reader already suspects about a UFO archive. Provenance
before weight: a named account with history, an original upload rather than a
repost, and ideally something outside the clip that agrees with it.

**2. Reposts.** The same clip circulates across dozens of accounts, each looking
like a fresh sighting. `normalize-url.ts` collapses URL *shapes*, not
re-uploads, so it will not catch this. Perceptual hashing of frames is the real
answer and is later work. Until then the cross-reference engine treats
same-date-same-place video candidates as merge suspects, not new cases.

**3. Clips die.** Accounts vanish, videos get removed, and a case whose only
support was a dead embed silently becomes an unsupported claim. This is why the
site embeds rather than re-hosts (creator keeps their work, we avoid the
copyright question entirely) and why the rule below matters more here than
anywhere else.

### The rule

**A clip alone never justifies a case.** It attaches to a case that already has
independent grounding, or it waits in the queue. This is session 1's "merge, do
not duplicate" doing its real job: a second Rendlesham video is another angle on
an existing case, not a rival entry, and an anonymous clip of lights is not a
case at all until something else supports it.

Classification already has the right home for this material: `unverified`. With
the derived media markers, "unverified plus has video" is exactly the *maybe*
tier, and it needs no new field to express.

## G. Reference and special cases

| Source | Status | Note |
|---|---|---|
| [UFOSINT Explorer](https://ufosint.com/) | ⚠️ **Local research aid only, never published** | 418k geocoded dots with quality scores show where clusters are, so our digging points at the right places. Its export has no narrative, no media URLs and no source links, so it cannot feed articles |
| [UAP Public Archive](https://uap-archives.org/) | ❓ | Multilingual mirror of US records |
| [UFOFiles.app](https://ufofiles.app/) | ❓ | Closest conceptual competitor. Watch, do not ingest |
| UAPDb | ❓ | **Not sightings.** An index of books, podcasts, news. Useful for the articles section |
| Internet Archive UFO collections | ❓ **Per item** | IA is a host, not a licensor. Blue Book scans there are public domain; other uploads may not be |
| Digital Vatican Library | ❓ | Celestial anomalies in ecclesiastical records. Images typically non-commercial. **Articles section only, never map pins.** See the retro-diagnosis guardrail in Work.md |
| [Trove](https://trove.nla.gov.au/) | ❓ | Australian newspapers. Chronicling America's counterpart |

## H. Do not use

| Source | Why |
|---|---|
| MUFON | Archive is membership-gated. States all narratives and media are "the sole property of MUFON and the submitting party" |
| UFO Stalker | **The same organisation.** It is MUFON's map front end, not a separate source |
| Enigma Labs | Venture-backed commercial competitor, proprietary |

---

## Emails to send

| To | About | Status |
|---|---|---|
| NUFORC (CTO) | Permission for the 159,320 records, and confirmation of how the local set was obtained. Their terms forbid taking; nothing forbids asking | Not sent |
| CUFOS / Donald A. Johnson, Sun River Research Institute, `infocenter@cufos.org` | Written permission for UFOCAT. Their stated criterion is researchers who "make their findings freely available", which describes this site | Not sent |
| AFU (Sweden) | First of the batch to the private organisations | Not sent |
| CNES / GEIPAN | Permission to ingest and display the 3,368 case files. Their terms forbid extraction outright, so this is a request rather than a formality. Lead with what they will care about: free, ungated, credited in their required wording, and their A/B/C/D classification kept as theirs rather than translated into ours | Not sent |

**The pitch, for all of them:** free, no paywall, no membership gate on cases,
four languages, every claim attributed, and the source credited on every record.
That is a materially different proposition from the commercial scrapers those
terms were written against.
