import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * DRAFT. Describes an honest process for a site that embeds rather than hosts.
 * Revisit when uploads go live, since hosting user files changes the
 * obligations materially and adds a counter-notice step this does not cover.
 */

export const metadata: Metadata = {
  title: "Takedown requests",
  description:
    "How to ask us to remove an embed, a link, or an account, and what we do when you do.",
};

export default function TakedownPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Takedown requests
      </h1>

      <div className="prose-account mt-6 text-[0.975rem] text-foreground/90">
        <p>
          If you own footage embedded here, or you believe an entry misuses your
          work or misrepresents you, tell us and we will deal with it quickly.
          We would rather remove something and discuss it afterwards than argue
          while it stays up.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What we host, and what we do not
        </h2>
        <p>
          We do not re-host video. Case pages embed the player from the platform
          where the video already lives, so the file stays on their servers and
          under your control there. If you remove or restrict a video at the
          source, the embed here stops working immediately. Documents are linked
          at their original archive rather than copied.
        </p>
        <p>
          What we do publish is our own written account of a case, which is
          original prose rather than a copy of anyone&apos;s article.
        </p>

        <p className="mt-4">
          Send takedown and rights requests to{" "}
          <a
            href={`mailto:${SITE.email}?subject=${encodeURIComponent("Takedown request")}`}
            className="text-primary hover:underline"
          >
            {SITE.email}
          </a>
          .
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What to send us
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>The address of the page on this site.</li>
          <li>Which part of it you are asking about: the embed, a link, an image, or the text.</li>
          <li>Enough to show the work is yours, such as the original upload or the account it was posted from.</li>
          <li>What you want: removal, a correction, or a different credit.</li>
        </ul>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What we do
        </h2>
        <p>
          We remove or unpublish the material while we look at it, rather than
          leaving it up during the conversation. If it turns out to be a
          misunderstanding we will put it back and explain. If you are asking
          for a credit rather than a removal, that is usually the easier fix and
          we are happy to make it.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Corrections are not takedowns
        </h2>
        <p>
          If the problem is that an entry is wrong rather than that it infringes
          anything, that is welcome too and it is not an adversarial process.{" "}
          <Link href="/submit" className="text-primary hover:underline">
            Send us the correction
          </Link>{" "}
          and we will fix the entry and say what changed.
        </p>
      </div>
    </div>
  );
}
