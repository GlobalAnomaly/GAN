/**
 * Resolving dates out of source text, in code rather than in the model.
 *
 * The NewsNation video on the Las Vegas 2023 case says "It's been one year
 * since a Las Vegas family claims something crashed in their backyard", and
 * we already hand the runner the video's publication date of 25 April 2024.
 * The event is therefore around April 2023. That is a subtraction, and small
 * models are unreliable at subtraction, so the draft said the date was
 * "established as last year", which is meaningless to a reader who cannot see
 * when the video was posted.
 *
 * Two rules run through everything here.
 *
 * **Nothing is invented.** Every result carries the wording it came from, so
 * the dossier can state the derivation rather than assert a bare date. A
 * reader, and a reviewer, can see that April 2023 came from "one year since"
 * plus a publication date, not from somewhere unexplained.
 *
 * **Precision degrades honestly.** "One year since" is a rounded phrase and
 * the event could sit anywhere in a several month window, so it yields a year
 * and never a day. Overstating precision is the same defect as inventing a
 * detail: it tells the reader we know something we do not.
 */

export type DatePrecision = "day" | "month" | "year";

export interface ResolvedDate {
  /** ISO date. Coarser precisions use 1 January or the 1st, by convention. */
  value: string;
  precision: DatePrecision;
  /** The wording this came from, quoted, for the dossier fact. */
  basis: string;
  /** True when arithmetic against the publication date was involved. */
  derived: boolean;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function iso(year: number, month = 1, day = 1): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.toLowerCase()) + 1;
}

/** Parses a count that may be written as a word or a digit. */
function count(token: string): number | null {
  const word = NUMBER_WORDS[token.toLowerCase()];
  if (word !== undefined) return word;
  const digits = Number.parseInt(token, 10);
  return Number.isFinite(digits) ? digits : null;
}

/**
 * Finds every date the text establishes, relative or absolute.
 *
 * Returns all of them rather than picking one. Choosing between competing
 * dates is the dossier's job, where corroboration across sources is visible;
 * doing it here would throw away the evidence that decision needs.
 */
