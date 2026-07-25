import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Send us something",
  description:
    "Send footage, a document, a correction, or a case we have missed. Everything is reviewed by a person before it appears.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Send us something
      </h1>

      <div className="prose-account mt-6 text-[0.975rem] text-foreground/90">
        <p>
          Footage, a document, a case we have not covered, or a correction to
          one we have. All of it is welcome, and all of it is read by a person
          before anything changes on the site.
        </p>

        {/* The submission form arrives with the admin panel and its review
            inbox. A form that posts nowhere would be worse than saying so. */}
        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5">
          <p className="text-sm leading-relaxed">
            The submission form is not live yet. It ships together with the
            review inbox, because nothing reaches the site without a human
            approving it and there is no point collecting submissions we cannot
            yet process properly.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            In the meantime, email us with a link to the material and anything
            you know about where and when it was taken.
          </p>
          <a
            href={`mailto:${SITE.email}?subject=${encodeURIComponent("Case submission")}`}
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            {SITE.email}
          </a>
        </div>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What helps most
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>A link to the original upload rather than a re-post, if you can find it.</li>
          <li>Date, time and location, even approximate ones.</li>
          <li>Anything the person who filmed it said about what they saw.</li>
          <li>For documents, the archive or agency the file came from.</li>
        </ul>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What happens next
        </h2>
        <p>
          If it checks out, we write an account from the source material,
          classify it against our published criteria, and credit where it came
          from. We embed video from wherever it already lives rather than
          re-hosting it, so the person who filmed it keeps their views and their
          rights.
        </p>
        <p>
          If it does not check out, or we cannot establish enough to write an
          honest entry, we leave it out and tell you why if you ask.
        </p>

        <p className="mt-8 text-sm text-muted-foreground">
          Reporting a rights problem instead?{" "}
          <Link href="/takedown" className="text-primary hover:underline">
            Use the takedown route
          </Link>
          , it goes to the same place but gets handled faster.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Wondering how we decide what to publish? That is all written down on{" "}
          <Link href="/about" className="text-primary hover:underline">
            our standards page
          </Link>
          .
        </p>

      </div>
    </div>
  );
}
