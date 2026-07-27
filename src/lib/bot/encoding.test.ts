/**
 * A guard against text encoding damage across the source tree.
 *
 * This exists because of a real failure, not a hypothetical one. Some pass
 * over `src/lib/bot/` rewrote UTF-8 files as Windows-1252, which turns every
 * multi-byte character into two or three latin-1 ones. An em dash (U+2014,
 * bytes E2 80 94) became the three characters U+00E2 U+20AC U+201D.
 *
 * Two things made that expensive rather than merely untidy:
 *
 * 1. The em dash rule is the most repeated editorial rule in the project, and
 *    its check is a character class. Corrupt the class and the rule inverts:
 *    real em dashes pass, while the curly double quotes that landed in the
 *    class instead cause false blocks on correctly written drafts. Both
 *    happened in the first overnight run.
 *
 * 2. The test fixtures were corrupted by the same pass, so the broken check
 *    matched the broken fixture and the suite stayed green. Tests cannot catch
 *    this when they are damaged alongside the code, which is why this guard
 *    reads bytes rather than exercising behaviour.
 *
 * This file is deliberately pure ASCII, escapes and all. A guard written with
 * the literal characters it hunts for would be destroyed by the very pass it
 * is meant to detect.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "bot", "scripts", "supabase"];
const EXTENSIONS = /\.(ts|tsx|js|mjs|css|sql)$/;
const SKIP = /node_modules|[\\/]\.next|[\\/]\.git/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (SKIP.test(path)) continue;
    if (entry.isDirectory()) {
      sourceFiles(path, out);
    } else if (EXTENSIONS.test(entry.name) && statSync(path).isFile()) {
      out.push(path);
    }
  }
  return out;
}

const FILES = ROOTS.flatMap((root) => sourceFiles(root));

test("the scan covers a meaningful number of files", () => {
  // If a refactor moves the tree, this must fail loudly rather than quietly
  // passing over nothing and reporting all clear.
  assert.ok(
    FILES.length > 20,
    `Only ${FILES.length} source files found. The roots are probably wrong.`,
  );
});

test("no source file contains UTF-8 misread as Windows-1252", () => {
  // The signature of the damage. A three-byte character (dashes, curly quotes)
  // decodes to U+00E2 U+20AC plus a tail; a two-byte one (accented letters)
  // decodes to U+00C2 or U+00C3 plus a latin-1 tail. Neither sequence occurs
  // in legitimately encoded text.
  const THREE_BYTE = new RegExp("\u00E2\u20AC[\\s\\S]", "g");
  const TAIL = "[\\u00A0-\\u00BF\\u20AC\\u0081\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021\\u02C6\\u2030\\u0160\\u2039\\u0152\\u008D\\u017D\\u008F\\u0090\\u2018\\u2019\\u201C\\u201D\\u2022\\u2013\\u2014\\u02DC\\u2122\\u0161\\u203A\\u0153\\u009D\\u017E\\u0178]";
  const TWO_BYTE = new RegExp("[\u00C2\u00C3]" + TAIL, "g");

  const damaged: string[] = [];

  for (const file of FILES) {
    const text = readFileSync(file, "utf8");
    const found = [
      ...[...text.matchAll(THREE_BYTE)].map((m) => m[0]),
      ...[...text.matchAll(TWO_BYTE)].map((m) => m[0]),
    ];
    if (found.length > 0) {
      const line = text.slice(0, text.indexOf(found[0])).split("\n").length;
      damaged.push(`${file}:${line} (${found.length} occurrence(s))`);
    }
  }

  assert.deepEqual(
    damaged,
    [],
    `Mojibake found. These files were written as Windows-1252, not UTF-8:\n${damaged.join("\n")}`,
  );
});

test("the dash and quote checks store their characters as escapes", () => {
  // These three files must not hold a literal em dash, en dash or curly quote.
  // Those are exactly the characters a bad re-encode destroys, and destroying
  // them silently disables the checks that depend on them.
  const LITERALS = /[\u2014\u2013\u2018\u2019\u201C\u201D]/g;

  for (const file of [
    "src/lib/bot/validate-account.ts",
    "src/lib/bot/validate-account.test.ts",
    "src/lib/bot/known-events.ts",
  ]) {
    const found = [...readFileSync(file, "utf8").matchAll(LITERALS)];
    assert.equal(
      found.length,
      0,
      `${file} holds ${found.length} literal dash or curly quote. ` +
        "Write them as \\u2014 style escapes so re-encoding cannot reach them.",
    );
  }
});

test("no source file starts with a byte order mark", () => {
  // Harmless to the compiler, but it is the fingerprint of whatever wrote the
  // corrupted files, so the tree is kept free of it as an early warning.
  const withBom = FILES.filter(
    (file) => readFileSync(file, "utf8").charCodeAt(0) === 0xfeff,
  );

  assert.deepEqual(withBom, [], `Byte order mark found in:\n${withBom.join("\n")}`);
});
