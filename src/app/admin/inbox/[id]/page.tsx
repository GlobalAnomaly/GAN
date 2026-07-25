import { notFound } from "next/navigation";
import Link from "next/link";
import { getCandidate } from "@/lib/admin/store";
import { listModels, DEFAULT_MODEL } from "@/lib/bot/ollama";
import { isAvailable } from "@/lib/bot/ollama";
import { DraftPanel } from "./draft-panel";

export const dynamic = "force-dynamic";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidate(id);

  if (!candidate) notFound();

  const [models, ollamaUp] = await Promise.all([listModels(), isAvailable()]);

  return (
    <div>
      <Link
        href="/admin/inbox"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to the inbox
      </Link>

      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-2xl leading-snug">
        {candidate.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {candidate.channel} · {candidate.published_at.slice(0, 10)} ·{" "}
        <a
          href={candidate.watch_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Watch on YouTube
        </a>
      </p>

      <DraftPanel
        candidate={candidate}
        models={models}
        defaultModel={models.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : (models[0] ?? DEFAULT_MODEL)}
        ollamaUp={ollamaUp}
      />
    </div>
  );
}
