/**
 * The dedup logic is what stops the review inbox filling with the same clip
 * five times, so it gets tested. Run with: npm run bot:test
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { embedUrlFor, normalizeUrl } from "@/lib/bot/normalize-url";

test("every YouTube link shape collapses to one key", () => {
  const shapes = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://youtu.be/dQw4w9WgXcQ?si=AbCdEf123",
    "http://youtube.com/watch?v=dQw4w9WgXcQ&utm_source=reddit&feature=share",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=4",
  ];

  const keys = new Set(shapes.map((s) => normalizeUrl(s).key));

  assert.equal(
    keys.size,
    1,
    `expected one key, got: ${[...keys].join(", ")}`,
  );
  assert.equal([...keys][0], "youtube:dQw4w9WgXcQ");
});

test("different videos stay different", () => {
  const a = normalizeUrl("https://www.youtube.com/watch?v=aaaaaaaaaaa");
  const b = normalizeUrl("https://www.youtube.com/watch?v=bbbbbbbbbbb");
  assert.notEqual(a.key, b.key);
});

test("TikTok links reduce to the video id", () => {
  const a = normalizeUrl("https://www.tiktok.com/@someone/video/7212345678901234567");
  const b = normalizeUrl(
    "https://www.tiktok.com/@someone/video/7212345678901234567?is_from_webapp=1&sender_device=pc",
  );
  assert.equal(a.key, b.key);
  assert.equal(a.key, "tiktok:7212345678901234567");
});

test("X and Instagram posts reduce to the post id", () => {
  assert.equal(
    normalizeUrl("https://twitter.com/user/status/1234567890?s=20").key,
    "x:1234567890",
  );
  assert.equal(
    normalizeUrl("https://www.instagram.com/reel/AbCdEfG/?igshid=xyz").key,
    "instagram:AbCdEfG",
  );
});

test("ordinary URLs normalize host, trailing slash and tracking params", () => {
  const a = normalizeUrl("https://www.example.com/report/12/?utm_source=x");
  const b = normalizeUrl("http://example.com/report/12");
  assert.equal(a.key, b.key);
});

test("query parameters that matter are kept, in a stable order", () => {
  const a = normalizeUrl("https://example.com/search?b=2&a=1");
  const b = normalizeUrl("https://example.com/search?a=1&b=2");
  assert.equal(a.key, b.key);
  assert.match(a.key, /a=1&b=2/);
});

test("malformed input does not throw", () => {
  const n = normalizeUrl("not a url at all");
  assert.equal(n.platform, "other");
  assert.ok(n.key.length > 0);
});

test("embed URLs are built only for platforms we can embed", () => {
  assert.equal(
    embedUrlFor(normalizeUrl("https://youtu.be/dQw4w9WgXcQ")),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  assert.equal(embedUrlFor(normalizeUrl("https://example.com/page")), null);
});
