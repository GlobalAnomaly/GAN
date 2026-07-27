/**
 * The researcher stage.
 *
 * This is the piece the pipeline never had. The first overnight run went fetch
 * then write, with nothing in between, so the model wrote from a YouTube
 * description and nothing else. A ten second search beat it, and that was the
 * honest verdict: we were comparing a search engine against a pipeline with no
 * search in it.
 *
 * What it does is narrow on purpose. It does not read, summarise or interpret.
 * It looks things up, and every fact it returns carries the source that
 * asserted it, so the writer receives evidence rather than conclusions and the
 * validator can check every sentence against something specific.
 *
 * **It refuses far more than it accepts, and that is the design.** Wikipedia's
 * search always returns something, and for the Las Vegas 2023 case that
 * something is Luxor Las Vegas. Attaching that to the account would put a
 * fabricated fact under a sourced entry, which is worse than the gap it fills.
 * Every lookup here is verification rather than retrieval: a phrase is not
 * assumed to be a place, it is looked up and accepted only if what comes back
 * confirms it.
 *
 * Ordering matters and is not an accident. Enrichment runs on a *cluster*
 * after matching has settled duplicates, never per record. Per record that is
 * a lookup for every video; per cluster it is one for every event; gated
 * behind relevance it is a few hundred. Same work, orders of magnitude apart.
 */

import {
  addFact,
  addUnresolved,
  factsOfKind,
  type Dossier,
  type DossierSource,
} from "@/lib/bot/dossier";
import { bestDate, resolveDates } from "@/lib/bot/relative-dates";
import {
  candidatePlaceNames,
  findArticle,
  resolvePlace,
  type Fetcher,
  type WikipediaPage,
} from "@/lib/bot/wikipedia";

export interface EnrichmentReport {
  /** Phrases tried as place names. Most are discarded, which is expected. */
  places_tried: string[];
  places_confirmed: string[];
  article_found: string | null;
  facts_added: number;
  /** Lookups attempted, so the cost of this stage is visible in the run log. */
  lookups: number;
}

export interface EnrichOptions {
  /** Injected in tests so nothing here touches the network. */
  fetcher?: Fetcher;
  /** Cap on lookups per cluster, because this is the slowest stage. */
  maxLookups?: number;
}

