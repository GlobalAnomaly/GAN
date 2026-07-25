/**
 * Draft a case account from source material, using the local model.
 *
 * Runs in stages, because an 8B model holds together far better doing one
 * thing at a time than juggling drafting, classifying and translating in a
 * single prompt:
 *
 *   1. draft the English account, grounded strictly in the source
 *   2. validate it against the house rules
 *   3. classify it against the rubric, with a reason
 *   4. validate again, now that the label can be checked against the account
 *   5. optionally translate into French, Portuguese and Spanish
 *
 * Nothing here publishes. Output is a draft file for the review inbox, and a
 * human still approves every entry.
 *
 * Usage:
 *   npm run bot:write -- --file source.txt
 *   npm run bot:write -- --candidates 0 --translate
 *   npm run bot:write -- --text "..." --model llama3.1:8b
 *
 * In PowerShell the -- separator is swallowed, so call node directly:
 *   node --experimental-strip-types bot/write-account.ts --file source.txt
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { DEFAULT_MODEL, generateJson, isAvailable, listModels } from "@/lib/bot/ollama";
import {
  classifyPrompt,
  draftAccountPrompt,
  translatePrompt,
  LANG_NAMES,
  type ClassificationResult,
  type DraftAccount,
  type Lang,
  type SourceMaterial,
  type Translation,
} from "@/lib/bot/prompts";
import {
  formatFindings,
  validateAccount,
  validateTranslation,
} from "@/lib/bot/validate-account";

interface Args {
  file?: string;
  text?: string;
  candidate?: number;
  model: string;
  translate: boolean;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    model: DEFAULT_MODEL,
    translate: false,
    out: "bot/.cache/drafts.json",
  };

  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, "");
    const next = argv[i + 1];

    switch (key) {
      case "file":
        args.file = next;
        i++;
        break;
      case "text":
        args.text = next;
        i++;
        break;
      case "candidate":
      case "candidates":
        args.candidate = Number(next);
        i++;
        break;
      case "model":
        args.model = next!;
        i++;
        break;
      case "out":
        args.out = next!;
        i++;
        break;
      case "translate":
        args.translate = true;
        break;
    }
  }

  return args;
}

interface Candidate {
  normalized_url: string;
  watch_url: string;
  embed_url: string;
  media_type: string;
  title: string;
  description: string;
  channel: string;
  published_at: string;
}

async function loadSource(args: Args): Promise<SourceMaterial> {
  if (args.text) {
    return { sourceName: "pasted text", text: args.text };
  }

  if (args.file) {
    const text = await readFile(resolve(args.file), "utf8");
    return { sourceName: args.file, text };
  }

  if (args.candidate !== undefined) {
    const path = resolve("bot/.cache/candidates.json");
    const candidates = JSON.parse(await readFile(path, "utf8")) as Candidate[];
    const c = candidates[args.candidate];

    if (!c) {
      throw new Error(
        `No candidate at index ${args.candidate}. The file holds ${candidates.length}.`,
      );
    }

    // Title plus description is what the API gives us. It is thin, and that is
    // exactly why "what remains unknown" carries so much on these entries.
    // Transcription would improve it and is not built yet.
    return {
      sourceName: `YouTube: ${c.channel}`,
      sourceUrl: c.watch_url,
      knownTitle: c.title,
      knownDate: c.published_at,
      text: `Video title: ${c.title}\n\nUploader description:\n${c.description}`,
    };
  }

  throw new Error(
    "Pass one of --file <path>, --text \"...\", or --candidate <index>.",
  );
}

const LANGS: Lang[] = ["fr", "pt", "es"];

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!(await isAvailable())) {
    console.error(
      "Ollama is not running.\n\n" +
        "  ollama serve\n" +
        `  ollama pull ${args.model}\n\n` +
        "See bot/README.md for setup.",
    );
    process.exit(1);
  }

  const installed = await listModels();
  if (installed.length && !installed.some((m) => m.startsWith(args.model.split(":")[0]))) {
    console.error(
      `Model "${args.model}" is not installed. Available: ${installed.join(", ") || "none"}\n\n` +
        `  ollama pull ${args.model}`,
    );
    process.exit(1);
  }

  const source = await loadSource(args);

  console.log(`Model:  ${args.model}`);
  console.log(`Source: ${source.sourceName}`);
  console.log(`        ${source.text.length} characters of source text\n`);

  if (source.text.trim().length < 120) {
    console.warn(
      "Warning: the source text is very short. A thin source should produce a\n" +
        "short account with most of the weight in what remains unknown, not a\n" +
        "padded one. Check the draft carefully.\n",
    );
  }

  // Stage 1: draft
  console.log("1/4  Drafting the English account");
  const account = await generateJson<DraftAccount>(draftAccountPrompt(source), {
    model: args.model,
    temperature: 0.2,
  });

  // Stage 2: validate the draft.
  //
  // Checked before classifying rather than only at the end, because a draft
  // that breaks a hard rule has to be regenerated anyway, and classifying then
  // translating it would burn three more model calls to produce output nobody
  // can use. Across a backfill of thousands that is hours of GPU time.
  console.log("2/4  Checking it against the house rules");
  const draftCheck = validateAccount(account, { sourceText: source.text });

  if (!draftCheck.ok) {
    console.log(`\n${"-".repeat(70)}`);
    console.log(account.headline);
    console.log(`${"-".repeat(70)}\n`);
    console.log("Review flags:");
    console.log(formatFindings(draftCheck));
    console.log(
      `\nBLOCKED at the draft stage: ${draftCheck.errors.length} rule violation(s).` +
        "\nClassification and translation skipped, since this needs regenerating.",
    );

    const outPath = resolve(args.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(
      outPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          model: args.model,
          source: {
            name: source.sourceName,
            url: source.sourceUrl ?? null,
            chars: source.text.length,
          },
          account,
          classification: null,
          translations: {},
          validation: {
            ok: false,
            errors: draftCheck.errors,
            warnings: draftCheck.warnings,
          },
          approved: false,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nDraft written to ${outPath} for inspection.`);
    process.exit(1);
  }

  // Stage 3: classify
  console.log("3/4  Classifying against the rubric");
  const classification = await generateJson<ClassificationResult>(
    classifyPrompt(account, source),
    { model: args.model, temperature: 0.1 },
  );

  const finalCheck = validateAccount(account, {
    sourceText: source.text,
    classification: classification.classification,
  });

  // Stage 4: translations
  const translations: Partial<Record<Lang, Translation>> = {};
  const translationFindings: string[] = [];

  if (args.translate) {
    for (const lang of LANGS) {
      console.log(`4/4  Translating into ${LANG_NAMES[lang]}`);
      const t = await generateJson<Translation>(
        translatePrompt(account, classification.classification_reason, lang),
        { model: args.model, temperature: 0.2 },
      );
      translations[lang] = t;

      const check = validateTranslation(
        account,
        t as unknown as Record<string, string>,
        lang,
      );
      if (check.errors.length || check.warnings.length) {
        translationFindings.push(formatFindings(check));
      }
    }
  } else {
    console.log("4/4  Skipping translations (pass --translate to include them)");
  }

  // Report
  console.log(`\n${"-".repeat(70)}`);
  console.log(account.headline);
  console.log(`${"-".repeat(70)}`);
  console.log(`\nClassification: ${classification.classification}`);
  console.log(`Reason: ${classification.classification_reason}\n`);

  for (const [label, field] of [
    ["What it shows", "body_footage"],
    ["Testimony", "body_testimony"],
    ["Status", "body_status"],
    ["What remains unknown", "body_unknown"],
  ] as const) {
    console.log(`${label}:\n${account[field]}\n`);
  }

  const allFindings = formatFindings(finalCheck);
  if (allFindings || translationFindings.length) {
    console.log(`${"-".repeat(70)}`);
    console.log("Review flags:");
    if (allFindings) console.log(allFindings);
    for (const f of translationFindings) console.log(f);
    console.log();
  }

  const status = finalCheck.ok
    ? `Passed with ${finalCheck.warnings.length} warning(s) to check by eye.`
    : `BLOCKED: ${finalCheck.errors.length} rule violation(s). This must not go to the review inbox as-is.`;
  console.log(status);

  // Persist regardless: a blocked draft is still worth inspecting, and the
  // reviewer needs to see what the model produced in order to fix the prompt.
  const outPath = resolve(args.out);
  await mkdir(dirname(outPath), { recursive: true });

  const record = {
    generated_at: new Date().toISOString(),
    model: args.model,
    source: {
      name: source.sourceName,
      url: source.sourceUrl ?? null,
      chars: source.text.length,
    },
    account,
    classification,
    translations,
    validation: {
      ok: finalCheck.ok,
      errors: finalCheck.errors,
      warnings: finalCheck.warnings,
    },
    // Never true from this script. A human sets it in the review inbox.
    approved: false,
  };

  await writeFile(outPath, JSON.stringify(record, null, 2), "utf8");
  console.log(`\nDraft written to ${outPath}`);
  console.log("Nothing has been published. A human approves every entry.");

  if (!finalCheck.ok) process.exit(1);
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
