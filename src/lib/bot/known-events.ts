/**
 * The reference of well-documented events.
 *
 * This exists to fix a specific failure: a documentary about Roswell that
 * never says "1947" made the bot write "the exact date is unknown". That is
 * technically true of the video and absurd about the event, and it makes the
 * archive look ignorant rather than careful.
 *
 * The fix is NOT to let the model fill gaps from memory. A model recalling a
 * date from its weights is the same mechanism as a model inventing an
 * altitude: unverifiable, confident, and wrong often enough to matter.
 *
 * Instead the bot looks the event up here and passes the established facts in
 * as *source material*, alongside the video. The model still only writes what
 * it was given. What changed is what it was given.
 *
 * Every entry carries the authority its facts rest on, so a date used this way
 * can be attributed on the case page rather than asserted.
 *
 * Dates are recorded only as precisely as they are actually established. A
 * wave that ran over weeks gets month precision, not a made-up day.
 */

import type { Continent, DatePrecision } from "@/lib/types";

export interface KnownEvent {
  id: string;
  name: string;
  /**
   * Distinctive phrases that identify this event in a title or description.
   * They must be specific enough not to fire by accident: "phoenix lights",
   * never "phoenix". A false match injects the wrong date into an account,
   * which is worse than injecting nothing.
   */
  aliases: string[];
  date: string | null;
  date_precision: DatePrecision;
  /** How the date should read in prose, when a plain date would mislead. */
  date_note?: string;
  location_name: string | null;
  country: string | null;
  continent: Continent;
  /** Where these facts come from. Shown to the reviewer and citable. */
  authority: string;
  /**
   * Official archives holding primary material on this event. Attached to the
   * case automatically, so a major event carries its documents from the first
   * draft instead of waiting for someone to remember them.
   *
   * Roots rather than deep links, on purpose: catalogue URLs move and a dead
   * deep link on a flagship case is worse than a live search page. Deep links
   * get added by hand once verified.
   */
  documents?: { title: string; url: string }[];
  /**
   * The slug of this archive's canonical case for the event, once one exists.
   * When a new video matches an event that already has a case, it belongs on
   * that case as another angle, not in a second entry competing with it.
   */
  canonical_slug?: string;
}

