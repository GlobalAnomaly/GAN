/**
 * The unattended overnight run.
 *
 * Use this rather than the admin panel when nobody is watching. The panel's
 * button fires the run inside the Next dev server, which means saving any file
 * restarts Next and kills the run mid-flight, and a crash leaves a state file
 * claiming to be running with nothing behind it. This owns its own process, so
 * it survives everything except the machine going to sleep.
 *
 * Nothing here publishes. Every draft lands in the review inbox, exactly as it
 * does from the panel, and the ceiling on drafts is a hard stop rather than a
 * suggestion.
 *
 *   npm run bot:overnight -- --sources channels.txt
 *   npm run bot:overnight -- --source "@channelname" --source "roswell 1947"
 *
 * PowerShell eats the `--` separator npm uses, so from PowerShell call tsx
 * directly:
 *
 *   npx tsx --env-file-if-exists=.env.local bot/run-overnight.ts --sources channels.txt
 *
 * Options
 *   --sources FILE     one channel or search per line, # for comments
 *   --source VALUE     a single source; repeatable
 *   --per-source N      videos to look at per source (default 50, max 500)
 *   --max-drafts N      hard ceiling on drafts for the whole run (default 200)
 *   --since YYYY-MM-DD  ignore anything published before this
 *   --model NAME        Ollama model (default from OLLAMA_MODEL)
 *   --no-translate      skip the translation stage, which is most of the time
 *   --force             discard a stale "running" record and start anyway
 */

import { readFile } from "node:fs/promises";
import {
  getRunState,
  requestStop,
  runToCompletion,
  type RunSource,
} from "@/lib/bot/runner";
import { isAvailable, listModels } from "@/lib/bot/ollama";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function all(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function clamp(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

/** Same rule as the admin form: "@" or "UC" is a channel, anything else is a search. */
function toSource(line: string, max: number): RunSource {
  const value = line.trim();
  return {
    type: value.startsWith("@") || value.startsWith("UC") ? "channel" : "search",
    value,
    max,
  };
}

async function collectSources(max: number): Promise<RunSource[]> {
  const lines: string[] = [...all("source")];

  const file = arg("sources");
  if (file) {
    const text = await readFile(file, "utf8");
    lines.push(
      ...text
        .split("\n")
        .map((l) => l.trim())
        // A comment character matters here: a channel list is something you
        // edit over weeks and want to disable a line in, not delete it.
        .filter((l) => l && !l.startsWith("#")),
    );
  }

  return lines.map((l) => toSource(l, max));
}

async function main() {
  const perSource = clamp(arg("per-source"), 1, 500, 50);
  const maxDrafts = clamp(arg("max-drafts"), 1, 2000, 200);
  const sources = await collectSources(perSource);

  if (sources.length === 0) {
    console.error(
      "Nothing to look through. Pass --source \"@channel\" or --sources channels.txt\n" +
        "See the comment at the top of this file for the full list of options.",
    );
    process.exitCode = 1;
    return;
  }

  const model = arg("model") ?? DEFAULT_MODEL;

  // Two checks, because they fail differently and the difference is what you
  // need to know at one in the morning.
  //
  // `isAvailable` only pings the server, which is why the first version of this
  // preflight was worthless: it passed for a model that does not exist, the run
  // started, fetched 39 videos, spent quota and failed all ten drafts. So the
  // model is now verified against what Ollama actually holds.
  if (!(await isAvailable())) {
    console.error(
      "Ollama is not answering at all. Start it and try again.\n" +
        "Nothing was started and no quota was spent.",
    );
    process.exitCode = 1;
    return;
  }

  const installed = await listModels();
  if (!installed.includes(model)) {
    console.error(
      `Ollama is running but has no model called "${model}".\n` +
        (installed.length
          ? `It has: ${installed.join(", ")}\n`
          : "It reports no models at all.\n") +
        `Pull it with:  ollama pull ${model}\n` +
        "Nothing was started and no quota was spent.",
    );
    process.exitCode = 1;
    return;
  }

  const translate = !has("no-translate");

  console.log("Overnight run");
  console.log(`  sources     ${sources.length}`);
  console.log(`  per source  ${perSource}`);
  console.log(`  max drafts  ${maxDrafts}`);
  console.log(`  model       ${model}`);
  console.log(`  translate   ${translate ? "yes" : "no"}`);
  const since = arg("since");
  if (since) console.log(`  since       ${since}`);
  console.log("\nNothing is published. Everything lands in the review inbox.");
  console.log("Ctrl+C once to stop cleanly after the current item.\n");

  // One Ctrl+C asks the loop to finish the item it is on and save. A second one
  // is taken as impatience and exits immediately.
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) {
      console.log("\nSecond interrupt. Exiting now.");
      process.exit(130);
    }
    stopping = true;
    console.log("\nStopping after the current item. Ctrl+C again to exit at once.");
    void requestStop();
  });

  const started = Date.now();
  const { error, state } = await runToCompletion(
    { sources, since, translate, model, maxDrafts },
    { force: has("force") },
  );

  if (error) {
    console.error(`\n${error}`);
    process.exitCode = 1;
    return;
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  const t = state?.totals;

  console.log(`\nFinished in ${mins} minutes. Status: ${state?.status ?? "unknown"}`);
  if (t) {
    console.log(`  found       ${t.found}`);
    console.log(`  queued      ${t.queued}`);
    console.log(`  drafted     ${t.drafted}`);
    console.log(`  blocked     ${t.blocked}   (written, then failed the validator)`);
    console.log(`  failed      ${t.failed}`);
    // The binding constraint on any run: a free YouTube key gets 10,000 units a
    // day, so knowing what a night cost is what makes the next one plannable.
    console.log(`  quota used  ${t.quota_used} of 10000 daily units`);
  }

  // The last few log lines are where a run explains itself, and reading the
  // JSON by hand at breakfast is a worse experience than being told.
  const tail = (await getRunState()).log.slice(-6);
  if (tail.length) {
    console.log("\nLast entries:");
    for (const e of tail) console.log(`  [${e.level}] ${e.message}`);
  }

  console.log("\nReview at http://localhost:3000/admin/inbox");
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.stack ?? err.message : err}`);
  process.exitCode = 1;
});
