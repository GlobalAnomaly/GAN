# Global Anomaly Network

A free, worldwide directory of UFO and UAP cases, alongside plain-language
coverage of the search for life beyond Earth. Two sections, one home, one
editorial standard: rigor where rigor fits, awe where awe is earned.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Use **npm, not pnpm**. The pnpm store lives on `C:` while this repo is on `D:`,
and pnpm links packages with hardlinks, which cannot cross drives.

## Where things are

| Path | What it is |
|---|---|
| `src/app/` | Routes: home, cases, science, browse, search, about, legal |
| `src/components/` | Shared UI |
| `src/lib/content.ts` | **The data seam.** Every page reads through this |
| `src/lib/types.ts` | Domain types, mirroring the SQL columns exactly |
| `src/lib/labels.ts` | Display strings and badge colours for every enum |
| `src/data/` | Hand-entered seed cases and science entries |
| `supabase/schema.sql` | Paste-ready database schema, with row-level security |

## Connecting Supabase

The site currently reads hand-entered seed data. Switching to the real database
is deliberately a small job:

1. Create a free project at supabase.com.
2. Open the SQL editor, paste all of `supabase/schema.sql`, run it once. It is
   safe to re-run: every object is created with a guard.
3. Copy the project URL and the **anon** key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SITE_URL=https://your-domain
   ```

4. Rewrite the function bodies in `src/lib/content.ts` to query Supabase. No
   page needs to change, because every one of those functions is already async
   and every page already goes through them.

The anon key is safe in the browser: row-level security is switched on for every
table, and the only public policies allow reading rows where `published` is true.
The bot and the future admin panel use the **service_role** key, which bypasses
RLS and must never appear in front-end code.

## Deploying

Connect the repo to Vercel or Netlify and push. There is no FTP step and no
manual upload; a commit to `main` rebuilds and goes live. Set the same
environment variables in the host's dashboard.

## Before launch

Things that are intentionally incomplete, so they do not get forgotten:

- **Video embeds.** Every seed case has an empty `media` array. Real embed URLs
  need pasting in. Guessed video IDs were avoided on purpose: a wrong ID puts
  the wrong footage under a sourced account, which is worse than no footage.
- **Source deep links.** Sources are named, and linked only where the URL is
  stable. Verify each one when you add it, as `seed-source-list.md` says.
- **Legal pages are drafts.** `/privacy`, `/terms` and `/takedown` describe the
  site as it is right now: no accounts, no ads, no analytics, no cookies beyond
  the theme preference. Each of those is accurate today and becomes wrong the
  moment a feature flag flips. Have a lawyer review them before monetisation or
  uploads, per the blueprint.
- **Analytics.** A privacy-friendly snippet (Plausible or Fathom) is planned and
  not yet added. It is what lets `/privacy` stay this simple.

## The editorial rules

Read `AGENTS.md` for the short version, and `editorial-template.md` /
`science-template.md` for the full rulebooks. The one line that governs
everything: open questions, yes; invented answers, no.
