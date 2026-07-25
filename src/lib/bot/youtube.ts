/**
 * YouTube Data API v3 client.
 *
 * This is how the archive gets video URLs at scale. Nothing here guesses a
 * video id: every id comes back from the API, which means it exists and its
 * title, channel, publish date and description come with it.
 *
 * QUOTA IS THE WHOLE DESIGN CONSTRAINT. A default API key gets 10,000 units a
 * day and the costs are wildly uneven:
 *
 *   search.list         100 units   50 videos   = 2 units per video
 *   playlistItems.list    1 unit    50 videos   = 0.02 units per video
 *   videos.list           1 unit    50 videos   = 0.02 units per video
 *
 * So search can reach about 5,000 videos a day and channel uploads can reach
 * roughly half a million. For a backfill of thousands of cases, walking a
 * channel's uploads playlist is not an optimisation, it is the only approach
 * that finishes. Search is for discovering *which* channels are worth walking.
 */

const API = "https://www.googleapis.com/youtube/v3";

export const QUOTA_COST = {
  search: 100,
  playlistItems: 1,
  videos: 1,
  channels: 1,
} as const;

/** Running total for the process, so a backfill can stop before it is cut off. */
export class QuotaTracker {
  used = 0;
  constructor(public readonly limit = 10_000) {}

  spend(cost: number, what: string) {
    if (this.used + cost > this.limit) {
      throw new Error(
        `YouTube quota would be exceeded: ${this.used}/${this.limit} used, ` +
          `${what} costs ${cost}. Resume tomorrow or use another key.`,
      );
    }
    this.used += cost;
  }

  get remaining() {
    return this.limit - this.used;
  }
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** Vertical video is a Short, and the case page frames it 9:16. */
  isShort: boolean;
  watchUrl: string;
  embedUrl: string;
  /** false when the uploader disabled embedding, so we must not use it. */
  embeddable: boolean;
  defaultLanguage: string | null;
}

interface FetchOpts {
  apiKey: string;
  quota?: QuotaTracker;
}

async function call<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  { apiKey, quota }: FetchOpts,
  cost: number,
): Promise<T> {
  quota?.spend(cost, path);

  const url = new URL(`${API}/${path}`);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    // Quota exhaustion is the one failure worth naming plainly, because it is
    // routine during a backfill and means "come back tomorrow", not "broken".
    if (res.status === 403 && body.includes("quotaExceeded")) {
      throw new Error(
        "YouTube API daily quota exhausted. The backfill can resume tomorrow " +
          "from the last saved cursor.",
      );
    }
    throw new Error(`YouTube API ${res.status} on ${path}: ${body.slice(0, 400)}`);
  }

  return res.json() as Promise<T>;
}

/** ISO 8601 durations (PT1M30S) into seconds. */
function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m;
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Number(s ?? 0)
  );
}

interface RawVideo {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
    thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
}

function toVideo(raw: RawVideo): YouTubeVideo {
  const sn = raw.snippet ?? {};
  const thumbs = sn.thumbnails ?? {};
  const best =
    thumbs.maxres ?? thumbs.standard ?? thumbs.high ?? thumbs.medium ?? thumbs.default;

  const duration = parseDuration(raw.contentDetails?.duration);

  // A vertical thumbnail, or a clip under a minute, is a Short in practice.
  // Worth getting right because it decides the aspect ratio on the case page.
  const t = thumbs.high ?? thumbs.medium ?? thumbs.default;
  const vertical = !!(t?.width && t?.height && t.height > t.width);

  return {
    videoId: raw.id,
    title: sn.title ?? "",
    description: sn.description ?? "",
    channelId: sn.channelId ?? "",
    channelTitle: sn.channelTitle ?? "",
    publishedAt: sn.publishedAt ?? "",
    thumbnailUrl: best?.url ?? null,
    durationSeconds: duration,
    isShort: vertical || (duration !== null && duration <= 60),
    watchUrl: `https://www.youtube.com/watch?v=${raw.id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${raw.id}`,
    embeddable: raw.status?.embeddable ?? true,
    defaultLanguage: sn.defaultLanguage ?? sn.defaultAudioLanguage ?? null,
  };
}

/**
 * Full metadata for up to 50 ids per call, at 1 unit. Always hydrate through
 * here rather than trusting search results: only this endpoint returns
 * duration and the embeddable flag, and an unembeddable video must not be
 * attached to a case.
 */
