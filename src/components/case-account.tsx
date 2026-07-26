"use client";

import { useEffect, useState } from "react";
import { Info, Languages, Loader2 } from "lucide-react";
import type { CaseTranslation, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The account body, with a language switcher.
 *
 * English is what the server rendered and what search engines index. Other
 * languages are fetched on demand and swapped in on the client, which keeps
 * the prerendered page to one language and avoids putting unreviewed machine
 * text into the index. The blueprint is explicit that thin machine pages get
 * penalised, so they never get their own URL.
 */

const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  pt: "Português",
  es: "Español",
};

export interface AccountSections {
  title: string;
  summary: string;
  body_footage: string;
  body_testimony: string;
  body_status: string;
  body_unknown: string;
}

/**
 * Section headings per language. The four-part structure is the editorial
 * discipline, so it has to survive translation rather than falling back to
 * English headings over translated prose.
 */
const HEADINGS: Record<Lang, [string, string, string, string]> = {
  en: [
    "What the footage shows",
    "What witnesses and officials say",
    "Status and corroboration",
    "What remains unknown",
  ],
  fr: [
    "Ce que montrent les images",
    "Ce que disent les témoins et les autorités",
    "État et corroboration",
    "Ce qui reste inconnu",
  ],
  pt: [
    "O que as imagens mostram",
    "O que dizem as testemunhas e as autoridades",
    "Situação e corroboração",
    "O que permanece desconhecido",
  ],
  es: [
    "Lo que muestran las imágenes",
    "Lo que dicen los testigos y las autoridades",
    "Situación y corroboración",
    "Lo que sigue siendo desconocido",
  ],
};

/** Used when a case has no footage, only a documentary record. */
const RECORD_HEADING: Record<Lang, string> = {
  en: "What the record shows",
  fr: "Ce que montre le dossier",
  pt: "O que mostra o registo",
  es: "Lo que muestra el expediente",
};

const MACHINE_NOTICE: Record<Lang, string> = {
  en: "",
  fr: "Cette version a été traduite automatiquement. La version anglaise fait référence.",
  pt: "Esta versão foi traduzida automaticamente. A versão inglesa é a de referência.",
  es: "Esta versión ha sido traducida automáticamente. La versión inglesa es la de referencia.",
};

export function CaseAccount({
  slug,
  english,
  hasFootage,
  children,
}: {
  slug: string;
  english: AccountSections;
  hasFootage: boolean;
  /**
   * The media gallery and classification panel, which sit between the summary
   * and the account. They live here as children so the title, summary and
   * sections can all change language together: a French account under an
   * English headline is worse than no translation at all.
   */
  children?: React.ReactNode;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [translations, setTranslations] = useState<CaseTranslation[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // Fetched once, on mount, so the switcher can show only the languages this
  // case actually has rather than offering four and failing on three.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/cases/${slug}/translations`);
        if (!res.ok) return;
        const data = (await res.json()) as { translations: CaseTranslation[] };
        if (!cancelled) setTranslations(data.translations ?? []);
      } catch {
        if (!cancelled) setTranslations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const available: Lang[] = ["en", ...(translations ?? []).map((t) => t.lang)];
  const active =
    lang === "en" ? null : (translations ?? []).find((t) => t.lang === lang);

  const shown: AccountSections = active
    ? {
        title: active.title,
        summary: active.summary,
        body_footage: active.body_footage,
        body_testimony: active.body_testimony,
        body_status: active.body_status,
        body_unknown: active.body_unknown,
      }
    : english;

  const headings = HEADINGS[lang];
  const firstHeading = hasFootage ? headings[0] : RECORD_HEADING[lang];

  async function choose(next: Lang) {
    if (next === lang) return;
    setLoading(true);
    setLang(next);
    // The content is already in memory; this is only so the change registers
    // visibly rather than looking like nothing happened.
    window.setTimeout(() => setLoading(false), 150);
  }

  const sections: [string, string][] = [
    [firstHeading, shown.body_footage],
    [headings[1], shown.body_testimony],
    [headings[2], shown.body_status],
    [headings[3], shown.body_unknown],
  ];

  return (
    <>
      {/* Server-rendered in English, so that is what lands in the HTML and in
          the index. Switching swaps it on the client only. */}
      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-3xl leading-tight sm:text-4xl">
        {shown.title}
      </h1>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {shown.summary}
      </p>

      {children}

      {available.length > 1 && (
        <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-border py-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Languages className="size-3.5" aria-hidden />
            Read in
          </span>
          {available.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => choose(l)}
              aria-pressed={l === lang}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                l === lang
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {LANG_NAMES[l]}
            </button>
          ))}
          {loading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
      )}

      {/* Said plainly, in the language being read. A reader who cannot check
          the English deserves to know nobody has checked this either. */}
      {active?.is_machine && (
        <p className="mt-4 flex gap-2 rounded-md bg-unverified/25 p-3 text-xs leading-relaxed">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{MACHINE_NOTICE[lang]}</span>
        </p>
      )}

      {sections.map(([heading, body]) => (
        <section key={heading} className="mt-8">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            {heading}
          </h2>
          <div className="prose-account mt-3 text-[0.975rem] text-foreground/90">
            <p>{body}</p>
          </div>
        </section>
      ))}
    </>
  );
}
