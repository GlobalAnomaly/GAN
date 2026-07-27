/**
 * Who a channel is, and therefore what its words can establish.
 *
 * This is the "channel registry" the work log has been asking for, and it
 * turns out to be load-bearing for accuracy rather than merely useful for
 * relevance scoring. The dossier will not let a claim-only source describe
 * footage, so the tier attached to a channel decides whether "what the footage
 * shows" can be written at all. Getting a tier wrong in the generous
 * direction is how an uploader's sales pitch becomes a description of
 * evidence.
 *
 * Hence the default. An unknown channel is `uploader`, never `press`. The
 * cost of being too cautious is a claim correctly attributed to whoever made
 * it. The cost of being too generous is the site asserting something in its
 * own voice, which is the one failure the whole project is built to avoid.
 *
 * A news organisation posting a Short is genuinely different from an
 * anonymous account posting one, which is why `SourceType` already carries
 * `news` beside `witness`. This is that distinction made checkable.
 */

import type { SourceTier } from "@/lib/bot/dossier";

export interface ChannelEntry {
  tier: SourceTier;
  /** Why this tier, so a future reviewer can disagree with a reason. */
  note?: string;
}

/**
 * Channels we have actually seen and classified by hand.
 *
 * Keys are matched case-insensitively against the channel title with
 * punctuation and spacing removed, so "KENS 5: Your San Antonio News Source"
 * and "kens5" resolve alike.
 */
export const CHANNEL_REGISTRY: Record<string, ChannelEntry> = {
  // Broadcast news. These caption for accessibility compliance, which also
  // makes them the subset where transcripts are worth pursuing.
  newsnation: { tier: "press", note: "US cable news network" },
  kens5yoursanantonionewssource: { tier: "press", note: "CBS affiliate, San Antonio" },
  kens5: { tier: "press", note: "CBS affiliate, San Antonio" },
  "8newsnowlasvegas": { tier: "press", note: "KLAS, CBS affiliate, Las Vegas" },
  "8newsnow": { tier: "press", note: "KLAS, CBS affiliate, Las Vegas" },

  // Independent investigators and aggregators. Often careful, sometimes very
  // careful, but they are publishing their own conclusions rather than
  // reporting under an editorial standard we can point at.
  ufoseekers: { tier: "uploader", note: "independent investigators, Pahrump NV" },
  ufouapnewsanddatabase: { tier: "uploader", note: "aggregator channel" },
  thatufopodcast: { tier: "uploader", note: "interview podcast" },
  dagoobshow: { tier: "uploader", note: "reposts clips" },

  // Official. Nothing here yet, and that is the gap the AARO fetcher fills.
};

/** Strips a channel title to a stable lookup key. */
export function channelKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Patterns that identify a broadcast news outlet with reasonable confidence.
 *
 * Deliberately narrow. "News" on its own is useless here, because this field
 * is full of channels called things like "UFO / UAP - news and database" which
 * are one person aggregating links. What actually distinguishes a broadcaster
 * is a call sign or a network name, so that is what these match.
 */
const PRESS_PATTERNS: RegExp[] = [
  /\b(abc|nbc|cbs|fox|cnn|bbc|itv|sky|npr|pbs)\s*\d{1,2}\b/i,
  /\b(k|w)[a-z]{2,3}\s*(tv|news)\b/i,
  /\b\d{1,2}\s*(news|on your side|eyewitness news|action news)\b/i,
  /\b(reuters|associated press|the guardian|new york times|washington post|le monde|el pais|folha)\b/i,
  /\b(newsnation|newsweek|npr news|euronews|france 24|al jazeera)\b/i,
  // Major broadcasters carrying no call sign or channel number. The pattern
  // above requires a digit, so "BBC" and "Sky News" fell through to uploader
  // and a BBC Roswell documentary ranked near the bottom of the draft queue.
  /\b(bbc|itv news|sky news|channel 4 news|pbs newshour|cbc news|abc news|nbc news|cbs news|dw news)\b/i,
];

const OFFICIAL_PATTERNS: RegExp[] = [
  /\b(aaro|nasa|noaa|faa|dod|department of defen[cs]e|us air force|royal air force)\b/i,
  /\b(cnes|geipan|esa|jaxa)\b/i,
  /\.(gov|mil)\b/i,
];

/**
 * The tier for a channel.
 *
 * Registry first, then the narrow patterns, then the cautious default. An
 * explicit hand classification always wins, because the patterns exist to
 * cover channels nobody has looked at yet, not to override the ones we have.
 */
export function tierForChannel(channelName: string | undefined | null): SourceTier {
  if (!channelName || !channelName.trim()) return "anonymous";

  const entry = CHANNEL_REGISTRY[channelKey(channelName)];
  if (entry) return entry.tier;

  if (OFFICIAL_PATTERNS.some((p) => p.test(channelName))) return "official";
  if (PRESS_PATTERNS.some((p) => p.test(channelName))) return "press";

  return "uploader";
}

/** Whether we have classified this channel by hand rather than by pattern. */
export function isKnownChannel(channelName: string | undefined | null): boolean {
  return Boolean(channelName && CHANNEL_REGISTRY[channelKey(channelName)]);
}
