import test from "node:test";
import assert from "node:assert/strict";

import type { Candidate } from "@/lib/admin/store";
import {
  articleLinks,
  cleanDescription,
  dossierFromCandidate,
  tooThinToDraft,
} from "@/lib/bot/candidate-dossier";
import {
  consensusDate,
  factsOfKind,
  hasFootageDescription,
  renderForPrompt,
} from "@/lib/bot/dossier";
import { tierForChannel } from "@/lib/bot/channel-registry";

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    id: "youtube%3Atest",
    normalized_url: "youtube:test",
    watch_url: "https://www.youtube.com/watch?v=test",
    embed_url: "https://www.youtube.com/embed/test",
    media_type: "youtube",
    title: "a video",
    description: "",
    channel: "Some Channel",
    published_at: "2024-04-25T03:46:43Z",
    thumbnail_url: null,
    duration_seconds: 408,
    language: "en",
    source_label: "test",
    status: "new",
    fetched_at: "2026-07-27T03:12:00Z",
    ...over,
  } as Candidate;
}

// ---------------------------------------------------------------------------
// The failure this module exists to prevent
// ---------------------------------------------------------------------------

test("a video's metadata never establishes what the footage shows", () => {
  // The real NewsNation candidate. The account drafted from it claimed the
  // footage showed "a large, unidentifiable object moving across the sky at
  // night". The video is of figures in a backyard.
  const dossier = dossierFromCandidate(
    candidate({
      title:
        "Las Vegas 'giant creature' possible 'alien' video is original: Evidence expert | Banfield",
      channel: "NewsNation",
      description:
        "It's been one year since a Las Vegas family claims something crashed in their backyard, prompting them to call 911 about nonhuman beings. Ben Hansen, UFO investigator, joins Banfield to examine the video.",
    }),
  );

  assert.equal(
    hasFootageDescription(dossier),
    false,
    "nothing here describes a single frame",
  );
  assert.equal(factsOfKind(dossier, "footage").length, 0);
  assert.match(
    renderForPrompt(dossier),
    /NOTHING IN THE MATERIAL DESCRIBES THE FOOTAGE/,
  );
});

test("a shouted title is recorded as a claim, never as an observation", () => {
  const dossier = dossierFromCandidate(
    candidate({
      title: "ALIEN CRAFT OVER TEXAS!! 100% REAL NOT A DRONE",
      channel: "",
    }),
  );

  const claims = factsOfKind(dossier, "claim");
  assert.equal(claims.length, 1);
  assert.match(claims[0].statement, /The video is titled/);
  assert.match(String(claims[0].attributed_to), /the account that posted/);
  assert.equal(factsOfKind(dossier, "footage").length, 0);
});

// ---------------------------------------------------------------------------
// Dates, which the model should never be asked to compute
// ---------------------------------------------------------------------------

test("NewsNation's 'one year since' becomes a dated fact with its derivation", () => {
  const dossier = dossierFromCandidate(
    candidate({
      channel: "NewsNation",
      description:
        "It's been one year since a Las Vegas family claims something crashed in their backyard.",
    }),
  );

  const date = consensusDate(dossier);
  assert.equal(date?.value, "2023-01-01");
  assert.equal(date?.precision, "year");
  const fact = factsOfKind(dossier, "event_date")[0];
  assert.match(fact.statement, /implied by/);
  assert.match(fact.statement, /2024-04-25/, "the reader can check the arithmetic");
});

test("KENS 5's bare 'April 30' resolves to the day, from the publication year", () => {
  const dossier = dossierFromCandidate(
    candidate({
      channel: "KENS 5: Your San Antonio News Source",
      published_at: "2023-06-14T18:03:24Z",
      description:
        'It was around midnight on April 30 when a Las Vegas family reported something crashed in their backyard and there were "big creatures" on board. https://www.kens5.com/article/news/weird/ufo-aliens-las-vegas/285-73b667fa',
    }),
  );

  const date = consensusDate(dossier);
  assert.equal(date?.value, "2023-04-30");
  assert.equal(date?.precision, "day");
});

// ---------------------------------------------------------------------------
// Getting value out of the description instead of discarding it
// ---------------------------------------------------------------------------