export function resolveDates(text: string, publishedAt: string): ResolvedDate[] {
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return [];

  const pubYear = published.getUTCFullYear();
  const pubMonth = published.getUTCMonth() + 1;
  const pubDay = published.getUTCDate();

  const found: ResolvedDate[] = [];
  const add = (r: ResolvedDate) => {
    // An event cannot be reported before it happens. A parse that lands after
    // the publication date is a misreading, not a scoop.
    if (r.value > iso(pubYear, pubMonth, pubDay)) return;
    if (!found.some((f) => f.value === r.value && f.precision === r.precision)) {
      found.push(r);
    }
  };

  // --- Absolute dates, strongest first ------------------------------------

  // 30 April 2023 / April 30, 2023 / April 30th 2023
  const dmy = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b,?\s+(\d{4})\b/gi;
  for (const m of text.matchAll(dmy)) {
    add({
      value: iso(Number(m[3]), monthIndex(m[2]), Number(m[1])),
      precision: "day",
      basis: m[0],
      derived: false,
    });
  }

  const mdy = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b,?\s+(\d{4})\b/gi;
  for (const m of text.matchAll(mdy)) {
    add({
      value: iso(Number(m[3]), monthIndex(m[1]), Number(m[2])),
      precision: "day",
      basis: m[0],
      derived: false,
    });
  }

  // ISO, and the slashed forms that appear in titles: (04/30/23)
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    add({
      value: iso(Number(m[1]), Number(m[2]), Number(m[3])),
      precision: "day",
      basis: m[0],
      derived: false,
    });
  }
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/g)) {
    const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    const month = Number(m[1]);
    const day = Number(m[2]);
    // Month-first is the US convention and this material is US-heavy, but a
    // value above 12 in the first position settles it either way.
    if (month <= 12 && day <= 31) {
      add({ value: iso(year, month, day), precision: "day", basis: m[0], derived: false });
    }
  }

  // Month and year with no day.
  const my = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/gi;
  for (const m of text.matchAll(my)) {
    add({
      value: iso(Number(m[2]), monthIndex(m[1])),
      precision: "month",
      basis: m[0],
      derived: false,
    });
  }

  // A day and month with no year at all. The most recent occurrence at or
  // before publication is the only reading that does not require the video to
  // predate the event. KENS 5 posted "around midnight on April 30" in June
  // 2023, which is April 2023 and cannot be April 2024.
  const dayMonthNoYear = /\bon\s+(?:(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?)\b(?!,?\s*\d{4})/gi;
  for (const m of text.matchAll(dayMonthNoYear)) {
    const month = monthIndex(m[2] ?? m[3]);
    const day = Number(m[1] ?? m[4]);
    if (!month || !day) continue;
    const year = iso(pubYear, month, day) <= iso(pubYear, pubMonth, pubDay)
      ? pubYear
      : pubYear - 1;
    add({
      value: iso(year, month, day),
      precision: "day",
      basis: `${m[0]}, read as ${year} because the video was published ${publishedAt.slice(0, 10)}`,
      derived: true,
    });
  }

  // --- Relative expressions -----------------------------------------------

  // "It's been one year since", "two years after", "3 years ago".
  const yearsBack = /\b(?:been\s+)?(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\s+years?\s+(?:since|ago|after|earlier|before)\b/gi;
  for (const m of text.matchAll(yearsBack)) {
    const n = count(m[1]);
    if (n === null) continue;
    add({
      // Year precision on purpose. "One year since" is rounded, so the event
      // could sit months either side, and a month or a day here would claim
      // an exactness the phrase does not carry.
      value: iso(pubYear - n),
      precision: "year",
      basis: `"${m[0].trim()}", against a publication date of ${publishedAt.slice(0, 10)}`,
      derived: true,
    });
  }

  const monthsBack = /\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\s+months?\s+(?:since|ago|after|earlier|before)\b/gi;
  for (const m of text.matchAll(monthsBack)) {
    const n = count(m[1]);
    if (n === null) continue;
    const total = pubYear * 12 + (pubMonth - 1) - n;
    add({
      value: iso(Math.floor(total / 12), (total % 12) + 1),
      precision: "month",
      basis: `"${m[0].trim()}", against a publication date of ${publishedAt.slice(0, 10)}`,
      derived: true,
    });
  }

  if (/\blast\s+year\b/i.test(text)) {
    add({
      value: iso(pubYear - 1),
      precision: "year",
      basis: `"last year", against a publication date of ${publishedAt.slice(0, 10)}`,
      derived: true,
    });
  }

  // A bare four digit year, last, so a fuller parse of the same date wins.
  // Restricted to the range this archive covers, which keeps it off view
  // counts, subscriber numbers and street addresses.
  for (const m of text.matchAll(/\b(18\d{2}|19\d{2}|20[0-4]\d)\b/g)) {
    add({ value: iso(Number(m[1])), precision: "year", basis: m[0], derived: false });
  }

  return found;
}

/**
 * The single best reading, or null.
 *
 * Prefers a stated date over a derived one, then the more precise. A source
 * that gives the date outright beats arithmetic every time, and the archive
 * would rather say "April 2023" than a wrong 30 April.
 */
export function bestDate(dates: ResolvedDate[]): ResolvedDate | null {
  if (dates.length === 0) return null;
  const rank: Record<DatePrecision, number> = { day: 3, month: 2, year: 1 };
  return [...dates].sort((a, b) => {
    if (a.derived !== b.derived) return a.derived ? 1 : -1;
    const byPrecision = rank[b.precision] - rank[a.precision];
    if (byPrecision !== 0) return byPrecision;
    return a.value.localeCompare(b.value);
  })[0];
}