export const KNOWN_EVENTS: KnownEvent[] = [
  {
    id: "battle-of-los-angeles",
    name: "The Battle of Los Angeles",
    aliases: ["battle of los angeles", "battle of la"],
    date: "1942-02-24",
    date_precision: "day",
    date_note: "the night of 24 to 25 February 1942",
    location_name: "Los Angeles, California",
    country: "United States",
    continent: "north_america",
    authority: "US Army and Navy records, US National Archives",
  },
  {
    id: "kenneth-arnold",
    name: "The Kenneth Arnold sighting",
    aliases: ["kenneth arnold", "arnold sighting", "mount rainier sighting"],
    date: "1947-06-24",
    date_precision: "day",
    location_name: "near Mount Rainier, Washington",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files, US National Archives",
  },
  {
    id: "roswell",
    name: "The Roswell incident",
    aliases: ["roswell"],
    date: "1947-07-01",
    date_precision: "month",
    date_note:
      "early July 1947. The Roswell Army Air Field press release was issued on 8 July 1947",
    location_name: "near Roswell, New Mexico",
    country: "United States",
    continent: "north_america",
    authority:
      "Roswell Army Air Field press release and the later USAF reports, US National Archives",
    documents: [
      {
        title: "US National Archives catalog",
        url: "https://catalog.archives.gov/",
      },
      { title: "The FBI Records Vault", url: "https://vault.fbi.gov/" },
    ],
  },
  {
    id: "mantell",
    name: "The Mantell incident",
    aliases: ["mantell"],
    date: "1948-01-07",
    date_precision: "day",
    location_name: "near Fort Knox, Kentucky",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files",
  },
  {
    id: "chiles-whitted",
    name: "The Chiles-Whitted encounter",
    aliases: ["chiles-whitted", "chiles whitted"],
    date: "1948-07-24",
    date_precision: "day",
    location_name: "near Montgomery, Alabama",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files",
  },
  {
    id: "lubbock-lights",
    name: "The Lubbock Lights",
    aliases: ["lubbock lights"],
    date: "1951-08-01",
    date_precision: "month",
    date_note: "beginning in late August 1951 and recurring over several weeks",
    location_name: "Lubbock, Texas",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files",
  },
  {
    id: "washington-1952",
    name: "The 1952 Washington DC sightings",
    aliases: [
      "washington flap",
      "washington merry-go-round",
      "1952 washington",
      "washington dc ufo",
    ],
    date: "1952-07-01",
    date_precision: "month",
    date_note: "over two weekends in July 1952",
    location_name: "Washington, DC",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files, CIA reading room",
  },
  {
    id: "bentwaters-lakenheath",
    name: "The Lakenheath-Bentwaters radar case",
    aliases: ["lakenheath bentwaters", "bentwaters lakenheath", "lakenheath radar"],
    date: "1956-08-13",
    date_precision: "day",
    location_name: "RAF Lakenheath and RAF Bentwaters, Suffolk",
    country: "United Kingdom",
    continent: "europe",
    authority: "USAF Project Blue Book files and UK Ministry of Defence records",
  },
  {
    id: "levelland",
    name: "The Levelland sightings",
    aliases: ["levelland"],
    date: "1957-11-02",
    date_precision: "day",
    location_name: "Levelland, Texas",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files",
  },
  {
    id: "hill-abduction",
    name: "The Betty and Barney Hill case",
    aliases: ["betty and barney hill", "barney hill", "hill abduction"],
    date: "1961-09-19",
    date_precision: "day",
    location_name: "White Mountains, New Hampshire",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files and contemporary press",
  },
  {
    id: "socorro",
    name: "The Socorro landing",
    aliases: ["socorro", "lonnie zamora", "zamora sighting"],
    date: "1964-04-24",
    date_precision: "day",
    location_name: "Socorro, New Mexico",
    country: "United States",
    continent: "north_america",
    authority: "USAF Project Blue Book files",
  },
  {
    id: "kecksburg",
    name: "The Kecksburg incident",
    aliases: ["kecksburg"],
    date: "1965-12-09",
    date_precision: "day",
    location_name: "Kecksburg, Pennsylvania",
    country: "United States",
    continent: "north_america",
    authority: "NASA records released under FOIA and contemporary press",
  },
  {
    id: "westall",
    name: "The Westall incident",
    aliases: ["westall"],
    date: "1966-04-06",
    date_precision: "day",
    location_name: "Westall, Melbourne, Victoria",
    country: "Australia",
    continent: "oceania",
    authority: "Contemporary Australian press and witness records",
    canonical_slug: "westall-1966",
  },
  {
    id: "shag-harbour",
    name: "The Shag Harbour incident",
    aliases: ["shag harbour", "shag harbor"],
    date: "1967-10-04",
    date_precision: "day",
    location_name: "Shag Harbour, Nova Scotia",
    country: "Canada",
    continent: "north_america",
    authority: "Royal Canadian Mounted Police and Canadian government records",
  },
  {
    id: "travis-walton",
    name: "The Travis Walton case",
    aliases: ["travis walton"],
    date: "1975-11-05",
    date_precision: "day",
    location_name: "Apache-Sitgreaves National Forest, Arizona",
    country: "United States",
    continent: "north_america",
    authority: "Contemporary police reports and press",
  },
  {
    id: "tehran-1976",
    name: "The Tehran F-4 incident",
    aliases: ["tehran ufo", "iranian f-4", "tehran incident", "imperial iranian air force"],
    date: "1976-09-19",
    date_precision: "day",
    location_name: "Tehran",
    country: "Iran",
    continent: "asia",
    authority: "Declassified US Defense Intelligence Agency report",
    canonical_slug: "tehran-1976",
    documents: [
      { title: "US National Archives catalog", url: "https://catalog.archives.gov/" },
    ],
  },
  {
    id: "colares",
    name: "The Colares wave",
    aliases: ["colares", "operacao prato", "operation saucer"],
    date: "1977-08-01",
    date_precision: "month",
    date_note: "over several months from August 1977",
    location_name: "Colares, ParÃ¡",
    country: "Brazil",
    continent: "south_america",
    authority: "Brazilian Air Force files released as OperaÃ§Ã£o Prato",
  },
  {
    id: "rendlesham",
    name: "The Rendlesham Forest incident",
    aliases: ["rendlesham"],
    date: "1980-12-26",
    date_precision: "day",
    date_note: "over three nights from 26 December 1980",
    location_name: "Rendlesham Forest, Suffolk",
    country: "United Kingdom",
    continent: "europe",
    authority: "UK Ministry of Defence files, The National Archives",
    canonical_slug: "rendlesham-forest-1980",
    documents: [
      {
        title: "Ministry of Defence UFO files",
        url: "https://www.nationalarchives.gov.uk/ufos/",
      },
    ],
  },
  {
    id: "cash-landrum",
    name: "The Cash-Landrum incident",
    aliases: ["cash-landrum", "cash landrum"],
    date: "1980-12-29",
    date_precision: "day",
    location_name: "near Dayton, Texas",
    country: "United States",
    continent: "north_america",
    authority: "US federal court records and contemporary press",
  },
  {
    id: "trans-en-provence",
    name: "The Trans-en-Provence case",
    aliases: ["trans-en-provence", "trans en provence"],
    date: "1981-01-08",
    date_precision: "day",
    location_name: "Trans-en-Provence, Var",
    country: "France",
    continent: "europe",
    authority: "GEIPAN investigation file, CNES",
    canonical_slug: "trans-en-provence-1981",
    documents: [
      { title: "GEIPAN case archive", url: "https://www.geipan.fr/" },
    ],
  },
  {
    id: "hessdalen",
    name: "The Hessdalen lights",
    aliases: ["hessdalen"],
    date: "1981-12-01",
    date_precision: "year",
    date_note: "recurring since late 1981 and still under study",
    location_name: "Hessdalen valley",
    country: "Norway",
    continent: "europe",
    authority: "Project Hessdalen, Ã˜stfold University College",
  },
  {
    id: "jal-1628",
    name: "The Japan Airlines flight 1628 encounter",
    aliases: ["jal 1628", "japan airlines 1628", "jal1628"],
    date: "1986-11-17",
    date_precision: "day",
    location_name: "over Alaska",
    country: "United States",
    continent: "north_america",
    authority: "US Federal Aviation Administration records",
  },
  {
    id: "belgian-wave",
    name: "The Belgian UFO wave",
    aliases: ["belgian wave", "belgian ufo wave", "petit-rechain", "petit rechain"],
    date: "1989-11-01",
    date_precision: "month",
    date_note: "from November 1989 through 1990",
    location_name: "across Belgium",
    country: "Belgium",
    continent: "europe",
    authority: "Belgian Air Force statements and SOBEPS records",
    canonical_slug: "petit-rechain-1990",
  },
  {
    id: "ariel-school",
    name: "The Ariel School encounter",
    aliases: ["ariel school", "ruwa zimbabwe"],
    date: "1994-09-16",
    date_precision: "day",
    location_name: "Ariel School, Ruwa",
    country: "Zimbabwe",
    continent: "africa",
    authority: "Filmed witness interviews recorded within days",
    canonical_slug: "ariel-school-1994",
  },
  {
    id: "varginha",
    name: "The Varginha incident",
    aliases: ["varginha"],
    date: "1996-01-20",
    date_precision: "day",
    location_name: "Varginha, Minas Gerais",
    country: "Brazil",
    continent: "south_america",
    authority: "Contemporary Brazilian press and witness testimony",
    canonical_slug: "varginha-1996",
  },
  {
    id: "phoenix-lights",
    name: "The Phoenix Lights",
    aliases: ["phoenix lights"],
    date: "1997-03-13",
    date_precision: "day",
    location_name: "Phoenix and across Arizona",
    country: "United States",
    continent: "north_america",
    authority: "Maryland Air National Guard statements and contemporary press",
    canonical_slug: "phoenix-lights-1997",
  },
  {
    id: "nimitz-2004",
    name: "The USS Nimitz encounter",
    // "flir1" alone is too short to be safe, and bare "flir" would fire on any
    // thermal-camera footage. The longer forms lose nothing: a video about
    // this encounter names Nimitz or Tic Tac somewhere.
    aliases: ["uss nimitz", "tic tac", "nimitz encounter", "flir1 video"],
    date: "2004-11-14",
    date_precision: "day",
    location_name: "Pacific Ocean, off southern California",
    country: "United States",
    continent: "north_america",
    authority: "US Department of Defense release of the FLIR1 video",
    canonical_slug: "uss-nimitz-2004",
    documents: [
      {
        title: "All-domain Anomaly Resolution Office (AARO)",
        url: "https://www.aaro.mil/",
      },
    ],
  },
  {
    id: "ohare-2006",
    name: "The O'Hare Airport sighting",
    aliases: ["o'hare ufo", "ohare ufo", "o'hare airport ufo"],
    date: "2006-11-07",
    date_precision: "day",
    location_name: "O'Hare International Airport, Chicago",
    country: "United States",
    continent: "north_america",
    authority: "US Federal Aviation Administration records",
  },
  {
    id: "stephenville",
    name: "The Stephenville sightings",
    aliases: ["stephenville"],
    date: "2008-01-08",
    date_precision: "day",
    location_name: "Stephenville, Texas",
    country: "United States",
    continent: "north_america",
    authority: "US Air Force statements and contemporary press",
  },
  {
    id: "aguadilla",
    name: "The Aguadilla infrared footage",
    aliases: ["aguadilla"],
    date: "2013-04-25",
    date_precision: "day",
    location_name: "Aguadilla, Puerto Rico",
    country: "Puerto Rico",
    continent: "north_america",
    authority: "US Customs and Border Protection thermal footage",
  },
  {
    id: "chile-cefaa-2014",
    name: "The Chilean Navy helicopter footage",
    aliases: ["cefaa chile", "chilean navy ufo", "chile navy helicopter"],
    date: "2014-11-11",
    date_precision: "day",
    location_name: "off the coast near Santiago",
    country: "Chile",
    continent: "south_america",
    authority: "CEFAA, Chilean Directorate General of Civil Aviation",
  },
  {
    id: "gimbal-gofast",
    name: "The 2015 US Navy GIMBAL and GO FAST videos",
    aliases: ["gimbal", "go fast video", "gofast"],
    date: "2015-01-01",
    date_precision: "year",
    date_note: "recorded in 2015 and released by the Pentagon in 2020",
    location_name: "off the US east coast",
    country: "United States",
    continent: "north_america",
    authority: "US Department of Defense release",
  },
];