test("chapter timestamps are pulled out as what the video covers", () => {
  // The real 8 News Now description. Its chapter list names the conventional
  // explanation, which never reached the account drafted from it.
  const cleaned = cleanDescription(
    [
      "8 News Now examines a Las Vegas family's 911 call.",
      "00:16 Las Vegas family claims to see aliens after several report something falling from sky",
      "10:11 Fireball above Las Vegas before alien 911 call was meteor, scientist says",
      "17:42 Las Vegas family who called 911 warns trespassers, hires attorney",
    ].join("\n"),
  );

  assert.equal(cleaned.chapters.length, 3);
  assert.ok(cleaned.chapters.some((c) => /meteor, scientist says/.test(c)));
  assert.match(cleaned.text, /examines a Las Vegas family/);
});

test("channel boilerplate is stripped and counted", () => {
  const cleaned = cleanDescription(
    [
      "It's been one year since a Las Vegas family claims something crashed.",
      "#ufo #nonhuman #mystery",
      "Ashleigh Banfield is the definitive authority on the nation's biggest true crime stories.",
      "Weeknights at 10pm/9C.",
      "Get our app: https://trib.al/TBXgYpp",
      "Find us on cable: https://trib.al/YDOpGyG",
    ].join("\n"),
  );

  assert.match(cleaned.text, /one year since/);
  assert.doesNotMatch(cleaned.text, /definitive authority/);
  assert.doesNotMatch(cleaned.text, /Get our app/);
  assert.ok(cleaned.removed >= 4);
});

test("a link to real reporting survives, self promotion does not", () => {
  const links = [
    "https://www.kens5.com/article/news/weird/ufo-aliens-las-vegas/285-73b667fa",
    "https://trib.al/TBXgYpp",
    "https://www.youtube.com/@someone",
    "https://www.instagram.com/someone",
    // The outlet's front page, which is not the story and will have moved on.
    "https://www.newsnationnow.com/",
    "https://www.newsnationnow.com",
  ];
  assert.deepEqual(articleLinks(links), [links[0]]);
});

test("a channel describing itself is not evidence", () => {
  const cleaned = cleanDescription(
    [
      "A family reported something in their backyard.",
      "NewsNation is your source for fact-based, unbiased news for all America.",
    ].join("\n"),
  );
  assert.match(cleaned.text, /family reported something/);
  assert.doesNotMatch(cleaned.text, /fact-based/);
});

test("an unread article link becomes an open question, not a silent omission", () => {
  const dossier = dossierFromCandidate(
    candidate({
      description:
        "Something happened. https://www.kens5.com/article/news/weird/ufo-aliens-las-vegas",
    }),
  );
  assert.ok(
    dossier.unresolved.some((q) => /kens5\.com/.test(q) && /not been read/.test(q)),
  );
});

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

test("an unknown channel is an uploader, never press", () => {
  assert.equal(tierForChannel("Some Random UFO Channel"), "uploader");
  assert.equal(tierForChannel("UFO / UAP - news and database"), "uploader");
  assert.equal(tierForChannel(""), "anonymous");
  assert.equal(tierForChannel(null), "anonymous");
});

test("hand classified channels beat the patterns", () => {
  assert.equal(tierForChannel("NewsNation"), "press");
  assert.equal(tierForChannel("KENS 5: Your San Antonio News Source"), "press");
  assert.equal(tierForChannel("8 News Now — Las Vegas"), "press");
  assert.equal(tierForChannel("UFO Seekers"), "uploader");
});

test("a call sign is recognised as press, a hobby channel is not", () => {
  assert.equal(tierForChannel("KLAS TV"), "press");
  assert.equal(tierForChannel("ABC 7"), "press");
  assert.equal(tierForChannel("Pensare Basketball"), "uploader");
});

// ---------------------------------------------------------------------------
// Refusing to spend a model call on nothing
// ---------------------------------------------------------------------------

test("a bare title with no description is too thin to draft", () => {
  const dossier = dossierFromCandidate(
    candidate({ title: "UFO?", description: "", channel: "" }),
  );
  assert.equal(tooThinToDraft(dossier), true);
  assert.ok(dossier.unresolved.some((q) => /no description at all/.test(q)));
});

test("a real news description is not too thin", () => {
  const dossier = dossierFromCandidate(
    candidate({
      channel: "NewsNation",
      description:
        "It's been one year since a Las Vegas family claims something crashed in their backyard, prompting them to call 911 about nonhuman beings.",
    }),
  );
  assert.equal(tooThinToDraft(dossier), false);
});
