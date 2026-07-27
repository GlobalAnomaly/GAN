<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Global Anomaly Network

A free worldwide directory with two sibling sections: **Cases** (UFO/UAP sightings,
1930s to today) and **Science** (the search for life elsewhere). Built by a
non-coder with AI assistance.

The planning documents are the source of truth and override anything here:
`master-blueprint.md`, `editorial-template.md`, `science-template.md`,
`seed-source-list.md`, `design-direction.md`.

## The rules that never loosen

These are editorial, not stylistic, and they are why the site is worth building:

- **Never assert a UFO claim in the site's own voice.** Every claim is attributed
  to a named or described source. "The pilot stated", not "the object accelerated".
- **Never invent a detail that is not in the source.** Shape, material, size,
  altitude, time of day, witness count, location. If it is absent, it belongs in
  "what remains unknown", which is why that is its own database column.
- **An empty field is a correct answer.** An entry with no date, no place and a
  classification of `unverified` is a complete and honest entry, not a failed
  one. Most anonymous clips end there and that is the accurate result. A field
  filled from nowhere is a defect, and it is a worse one than a blank, because a
  blank tells the reader we do not know while a fabrication tells them we do.
- **A video's title and description are not a description of its footage.** They
  are the uploader's claims about it, frequently written to sell the clip. What
  the footage shows can only come from watching it, from a transcript, or from a
  source that describes it. Absent all three, we do not know, and the account
  says so.
- **If a ten-second search beats the page, the page is not finished.** The whole
  argument for this archive is that a written, cross-checked, attributed account
  is worth more than a database row. An account thinner than a search result
  fails that argument, and the answer is never to write more confidently, it is
  to go and find the sources.
- **Neutral cuts both ways.** Leaning skeptic is as much a bias as leaning
  believer. "No one has explained this" is the accurate sentence, and it is
  allowed to stand on its own.
- **Wonder scales with credibility.** Named aviators plus radar plus official
  acknowledgment earns genuine awe. A shaky anonymous clip stays gentle.
- **Science entries are not sightings.** They carry a maturity status
  (candidate/confirmed/disputed), never a verdict, and every one has a
  "what this does not mean" section.
- **No em dashes anywhere in reader-facing prose.** Use a comma, a colon,
  parentheses, or two sentences. Vary sentence length. Avoid stock AI phrasing
  ("genuinely", "testament to", "delve", "it's not just X, it's Y"). The audience
  distrusts machine-written text and they are right to.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui · next-themes.
Supabase (Postgres + auth + storage) is the intended backend. npm, not pnpm:
the pnpm store sits on `C:` and this repo is on `D:`, and pnpm's hardlinks do
not cross drives.

## Layout

```
src/app/            routes (cases, science, browse, search, about, legal)
src/components/     shared UI
src/lib/content.ts  THE data seam: every page reads through this and nothing else
src/lib/types.ts    domain types, mirroring the SQL column names exactly
src/lib/labels.ts   display strings and badge classes for every enum
src/data/           hand-entered seed content, replaced by Supabase later
supabase/schema.sql paste-ready schema with RLS
```

**`src/lib/content.ts` is the swap point.** Its functions are all async even
though the seed is synchronous, so moving to Supabase changes those function
bodies and no page code. Do not let a page import from `src/data/` directly.

## Conventions

- Sentence case in all UI text. No Title Case, no ALL CAPS.
- Serif (`var(--font-serif)`) for headings and titles, sans for body and UI.
- Classification and science-status colours live only in `globals.css` as CSS
  variables and are applied via `labels.ts`. Never hardcode a badge colour.
- Card radius 12px (`rounded-xl`), controls 8px (`rounded-md`), pills for badges.
- Respect `prefers-reduced-motion`: it is handled globally in `globals.css`, and
  any JS-driven animation must check it too (see `scroll-strip.tsx`).

## Things that are deliberately unfinished

- **Media embed URLs are empty on every seed case.** A guessed video ID either
  breaks or, worse, shows the wrong footage under a sourced account. Paste real
  ones in; the empty state is designed for this.
- **Legal pages are drafts** and describe the site as it is now (no accounts, no
  ads, no analytics, no cookies beyond the theme preference). They must be
  rewritten, and reviewed by a lawyer, before any of those flags flip.
- **Feature flags all ship off:** comments, accounts, uploads, ads, newsletter.

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build, also typechecks
npm run lint     # eslint
```
