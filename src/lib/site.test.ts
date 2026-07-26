/**
 * The site origin is read at module load and handed to `new URL()`, so a bad
 * value does not degrade anything, it fails the entire production build. That
 * happened: NEXT_PUBLIC_SITE_URL was set to "globalanomalynetwork.vercel.app",
 * which is what anyone would naturally type into a hosting dashboard and is
 * not a valid URL.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeOrigin } from "@/lib/site";

test("a bare domain is accepted, which is the case that broke the build", () => {
  assert.equal(
    normalizeOrigin("globalanomalynetwork.vercel.app"),
    "https://globalanomalynetwork.vercel.app",
  );
});

test("a full URL is kept as its origin", () => {
  assert.equal(
    normalizeOrigin("https://example.com"),
    "https://example.com",
  );
  assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
});

test("trailing slashes and stray whitespace are trimmed", () => {
  assert.equal(normalizeOrigin("  https://example.com/  "), "https://example.com");
  assert.equal(normalizeOrigin("example.com///"), "https://example.com");
});

test("a path is reduced to the origin", () => {
  // metadataBase is a base, so anything deeper would corrupt every canonical.
  assert.equal(
    normalizeOrigin("https://example.com/some/path"),
    "https://example.com",
  );
});

test("empty and missing values yield nothing rather than throwing", () => {
  assert.equal(normalizeOrigin(undefined), null);
  assert.equal(normalizeOrigin(""), null);
  assert.equal(normalizeOrigin("   "), null);
});

test("an unparseable value is ignored instead of taking the build down", () => {
  // The whole point: this runs at module load, so throwing here is fatal.
  assert.doesNotThrow(() => normalizeOrigin("http://"));
  assert.doesNotThrow(() => normalizeOrigin(":::"));
});