export async function getVideoDetails(
  ids: string[],
  opts: FetchOpts,
): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = [];

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await call<{ items?: RawVideo[] }>(
      "videos",
      { part: "snippet,contentDetails,status", id: batch.join(",") },
      opts,
      QUOTA_COST.videos,
    );
    out.push(...(data.items ?? []).map(toVideo));
  }

  return out;
}

/**
 * Search. Expensive at 100 units a call, so this is for finding material and
 * discovering channels, never for bulk backfill.
 */
export async function searchVideos(
  query: string,
  opts: FetchOpts & {
    publishedAfter?: string;
    maxResults?: number;
    order?: "date" | "relevance" | "viewCount";
    regionCode?: string;
    relevanceLanguage?: string;
  },
): Promise<YouTubeVideo[]> {
  const want = opts.maxResults ?? 50;
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < want) {
    const data = await call<{
      items?: { id?: { videoId?: string } }[];
      nextPageToken?: string;
    }>(
      "search",
      {
        part: "id",
        q: query,
        type: "video",
        maxResults: Math.min(50, want - ids.length),
        order: opts.order ?? "date",
        publishedAfter: opts.publishedAfter,
        regionCode: opts.regionCode,
        relevanceLanguage: opts.relevanceLanguage,
        pageToken,
      },
      opts,
      QUOTA_COST.search,
    );

    for (const it of data.items ?? []) {
      if (it.id?.videoId) ids.push(it.id.videoId);
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return getVideoDetails(ids, opts);
}

/**
 * Every channel's uploads live in a playlist whose id is the channel id with
 * the UC prefix swapped for UU. That playlist can be walked at 1 unit per 50
 * videos, which is what makes a full-history backfill affordable.
 */
export function uploadsPlaylistId(channelId: string): string {
  if (!channelId.startsWith("UC")) {
    throw new Error(`Expected a channel id starting with UC, got: ${channelId}`);
  }
  return `UU${channelId.slice(2)}`;
}

export async function resolveChannelId(
  handleOrId: string,
  opts: FetchOpts,
): Promise<{ channelId: string; title: string } | null> {
  if (handleOrId.startsWith("UC")) {
    const data = await call<{ items?: { id: string; snippet?: { title?: string } }[] }>(
      "channels",
      { part: "snippet", id: handleOrId },
      opts,
      QUOTA_COST.channels,
    );
    const item = data.items?.[0];
    return item ? { channelId: item.id, title: item.snippet?.title ?? "" } : null;
  }

  const handle = handleOrId.startsWith("@") ? handleOrId : `@${handleOrId}`;
  const data = await call<{ items?: { id: string; snippet?: { title?: string } }[] }>(
    "channels",
    { part: "snippet", forHandle: handle },
    opts,
    QUOTA_COST.channels,
  );
  const item = data.items?.[0];
  return item ? { channelId: item.id, title: item.snippet?.title ?? "" } : null;
}

/**
 * Walk a channel's uploads. `since` stops the walk once it reaches material
 * older than the source's last_checked timestamp, which is what turns a
 * backfill source into a watch source without a separate code path.
 */
export async function listChannelUploads(
  channelId: string,
  opts: FetchOpts & { since?: string; max?: number },
): Promise<YouTubeVideo[]> {
  const playlistId = uploadsPlaylistId(channelId);
  const max = opts.max ?? 500;

  const ids: string[] = [];
  let pageToken: string | undefined;
  let reachedOlder = false;

  while (ids.length < max && !reachedOlder) {
    const data = await call<{
      items?: {
        contentDetails?: { videoId?: string; videoPublishedAt?: string };
      }[];
      nextPageToken?: string;
    }>(
      "playlistItems",
      {
        part: "contentDetails",
        playlistId,
        maxResults: 50,
        pageToken,
      },
      opts,
      QUOTA_COST.playlistItems,
    );

    for (const it of data.items ?? []) {
      const id = it.contentDetails?.videoId;
      const at = it.contentDetails?.videoPublishedAt;
      if (!id) continue;

      // Uploads come back newest first, so the first item older than our
      // cursor means everything after it is older too.
      if (opts.since && at && at <= opts.since) {
        reachedOlder = true;
        break;
      }

      ids.push(id);
      if (ids.length >= max) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return getVideoDetails(ids, opts);
}
