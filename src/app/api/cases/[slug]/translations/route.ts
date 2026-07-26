import { NextResponse } from "next/server";
import { listCaseTranslations } from "@/lib/content";

/**
 * Never prerendered.
 *
 * Without this the handler was baked at build time, when the database had no
 * translations at all, and then served that empty answer forever: adding a
 * translation changed nothing on the page and produced no error anywhere,
 * which is a genuinely confusing way to fail. Caching still happens, but
 * through the Cache-Control header below where it can be reasoned about.
 */
export const dynamic = "force-dynamic";

/**
 * Translations for one case, fetched only when a reader asks for one.
 *
 * Deliberately not part of the case page's own payload. The English page is
 * statically prerendered, and baking four languages of body text into HTML
 * that will usually show one of them would bloat every page and mix languages
 * in a single document, which confuses how search engines read it.
 *
 * Row-level security still applies through the anon key, so an unpublished
 * case has no translations to hand out here either.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const translations = await listCaseTranslations(slug);
    return NextResponse.json(
      { translations },
      {
        headers: {
          // Translations change only when a case is re-edited, so they cache
          // well. Stale-while-revalidate keeps switching instant.
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    // A failure here must not break the page. The reader keeps the English
    // account and simply has nothing to switch to.
    return NextResponse.json({ translations: [] }, { status: 200 });
  }
}
