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
| [NARA UAP Record Collection](https://www.archives.gov/research/topics/uaps) | Record Group 615, created by the 2024 NDAA, still receiving records. **Bulk catalog downloads.** "Can be republished with attribution to NARA" | ✅ | Ingest. Highest priority after GEIPAN |
| Project Blue Book | 12,618 cases, 701 unidentified, 1947-1969, at NARA | ✅ | Scanned microfilm: needs extraction + geocoding |
| CIA UFO collection | Declassified reading-room documents | ✅ | Fetcher |
| FBI Vault UFO files | Declassified files | ✅ | Fetcher |
| AARO | 64 official DoD videos with poster frames, case resolution PDFs | ✅ | Scoped in session 1, URL shapes verified |
| [Wikidata](https://www.wikidata.org/) | Dates and coordinates for notable incidents | ✅ CC0 | Cheap win for coordinates |
| [Chronicling America](https://chroniclingamerica.loc.gov/) | Library of Congress newspapers to 1963, full text, **has an API** | ✅ | Enrichment for pre-1963 US cases. Nobody uses this systematically |

## B. Government, non-US: permissive but verify each

Most will be fine. None may be assumed.

| Source | Holds | Status | Next action |
|---|---|---|---|
| [GEIPAN](https://www.cnes-geipan.fr/fr/recherche/cas) (France) | 3,368 cases, **downloadable Excel with coordinates**, own A/B/C/D classification | ❓ | **Check mentions légales.** French public data defaults to Licence Ouverte 2.0 under Decree 2017-638 (commercial reuse with attribution), but confirm. **First ingest target** |
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
| **AFU** (Archives for the Unexplained) | Sweden | ✋ **Approach first.** An actual preservation institution, not a club. Preservation-minded bodies say yes to being mirrored and credited |
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

## E. Acquired, in `UFO Data/`

| Source | Holds | Status |
|---|---|---|
| **UFOCAT 2023** | 320,412 records, 238,499 cases, 91.7% coordinates, citation on every record, **36,424 hand-built same-event clusters** | ✋ Copyright CUFOS. Codebook requires **written permission to reproduce or publish extracted material**. Use freely, publish nothing extracted without asking. Drop LEVEL 0 and 1 (92 records), suppress names on LEVEL 2 |
| **NUFORC set** | 147,890 records with full narratives, shape, duration, observers, characteristics, NUFORC's own `Explanation` | ⚠️ Terms forbid distribution and commercial exploitation. **Provenance unconfirmed** (supplied by NUFORC, or a third-party mirror?). Facts-only use makes this near-moot; still worth knowing |

## F. Reference and special cases

| Source | Status | Note |
|---|---|---|
| [UFOSINT Explorer](https://ufosint.com/) | ⚠️ **Local research aid only, never published** | 418k geocoded dots with quality scores show where clusters are, so our digging points at the right places. Its export has no narrative, no media URLs and no source links, so it cannot feed articles |
| [UAP Public Archive](https://uap-archives.org/) | ❓ | Multilingual mirror of US records |
| [UFOFiles.app](https://ufofiles.app/) | ❓ | Closest conceptual competitor. Watch, do not ingest |
| UAPDb | ❓ | **Not sightings.** An index of books, podcasts, news. Useful for the articles section |
| Internet Archive UFO collections | ❓ **Per item** | IA is a host, not a licensor. Blue Book scans there are public domain; other uploads may not be |
| Digital Vatican Library | ❓ | Celestial anomalies in ecclesiastical records. Images typically non-commercial. **Articles section only, never map pins.** See the retro-diagnosis guardrail in Work.md |
| [Trove](https://trove.nla.gov.au/) | ❓ | Australian newspapers. Chronicling America's counterpart |

## G. Do not use

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

**The pitch, for all of them:** free, no paywall, no membership gate on cases,
four languages, every claim attributed, and the source credited on every record.
That is a materially different proposition from the commercial scrapers those
terms were written against.
