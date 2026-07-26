import { getRunState, isRunning } from "@/lib/bot/runner";
import { DEFAULT_MODEL, isAvailable, listModels } from "@/lib/bot/ollama";
import { counts } from "@/lib/admin/store";
import { RunPanel } from "./run-panel";

export const dynamic = "force-dynamic";

export default async function RunPage() {
  const [state, models, ollamaUp, inbox] = await Promise.all([
    getRunState(),
    listModels(),
    isAvailable(),
    counts(),
  ]);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-serif)] text-3xl">
        Run it overnight
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        Point it at some channels, press start, and go to bed. It gathers
        videos, skips anything it has seen before, writes an account for each
        one and checks it against the rules. In the morning the inbox is full
        and nothing has been published.
      </p>

      <RunPanel
        state={state}
        running={isRunning(state)}
        models={models.length ? models : [DEFAULT_MODEL]}
        defaultModel={
          models.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : (models[0] ?? DEFAULT_MODEL)
        }
        ollamaUp={ollamaUp}
        hasYouTubeKey={Boolean(process.env.YOUTUBE_API_KEY)}
        inboxWaiting={inbox.new}
      />
    </div>
  );
}
