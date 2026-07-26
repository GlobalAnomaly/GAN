/**
 * The English dictionary, and the shape every other language must satisfy.
 *
 * `Dictionary` is derived from this object, so adding a key here turns every
 * other language into a type error until it is filled in. That is the point:
 * a missing string should stop the build rather than render as a blank space or
 * silently fall back to English in the middle of a French sentence.
 *
 * The editorial rules apply to every string in every language: sentence case,
 * no em dashes, no stock phrasing. A translation that reads like machine output
 * costs us the same credibility as an English sentence that does.
 */

export const en = {
  nav: {
    cases: "Cases",
    science: "Science",
    browse: "Browse",
    about: "About",
    search: "Search",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
  },

  support: {
    /** Nav label. Never "Support": on a nav bar that reads as a help desk. */
    nav: "Buy me a coffee",
    footer: "Buy me a coffee",
    footerLead:
      "Free to read, and staying that way. If it is useful to you, you can help cover what it costs to run.",
  },

  language: {
    label: "Language",
    /** Shown in the case switcher, where the choice applies to the account. */
    readIn: "Read in",
    machineNotice:
      "This version was translated automatically. The English version is the reference.",
  },

  footer: {
    tagline:
      "An open archive. Every account is written from sourced material, every claim is attributed, and what remains unknown is said plainly.",
    about: "About and our standards",
    submit: "Send us something",
    privacy: "Privacy",
    terms: "Terms",
    takedown: "Takedown requests",
    mediaNote:
      "Video remains hosted by its original platform and is embedded here under each platform's player. Documents link to their source.",
    contact: "Contact us at",
  },

  classification: {
    acknowledged: "Acknowledged",
    unverified: "Unverified",
    likely_explained: "Likely explained",
    debunked: "Debunked",
  },

  classificationDefinition: {
    acknowledged:
      "A government or official body has released or confirmed the material and offered no conventional explanation.",
    unverified:
      "A public sighting with no official validation and no established conventional explanation.",
    likely_explained:
      "A plausible conventional cause is indicated but not conclusively proven.",
    debunked:
      "A conventional cause is conclusively established, or the material is demonstrably fabricated.",
  },

  continent: {
    north_america: "North America",
    south_america: "South America",
    africa: "Africa",
    europe: "Europe",
    asia: "Asia",
    oceania: "Oceania",
    unknown: "Unknown location",
  },

  filters: {
    all: "All",
    classification: "Classification",
    continent: "Continent",
    alsoFiltering: "Also filtering by",
    clear: "Clear the filters",
  },

  cases: {
    title: "Cases",
    intro:
      "Every entry states what the evidence shows, who said what, and what remains unknown. The label on each case is our reasoning, shown so you can disagree with it.",
    empty:
      "Nothing matches that combination yet. The archive is still being filled in, so an empty shelf here is a gap rather than an answer.",
    countOne: "case",
    countOther: "cases",
  },

  search: {
    title: "Search",
    hint: "Try a place, a year, a witness, or a word from the account. Both cases and science entries are searched.",
    empty:
      "Nothing here matches that. The archive is still small, so a miss usually means we have not covered it yet rather than that it is not real.",
    browseInstead: "Browse all cases instead",
    resultOne: "result",
    resultOther: "results",
    cases: "Cases",
    science: "Science",
  },
};

/**
 * Every other language is checked against this shape.
 *
 * Deliberately not `as const`: that would freeze each value to its literal
 * English string, and every translation would then fail to satisfy the type for
 * the absurd reason that "Cas" is not "Cases". Widening to `string` keeps the
 * check where it belongs, on the keys.
 */
export type Dictionary = typeof en;