function wikipediaSource(page: WikipediaPage): DossierSource {
  return {
    name: `Wikipedia: ${page.title}`,
    url: page.url,
    // Reference tier, not press. Wikipedia is a starting point and a finding
    // aid, and it can establish a date or a place without ever being able to
    // say what a particular clip shows.
    tier: "reference",
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Looks up what the dossier does not yet establish.
 *
 * Only gaps are researched. A dossier that already has a corroborated date
 * does not need Wikipedia's, and spending a lookup to confirm what two sources
 * already agree on is the sort of busywork that makes a stage too slow to run.
 */
export async function enrichDossier(
  dossier: Dossier,
  /** The raw wording to mine for names, usually the clustered titles. */
  text: string,
  options: EnrichOptions = {},
): Promise<EnrichmentReport> {
  const { fetcher, maxLookups = 12 } = options;

  const report: EnrichmentReport = {
    places_tried: [],
    places_confirmed: [],
    article_found: null,
    facts_added: 0,
    lookups: 0,
  };

  // Checks before spending rather than after, so the reported count is the
  // number of lookups actually made and never overshoots the budget.
  const spend = () => {
    if (report.lookups >= maxLookups) return false;
    report.lookups += 1;
    return true;
  };

  // ---- Place names -------------------------------------------------------
  //
  // Runs only when the dossier has no location, which is the gap the Las Vegas
  // cluster still had after merging: every title said "Las Vegas" and nothing
  // had ever established it as a place rather than as words in a title.

  if (factsOfKind(dossier, "location").length === 0) {
    for (const name of candidatePlaceNames(text)) {
      if (!spend()) break;
      report.places_tried.push(name);

      let place: WikipediaPage | null = null;
      try {
        place = await resolvePlace(name, fetcher);
      } catch {
        // A lookup failing is not a reason to lose the rest of the run.
        continue;
      }
      if (!place) continue;

      report.places_confirmed.push(place.title);
      addFact(dossier, {
        kind: "location",
        statement:
          `The material names ${place.title}, which Wikipedia records as a real place ` +
          `at ${place.lat}, ${place.lng}.`,
        value: place.title.toLowerCase(),
        sources: [wikipediaSource(place)],
      });
      report.facts_added += 1;

      // Coordinates for a settlement are its centre, not where anything
      // happened. That distinction is why `coord_precision` exists, and
      // stating it here stops a later reader treating this as a fix.
      addUnresolved(
        dossier,
        `Where within ${place.title} this happened is not established. The coordinates above are the centre of the place, not the location of the event.`,
      );

      // One confirmed place is enough. Chasing every capitalised phrase spends
      // the budget and invites a second, contradictory location.
      break;
    }
  }

  // ---- The event itself --------------------------------------------------

  // Query construction, which turned out to matter more than anything else
  // here. Wikipedia's search is conjunctive, so a long noisy query matches
  // nothing at all rather than matching loosely: "The Rendlesham Forest
  // Incidents Gary Heseltine Interview" returns zero results, while
  // "Rendlesham Forest incident" returns the article as the top hit.
  //
  // A confirmed place is the strongest handle we have, so it leads. Failing
  // that, the shortest title stripped to its content words is a better query
  // than any title verbatim.
  const queries: string[] = [];

  for (const place of report.places_confirmed) {
    queries.push(`${place} incident`, `${place} UFO`);
  }

  const shortest = text
    .split(/[.\n]/)
    .map((t) =>
      t
        // Channel suffixes, episode numbers, hashtags and dates are noise that
        // makes a conjunctive search fail.
        .replace(/\|.*$/, "")
        .replace(/#\w+/g, "")
        .replace(/[^\p{L}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((t) => t.split(" ").length >= 2)
    .sort((a, b) => a.length - b.length)[0];

  if (shortest) queries.push(shortest.split(" ").slice(0, 6).join(" "));

  {
    let article: WikipediaPage | null = null;

    for (const attempt of [...new Set(queries)].slice(0, 3)) {
      if (!spend()) break;
      try {
        article = await findArticle(attempt, fetcher);
      } catch {
        article = null;
      }
      if (article) break;
    }

    if (article) {
      report.article_found = article.title;
      const source = wikipediaSource(article);

      addFact(dossier, {
        kind: "context",
        statement: `Wikipedia has an article on this event, "${article.title}", which opens: ${article.extract.slice(0, 700)}`,
        attributed_to: "Wikipedia",
        sources: [source],
      });
      report.facts_added += 1;

      // A date from the article's own text, resolved by the same tested code
      // that reads video descriptions rather than by the model.
      const date = bestDate(resolveDates(article.extract, new Date().toISOString()));
      if (date) {
        addFact(dossier, {
          kind: "event_date",
          statement: `Wikipedia's article gives the date as ${date.basis}.`,
          value: date.value,
          precision: date.precision,
          attributed_to: "Wikipedia",
          sources: [source],
        });
        report.facts_added += 1;
      }

      if (article.lat !== null && article.lng !== null) {
        addFact(dossier, {
          kind: "location",
          statement: `Wikipedia places ${article.title} at ${article.lat}, ${article.lng}.`,
          value: article.title.toLowerCase(),
          sources: [source],
        });
        report.facts_added += 1;
      }
    } else {
      // Worth recording. A reader of the finished page should be able to tell
      // the difference between a gap nobody looked at and a gap somebody
      // looked for and did not find.
      addUnresolved(
        dossier,
        "No encyclopedia article on this event was found, so nothing here is corroborated by a general reference work.",
      );
    }
  }

  return report;
}
