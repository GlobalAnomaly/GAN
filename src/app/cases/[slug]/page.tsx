import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { ClassificationBadge } from "@/components/badges";
import { CaseAccount } from "@/components/case-account";
import { CaseCardCell } from "@/components/case-card";
import { MediaGallery } from "@/components/media-gallery";
import { ShareButtons } from "@/components/share-buttons";
import {
  getAllCaseSlugs,
  getCaseBySlug,
  getRelatedCases,
} from "@/lib/content";
import {
  CLASSIFICATION_DEFINITIONS,
  CONTINENT_LABELS,
  SOURCE_TYPE_LABELS,
  formatEventDate,
  formatLocation,
} from "@/lib/labels";
import { SITE } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = await getAllCaseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getCaseBySlug(slug);

  if (!item) return { title: "Case not found" };

  const url = `${SITE.url}/cases/${item.slug}`;

  return {
    title: item.title,
    description: item.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: item.title,
      description: item.summary,
      url,
      publishedTime: item.created_at,
      modifiedTime: item.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.summary,
    },
  };
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getCaseBySlug(slug);

  if (!item) notFound();

  const related = await getRelatedCases(slug);
  const url = `${SITE.url}/cases/${item.slug}`;
  // A documentary case has no footage to describe, so the account's first
  // heading follows the evidence rather than promising film that does not
  // exist. CaseAccount picks the wording, in whichever language is showing.
  const hasFootage = item.media.length > 0;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/cases" className="hover:text-foreground">
          Cases
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link
          href={`/cases?continent=${item.continent}`}
          className="hover:text-foreground"
        >
          {CONTINENT_LABELS[item.continent]}
        </Link>
      </nav>

      <ClassificationBadge value={item.classification} />

      {/* Title, summary and the account all live in one client component so
          they change language together. Everything between the summary and the
          account is passed through as children: the meta line, the media and
          the classification panel are language-neutral. */}
      <CaseAccount
        slug={item.slug}
        hasFootage={hasFootage}
        english={{
          title: item.title,
          summary: item.summary,
          body_footage: item.body_footage,
          body_testimony: item.body_testimony,
          body_status: item.body_status,
          body_unknown: item.body_unknown,
        }}
      >
        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Location</dt>
            <dd>
              {formatLocation(
                item.location_name,
                item.country,
                item.continent,
                item.location_unknown,
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Date</dt>
            <dd>{formatEventDate(item.date_of_event, item.date_precision)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Continent</dt>
            <dd>{CONTINENT_LABELS[item.continent]}</dd>
          </div>
        </dl>

        <div className="mt-8">
          <MediaGallery
            media={item.media}
            hasDocuments={item.documents.length > 0}
          />
        </div>

        {/* Why this label, in the site's own words. The reader can audit it. */}
        <aside className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Classified as </span>
            <ClassificationBadge value={item.classification} />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {item.classification_reason}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {CLASSIFICATION_DEFINITIONS[item.classification]}
          </p>
        </aside>
      </CaseAccount>

      {item.documents.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            Source documents
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {item.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span>
                  <span className="block text-sm font-medium">{doc.title}</span>
                  {doc.source_note && (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {doc.source_note}
                    </span>
                  )}
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
                    Read the full report at the source
                    <ExternalLink className="size-3" aria-hidden />
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {item.sources.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            Sources
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {item.sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {SOURCE_TYPE_LABELS[s.source_type]}
                </span>
                {s.source_url ? (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {s.source_name}
                  </a>
                ) : (
                  <span>{s.source_name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.tags.length > 0 && (
        <section className="mt-10">
          <h2 className="sr-only">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((t) => (
              <Link
                key={t.id}
                href={`/cases?tag=${t.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* The honest close. We are asking the same question the reader is. */}
      <section className="mt-10 rounded-xl border border-border p-5">
        <h2 className="font-[family-name:var(--font-serif)] text-xl">
          What do you think?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We have set out what the record contains and what it does not. If you
          know of footage, a document, or a detail that belongs here, tell us
          and we will look at it.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            href="/submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Send us something
          </Link>
          <ShareButtons url={url} title={item.title} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            Related cases
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <CaseCardCell key={r.id} item={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
