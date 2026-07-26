import type { Metadata } from "next";
import Link from "next/link";
import { getFlags } from "@/lib/flags";
import { SITE } from "@/lib/site";

/**
 * DRAFT. Written to describe the site as it actually is at launch: no
 * accounts, no ads, no analytics, and no cookies beyond two preferences the
 * reader sets themselves, the theme and the reading language.
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

export default async function PrivacyPage() {
  // Read from the same switch the ad code reads, so this page cannot claim the
  // site is ad-free while ads are running. A privacy policy that describes a
  // different site than the one you are on is worse than a blunt one.
  const { ads_on, accounts_on, comments_on } = await getFlags();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        Privacy
      </h1>

      <div className="prose-account mt-6 text-[0.975rem] text-foreground/90">
        <p>
          The short version: we do not{" "}
          {accounts_on ? "sell anything about you" : "have accounts"}, we do not
          track you across the web
          {ads_on ? "" : ", we do not run ads"}, and we do not sell anything
          about you to anyone.
        </p>

        <h2 className="mt-10 font-[family-name:var(--font-serif)] text-2xl">
          What we store on your device
        </h2>
        <p>
          Your theme choice, light or dark, kept in your browser&apos;s local
          storage so the site does not flip back every visit. It never leaves
          your device.
        </p>
        <p>
          Your reading language, if you pick one, kept in a cookie named{" "}
          <code>gan_lang</code> for a year. It holds nothing but the two letters
          of the language, it is not read by anyone else, and it exists only
          because you asked the site to remember. Clearing your cookies resets it
          and nothing else is lost.
        </p>

        {ads_on && (
          <>
            <p>
              Advertising also sets cookies. We use Google AdSense to show ads,
              and Google places cookies on your device to measure and, depending
              on your choices, personalise what you are shown. Those cookies are
              set by Google rather than by us, and they are governed by
              Google&apos;s own privacy policy as well as this one.
            </p>
            <p>
              If you are in the EU or the UK you are asked for consent before
              any personalised advertising cookie is set, and you can refuse
              without losing access to anything on the site. Everything here
              stays free to read either way.
            </p>
          </>
        )}

        {comments_on && (
          <p>
            If you post a comment, it is stored with your account and shown
            publicly alongside your nickname.
          </p>
        )}

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
          Our address is{" "}
          <a
            href={`mailto:${SITE.email}`}
            className="text-primary hover:underline"
          >
            {SITE.email}
          </a>
          , and it is also where you send any request about your data.
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
