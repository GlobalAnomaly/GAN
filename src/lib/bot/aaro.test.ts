import test from "node:test";
import assert from "node:assert/strict";

import {
  dossierFromAaroCase,
  parseDocumentLinks,
  parseDuration,
  parseImageryPage,
  parseTitle,
} from "@/lib/bot/aaro";
import {
  consensusDate,
  factsOfKind,
  hasFootageDescription,
  renderForPrompt,
} from "@/lib/bot/dossier";

/**
 * A cut-down copy of the real page structure, so the tests run offline and
 * keep working when AARO publishes a new case. Every quirk here is real: the
 * videos live in hidden divs keyed to the row id, the disposition is buried in
 * the title, and the description is often more precise about the date than the
 * title is.
 */
const FIXTURE = `
<table>
<thead><tr><th>Videos</th><th>Title</th><th>DVIDS Page</th><th>Description</th></tr></thead>
<tbody>
<tr data-id="PR-016">
  <td><button>+</button></td>
  <td>PR-016, Resolved as Birds, Europe 2023</td>
  <td><a class="aarolink" href="https://www.dvidshub.net/video/1/pr016">PR-016</a></td>
  <td>The United States European Command submitted a report consisting of twenty-five seconds of video footage from an infrared sensor in 2023. AARO assesses, with high confidence, that the objects depicted are almost certainly birds.</td>
</tr>
<tr data-id="Mt-Etna">
  <td><button>+</button></td>
  <td>Mt. Etna Object</td>
  <td><a class="aarolink" href="https://www.dvidshub.net/video/2/etna">Mt. Etna</a></td>
  <td>In December 2018, a forward-looking infrared video sensor aboard an uncrewed U.S. Air Force platform captured this footage while operating over the Mediterranean Sea. AARO assesses with moderate confidence that the footage depicts a balloon.</td>
</tr>
<tr data-id="PR-018">
  <td><button>+</button></td>
  <td>PR-018, Unresolved UAP Report, Europe 2024</td>
  <td><a class="aarolink" href="/video/3">PR-018</a></td>
  <td>An unresolved report submitted to AARO.</td>
</tr>
</tbody>
</table>
<div class="hidden-extra" id="extra-PR-016">
  <video aria-label="Silent video showing multiple unified aerial objects moving steadily across the sky, No audio." poster="https://d1ldvf68ux039x.cloudfront.net/thumbs/a.jpg" src="https://d34w7g4gy10iej.cloudfront.net/video/2512/DOD_1/DOD_1.mp4"></video>
</div>
<div class="hidden-extra" id="extra-Mt-Etna">
  <video aria-label="Silent 13 second video showing a distant unified aerial object moving steadily across the sky, No audio." poster="/Portals/136/etna.jpg" src="https://d34w7g4gy10iej.cloudfront.net/video/2512/DOD_2/DOD_2.mp4"></video>
</div>
<div class="hidden-extra" id="extra-PR-018">
  <video aria-label="Silent two minutes and eight seconds video showing a distant unified aerial object." poster="" src="https://d34w7g4gy10iej.cloudfront.net/video/2601/DOD_3/DOD_3.mp4"></video>
  <video aria-label="Silent 43 second video showing the same object from a second sensor." poster="" src="https://d34w7g4gy10iej.cloudfront.net/video/2601/DOD_4/DOD_4.mp4"></video>
</div>
</body>
`;

const cases = parseImageryPage(FIXTURE);
const byId = (id: string) => cases.find((c) => c.id === id)!;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test("every table row becomes a case with its videos attached", () => {
  assert.equal(cases.length, 3);
  assert.equal(byId("PR-016").videos.length, 1);
  // Two sensors on one case. Joining on the row id rather than on document
  // order is what keeps these with the right case.
  assert.equal(byId("PR-018").videos.length, 2);
});

test("relative poster and video urls are made absolute", () => {
  assert.equal(byId("Mt-Etna").videos[0].poster, "https://www.aaro.mil/Portals/136/etna.jpg");
  assert.match(byId("Mt-Etna").videos[0].url, /^https:\/\/d34w7g4gy10iej\.cloudfront\.net/);
  assert.equal(byId("PR-018").dvids_url, "https://www.aaro.mil/video/3");
});

