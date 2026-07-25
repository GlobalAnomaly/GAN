/**
 * URL normalization: the keystone of the ingestion memory.
 *
 * The same video reaches us through many different links. A share link, a
 * mobile link, an embed link, and a link with three tracking parameters are
 * all the same clip, and if they normalize differently the bot re-decides the
 * same footage over and over and the review inbox fills with duplicates.
 *
 * Every URL is reduced to a canonical form before it is written to or checked
 * against `ingestion_log`.
 */

/** Query parameters that never change which video you land on. */
const JUNK_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "si", // YouTube share tracking
  "feature",
  "ab_channel",
  "pp", // YouTube share payload
  "app",
  "fbclid",
  "gclid",
  "igshid",
  "ref",
  "ref_src",
  "s", // X/Twitter share
  "t", // start-time offset: same video, different seek point
  "start",
  "index",
  "list", // a video seen inside a playlist is still that video
  "_r",
  "is_from_webapp",
  "sender_device",
  "web_id",
];

export interface NormalizedUrl {
  /** The canonical key written to ingestion_log.normalized_url. */
  key: string;
  /** A clean, human-openable URL. */
  url: string;
  /** Platform, where we recognise one. */
  platform: "youtube" | "tiktok" | "instagram" | "x" | "other";
  /** Platform video id, when we could extract one. */
  videoId?: string;
}

function stripJunk(u: URL): URL {
  for (const p of JUNK_PARAMS) u.searchParams.delete(p);
  // Any remaining params get a stable order so two identical URLs that
  // happen to list their params differently still match.
  u.searchParams.sort();
  return u;
}

/**
 * Pulls the video id out of every YouTube URL shape in circulation:
 * watch?v=, youtu.be/, /shorts/, /embed/, /v/, and /live/.
 */
function youtubeId(u: URL): string | undefined {
  const host = u.hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id || undefined;
  }

  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return v;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["shorts", "embed", "v", "live"].includes(parts[0]))
      return parts[1];
  }

  return undefined;
}

function tiktokId(u: URL): string | undefined {
  // Canonical form is /@handle/video/1234567890.
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("video");
  if (i !== -1 && parts[i + 1]) return parts[i + 1];
  return undefined;
}

export function normalizeUrl(raw: string): NormalizedUrl {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    // Not a URL at all. Return something stable so the caller can still log it
    // rather than crashing a batch of 500 on one malformed row.
    const key = raw.trim().toLowerCase();
    return { key, url: raw.trim(), platform: "other" };
  }

  u.protocol = "https:";
  u.hash = "";
  stripJunk(u);

  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");

  const yt = youtubeId(u);
  if (yt) {
    return {
      key: `youtube:${yt}`,
      url: `https://www.youtube.com/watch?v=${yt}`,
      platform: "youtube",
      videoId: yt,
    };
  }

  if (host.endsWith("tiktok.com")) {
    const id = tiktokId(u);
    if (id) {
      return {
        key: `tiktok:${id}`,
        url: u.toString(),
        platform: "tiktok",
        videoId: id,
      };
    }
    // vm.tiktok.com/XXXX short links cannot be resolved without a network
    // round trip. Keyed as-is; the fetcher resolves and re-normalizes.
    return { key: `tiktok:${u.pathname}`, url: u.toString(), platform: "tiktok" };
  }

  if (host.endsWith("instagram.com")) {
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.findIndex((p) => ["p", "reel", "reels", "tv"].includes(p));
    if (i !== -1 && parts[i + 1])
      return {
        key: `instagram:${parts[i + 1]}`,
        url: `https://www.instagram.com/${parts[i]}/${parts[i + 1]}/`,
        platform: "instagram",
        videoId: parts[i + 1],
      };
  }

  if (host === "x.com" || host === "twitter.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("status");
    if (i !== -1 && parts[i + 1])
      return {
        key: `x:${parts[i + 1]}`,
        url: `https://x.com/${parts[0]}/status/${parts[i + 1]}`,
        platform: "x",
        videoId: parts[i + 1],
      };
  }

  // Everything else: host without www, path without a trailing slash.
  const path = u.pathname.replace(/\/+$/, "");
  const query = u.searchParams.toString();
  return {
    key: `${host}${path}${query ? `?${query}` : ""}`.toLowerCase(),
    url: u.toString(),
    platform: "other",
  };
}

/** The embeddable player URL for a normalized video. */
export function embedUrlFor(n: NormalizedUrl): string | null {
  if (!n.videoId) return null;
  switch (n.platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${n.videoId}`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${n.videoId}`;
    case "instagram":
      return `https://www.instagram.com/p/${n.videoId}/embed`;
    default:
      return null;
  }
}
