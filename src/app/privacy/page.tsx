import type { Metadata } from "next";
import Link from "next/link";

/**
 * DRAFT. Written to describe the site as it actually is at launch: no
 * accounts, no ads, no analytics, no cookies beyond a theme preference.
 *
 * It must be revised, and reviewed by a lawyer, before any of the following
 * are switched on: accounts, comments, newsletter, ads, uploads, analytics.
 * Each of those changes what data is collected, and a privacy policy that
 * describes the wrong site is worse than none.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site collects, which right now is almost nothing, and what changes if that changes.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Privacy
      </h1>

      <div className="prose-account mt-6 text-[0.975rem] text-foreground/90">
        <p>
          The short version: we do not have accounts, we do not run ads, we do
          not track you across the web, and we do not sell anything about you to
          anyone.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What we store on your device
        </h2>
        <p>
          One thing: whether you chose the light or dark theme. It is kept in
          your browser&apos;s local storage so the site does not flip back every
          visit. It never leaves your device and it is not an advertising
          cookie.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What our host records
        </h2>
        <p>
          Like any website, the server that delivers these pages keeps ordinary
          request logs, which include IP addresses. These are handled by our
          hosting provider, are used to keep the site running and to deal with
          abuse, and are not used to build a profile of you.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Embedded video
        </h2>
        <p>
          Case pages embed video from the platform that already hosts it, such
          as YouTube. When one of those players loads, that platform can see the
          request and may set its own cookies under its own policy, which we do
          not control. We embed rather than re-host so the footage stays with
          its creator, and this is the trade-off that comes with it.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          If you email us
        </h2>
        <p>
          We keep the message so we can act on it and answer you. Nothing more.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          Your rights
        </h2>
        <p>
          If you are in the EU or UK, the GDPR gives you the right to ask what
          data we hold about you, to have it corrected, and to have it deleted.
          Since we currently hold almost nothing, the answer is usually short.
          Ask anyway if you want to check.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          When this changes
        </h2>
        <p>
          Accounts, comments, a newsletter and advertising are all planned but
          switched off. If any of them is turned on, this page is rewritten
          first to say exactly what the new feature collects. We will not
          quietly start collecting more under an old policy.
        </p>

        <p className="mt-8 text-sm text-muted-foreground">
          See also our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            terms of use
          </Link>{" "}
          and{" "}
          <Link href="/takedown" className="text-primary hover:underline">
            takedown process
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