export interface EventMatch {
  event: KnownEvent;
  /** The alias that fired, so a reviewer can see why it matched. */
  matchedOn: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[â€™']/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ");
}

/**
 * Finds the event a piece of source material is about.
 *
 * Deliberately conservative. It returns the *longest* matching alias, because
 * a longer phrase is a more specific claim, and it returns nothing rather than
 * guessing. Injecting the wrong event's date is far worse than injecting none:
 * an honest "date unknown" is a small blemish, a confidently wrong date is a
 * factual error with our name on it.
 */
export function matchKnownEvent(...texts: string[]): EventMatch | null {
  const haystack = normalize(texts.filter(Boolean).join(" "));
  if (!haystack.trim()) return null;

  let best: EventMatch | null = null;

  for (const event of KNOWN_EVENTS) {
    for (const alias of event.aliases) {
      const needle = normalize(alias);
      if (!haystack.includes(needle)) continue;
      if (!best || needle.length > normalize(best.matchedOn).length) {
        best = { event, matchedOn: alias };
      }
    }
  }

  return best;
}

/**
 * Renders an event's established facts as text to hand the model alongside the
 * video, with its authority attached so the account can attribute rather than
 * assert.
 */
export function referenceBlock(match: EventMatch): string {
  const { event } = match;

  const dateLine = event.date_note
    ? event.date_note
    : event.date
      ? event.date_precision === "year"
        ? event.date.slice(0, 4)
        : event.date_precision === "month"
          ? event.date.slice(0, 7)
          : event.date
      : "not established";

  return [
    `ESTABLISHED FACTS ABOUT THIS EVENT, from the archive's own reference.`,
    `These are verified and may be used even though the video does not state them.`,
    ``,
    `Event: ${event.name}`,
    `Date: ${dateLine}`,
    `Location: ${[event.location_name, event.country].filter(Boolean).join(", ") || "not established"}`,
    `These facts are recorded on the authority of: ${event.authority}`,
  ].join("\n");
}
