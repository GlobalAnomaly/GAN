import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * DRAFT. Reasonable for a read-only archive with no accounts and no uploads.
 * Must be reviewed by a lawyer before uploads or accounts go live, since both
 * introduce user-contributed content and a licensing question this does not
 * currently address.
 */

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using this archive, and the limits of what we claim about the material in it.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Terms of use
      </h1>

      <div className="prose-account mt-6 text-[0.975rem] text-foreground/90">
        <h2 className="mt-8 font-[family-name:var(--font-serif)] text-2xl">
          What this site is
        </h2>
        <p>
          {SITE.name} is a free archive. Reading it is free and requires no
          account. We make no claim that any unexplained case has any particular
          cause, and nothing here should be read as an assertion that it does.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Accuracy
        </h2>
        <p>
          We write every account from sourced material and we correct errors
          when they are shown to us. We cannot guarantee that every detail is
          correct, that a source will still exist tomorrow, or that a case
          currently unexplained will stay that way. Use your own judgement, and
          follow the source links, which is why they are there.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Who owns what
        </h2>
        <p>
          The written accounts on this site are ours. You are welcome to quote
          them with attribution and a link. Do not republish them wholesale.
        </p>
        <p>
          Video is embedded from the platform hosting it and remains the
          property of whoever made it. Documents are linked at their source
          rather than copied here. Government material is used where it is
          public record. Images in the science section are credited to the
          agency or observatory that released them, and remain theirs.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Using the site
        </h2>
        <p>
          Do not attempt to break, overload, or scrape the site at a rate that
          degrades it for other people. If you want the data in bulk for
          research, ask instead. We would rather help than block you.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Liability
        </h2>
        <p>
          The site is provided as is. We are not liable for decisions you make
          based on what you read here, or for anything that happens on the
          external sites we link to.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Changes
        </h2>
        <p>
          These terms will change as the site grows, particularly when accounts
          and submissions go live. The current version is always the one on this
          page.
        </p>

        <p className="mt-8 text-sm text-muted-foreground">
          Rights holders should use the{" "}
          <Link href="/takedown" className="text-primary hover:underline">
            takedown process
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