test("AARO's own verdict is read out of the title", () => {
  assert.equal(byId("PR-016").disposition, "Resolved as Birds");
  assert.equal(byId("PR-016").region, "Europe");
  assert.equal(byId("PR-016").year, 2023);

  assert.equal(byId("PR-018").disposition, "Unresolved UAP Report");
  assert.equal(byId("Mt-Etna").disposition, null, "not every case states one");
});

test("the longer disposition wins over a substring of it", () => {
  assert.equal(
    parseTitle("PR-010, UAP Report Resolved as a Balloon, Europe 2022").disposition,
    "UAP Report Resolved as a Balloon",
  );
});

test("a case id containing digits is not read as a year", () => {
  assert.equal(parseTitle("PR-2019, Unresolved UAP Report, Europe 2024").year, 2024);
});

test("durations parse from digits and from words", () => {
  assert.equal(parseDuration("Silent 13 second video showing"), 13);
  assert.equal(parseDuration("Silent two minutes and eight seconds video"), 128);
  assert.equal(parseDuration("Silent video showing a distant object"), null);
});

test("resolution report links are collected and named", () => {
  const docs = parseDocumentLinks(
    `<a href="/Portals/136/PDFs/case_resolution_reports/Mt-Etna-Object.pdf">Mt. Etna Case Resolution</a>
     <a href="/Portals/136/PDFs/case_resolution_reports/AARO_Puerto_Rico_UAP_Case_Resolution.pdf"></a>
     <a href="/Portals/136/PDFs/case_resolution_reports/Mt-Etna-Object.pdf">duplicate</a>`,
  );

  assert.equal(docs.length, 2, "the same PDF twice is one document");
  assert.equal(docs[0].title, "Mt. Etna Case Resolution");
  // An empty link falls back to the filename, which AARO names descriptively.
  assert.match(docs[1].title, /Puerto Rico/);
});

// ---------------------------------------------------------------------------
// The dossier, and why this source matters
// ---------------------------------------------------------------------------

test("AARO is the first source that can establish what the footage shows", () => {
  const dossier = dossierFromAaroCase(byId("PR-016"));

  assert.equal(hasFootageDescription(dossier), true);
  assert.match(
    factsOfKind(dossier, "footage")[0].statement,
    /multiple unified aerial objects moving steadily/,
  );
  assert.doesNotMatch(
    renderForPrompt(dossier),
    /NOTHING IN THE MATERIAL DESCRIBES THE FOOTAGE/,
  );
});

test("a resolved disposition is an explanation, an unresolved one is not", () => {
  assert.equal(factsOfKind(dossierFromAaroCase(byId("PR-016")), "explanation").length, 1);
  assert.equal(factsOfKind(dossierFromAaroCase(byId("PR-018")), "explanation").length, 0);
});

test("the disposition is kept as AARO's finding, never as our verdict", () => {
  const rendered = renderForPrompt(dossierFromAaroCase(byId("PR-016")));
  assert.match(rendered, /AARO records this case as "Resolved as Birds"/);
  assert.match(rendered, /stated by AARO/);
});

test("a date in the narrative beats a title that carries none", () => {
  // "Mt. Etna Object" has no date at all; its description opens "In December
  // 2018". Reading both is what stops the better date being lost.
  const date = consensusDate(dossierFromAaroCase(byId("Mt-Etna")));
  assert.equal(date?.value, "2018-12-01");
  assert.equal(date?.precision, "month");
});

test("a region is recorded but flagged as too coarse for a pin", () => {
  const dossier = dossierFromAaroCase(byId("PR-016"));
  assert.equal(factsOfKind(dossier, "location")[0].value, "europe");
  assert.ok(
    dossier.unresolved.some((q) => /cannot carry a map pin/.test(q)),
    "a continent centroid is worse than no pin",
  );
});

test("what AARO does not publish is stated rather than left implied", () => {
  const dossier = dossierFromAaroCase(byId("PR-018"));
  assert.ok(dossier.unresolved.some((q) => /sensor type/.test(q)));
});

test("every video becomes media we could host ourselves", () => {
  const dossier = dossierFromAaroCase(byId("PR-018"));
  assert.equal(dossier.media.length, 2);
  assert.ok(dossier.media.every((m) => m.kind === "video"));
  assert.equal(dossier.media[0].source.tier, "official");
});
