/**
 * Ollama client. Runs the model locally on your GPU, so drafting costs nothing
 * per case and the archive can be backfilled without a per-token bill.
 *
 * Deliberately small: one generate call, JSON parsing, and error messages that
 * say what to do. Everything about *what* to ask lives in prompts.ts.
 */

const HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

export interface GenerateOptions {
  model?: string;
  /**
   * Low by default. This work is grounded rewriting, not invention: the model
   * should stay close to the source text, and higher temperatures are exactly
   * where invented details come from.
   */
  temperature?: number;
  /** Ask for strict JSON back. */
  json?: boolean;
  /**
   * A JSON schema describing the expected object.
   *
   * This matters more than it looks. `format: "json"` only asks a model to
   * behave; a schema constrains what it is allowed to emit token by token.
   * Llama mostly complies with the former, Gemma does not: it wrapped its
   * answer in a code fence and narrated what it had done, producing output no
   * parser could rescue. With a schema the failure cannot happen.
   */
  schema?: Record<string, unknown>;
  /** Hard cap on output length, in tokens. */
  maxTokens?: number;
  system?: string;
}

/** Builds an object schema with every key required, which is what we always want. */
export function objectSchema(
  properties: Record<string, { type: string; description?: string }>,
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
  };
}

function friendlyError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);

  if (
    message.includes("ECONNREFUSED") ||
    message.includes("fetch failed") ||
    message.includes("Failed to fetch")
  ) {
    return new Error(
      `Cannot reach Ollama at ${HOST}.\n\n` +
        "Start it, then pull a model:\n" +
        "  ollama serve\n" +
        `  ollama pull ${DEFAULT_MODEL}\n\n` +
        "See bot/README.md for the full setup.",
    );
  }

  return new Error(message);
}

export async function generate(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(`${HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system: opts.system,
        stream: false,
        // A schema wins over the looser "json" mode when one is supplied.
        format: opts.schema ?? (opts.json ? "json" : undefined),
        options: {
          temperature: opts.temperature ?? 0.2,
          num_predict: opts.maxTokens ?? 2048,
        },
      }),
    });
  } catch (err) {
    throw friendlyError(err);
  }

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404 && body.includes("not found")) {
      throw new Error(
        `Model "${model}" is not installed.\n\n  ollama pull ${model}\n`,
      );
    }
    throw new Error(`Ollama ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as { response?: string };
  return (data.response ?? "").trim();
}

/**
 * Generate and parse JSON.
 *
 * Even in JSON mode a small model sometimes wraps output in a code fence or
 * adds a sentence before it, so the parse is tolerant: it retries on the first
 * balanced object it can find rather than failing the whole case.
 */
/** Pull an object out of a fenced or chatty response. */
function extractJson(raw: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const body = fenced ? fenced[1] : raw;

  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  return body.slice(start, end + 1);
}

/**
 * Generate and parse JSON.
 *
 * Three layers, because small models fail in different ways: a schema
 * constrains generation, a tolerant extractor rescues a fenced or narrated
 * reply, and one retry at temperature zero handles the rest. Only after all
 * three does the case fail, and the error then carries the raw output so the
 * prompt can be fixed rather than guessed at.
 */
export async function generateJson<T>(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<T> {
  const attempt = async (temperature?: number): Promise<T | string> => {
    const raw = await generate(prompt, { ...opts, json: true, temperature });

    try {
      return JSON.parse(raw) as T;
    } catch {
      const extracted = extractJson(raw);
      if (extracted) {
        try {
          return JSON.parse(extracted) as T;
        } catch {
          // fall through, returning the raw text for the retry or the error
        }
      }
      return raw;
    }
  };

  const first = await attempt(opts.temperature);
  if (typeof first !== "string") return first;

  // Retry deterministically. A model that rambled once often complies when
  // sampling is switched off.
  const second = await attempt(0);
  if (typeof second !== "string") return second;

  throw new Error(
    `The model did not return usable JSON, twice.\n\n` +
      `This usually means the model is not good at structured output. ` +
      `Llama 3.1 8B is reliable here; smaller models and some Gemma builds are not.\n\n` +
      `What it returned:\n${second.slice(0, 400)}`,
  );
}

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${HOST}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<string[]> {
  try {
    const res = await fetch(`${HOST}/api/tags`);
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}
