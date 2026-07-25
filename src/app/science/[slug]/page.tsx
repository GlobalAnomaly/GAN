import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ImageIcon } from "lucide-react";
import { ScienceStatusBadge } from "@/components/badges";
import { ShareButtons } from "@/components/share-buttons";
import { getAllScienceSlugs, getScienceBySlug } from "@/lib/content";
import {
  SCIENCE_STATUS_DEFINITIONS,
  SCIENCE_TOPIC_LABELS,
} from "@/lib/labels";
import { SITE } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = await getAllScienceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getScienceBySlug(slug);

  if (!item) return { title: "Entry not found" };

  const url = `${SITE.url}/science/${item.slug}`;

  return {
    title: item.title,
    description: item.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: item.title,
      description: item.summary,
      url,
    },
  };
}

function Section({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  if (!body) return null;

  return (
    <section className="mt-8">
      <h2 className="font-[family-name:var(--font-serif)] text-xl">{heading}</h2>
      <p className="prose-account mt-3 text-[0.975rem] text-foreground/90">
        {body}
      </p>
    </section>
  );
}

export default async function ScienceEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getScienceBySlug(slug);

  if (!item) notFound();

  const url = `${SITE.url}/science/${item.slug}`;
  const year = item.date ? item.date.slice(0, 4) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/science" className="hover:text-foreground">
          Science
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link
          href={`/science?topic=${item.topic}`}
          className="hover:text-foreground"
        >
          {SCIENCE_TOPIC_LABELS[item.topic]}
        </Link>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <ScienceStatusBadge value={item.status} />
          <span className="text-xs text-muted-foreground">
            {SCIENCE_TOPIC_LABELS[item.topic]}
          </span>
        </div>

        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-3xl leading-tight sm:text-4xl">
          {item.title}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-sm">
          {item.institutions.length > 0 && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Institutions</dt>
              <dd>{item.institutions.join(", ")}</dd>
            </div>
          )}
          {year && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Reported</dt>
              <dd>{year}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{SCIENCE_STATUS_DEFINITIONS[item.status]}</dd>
          </div>
        </dl>
      </header>

      {item.images.length > 0 ? (
        <div className="mt-8 space-y-4">
          {item.images.map((img) => (
            <figure key={img.id}>
              {/* Imagery comes from agency press sites on many domains, so a
                  plain img avoids gatekeeping publication on a config change. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image_url}
                alt={img.caption ?? item.title}
                className="w-full rounded-xl border border-border"
              />
              <figcaption className="mt-2 text-sm text-muted-foreground">
                {img.caption && <span>{img.caption} </span>}
                <span className="text-xs">Credit: {img.credit}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            No imagery is attached yet. Agency imagery is free to use with a
            credit line, so anything added here will carry one.
          </p>
        </div>
      )}

      <Section heading="What they found" body={item.body_found} />
      <Section heading="How they found it" body={item.body_how} />
      <Section heading="Why it matters" body={item.body_why} />

      {/* The anti-hype keystone. Visually separated so it cannot be skimmed
          past on the way to a bigger claim than the scientists made. */}
      {item.body_caveat && (
        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            What this does not mean
          </h2>
          <p className="prose-account mt-3 text-[0.975rem] text-foreground/90">
            {item.body_caveat}
          </p>
        </section>
      )}

      {item.sources.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">
            Sources
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {item.sources.map((s) => (
              <li key={s.id}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {s.name}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  s.name
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <ShareButtons url={url} title={item.title} />
      </div>
    </article>
  );
}
