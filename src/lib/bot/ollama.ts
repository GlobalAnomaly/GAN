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
  /** Hard cap on output length, in tokens. */
  maxTokens?: number;
  system?: string;
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
        format: opts.json ? "json" : undefined,
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
export async function generateJson<T>(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<T> {
  const raw = await generate(prompt, { ...opts, json: true });

  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        // fall through to the error below
      }
    }
    throw new Error(
      `Model did not return valid JSON. First 300 characters:\n${raw.slice(0, 300)}`,
    );
  }
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
