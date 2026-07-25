import type { Metadata } from "next";
import Link from "next/link";
import {
  CLASSIFICATION_DEFINITIONS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_ORDER,
} from "@/lib/labels";
import { ClassificationBadge } from "@/components/badges";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About and our standards",
  description:
    "How we classify cases, where our material comes from, what we will not do, and why we take the open questions seriously without inventing answers.",
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 font-[family-name:var(--font-serif)] text-2xl">
      {children}
    </h2>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl">
        About and our standards
      </h1>

      <div className="prose-account mt-6 text-[0.975rem] text-foreground/90">
        <p>
          {SITE.name} is a free archive of UFO and UAP cases from around the
          world, alongside a second section covering the actual science of
          whether life exists anywhere else. Anyone can read all of it without
          an account.
        </p>

        <H2>Where we stand</H2>
        <p>
          Most sites about this subject have already decided the answer. Some
          have decided it is aliens. Others have decided every case is a drone,
          a balloon, or a liar, and treat the people asking as fools. We think
          both of those are the same mistake wearing different clothes.
        </p>
        <p>
          Leaning skeptic is a bias too. It just gets less criticism. A site
          that explains away everything looks reasonable right up until
          something real happens, and in the meantime it talks down to the
          people who came looking for a straight answer.
        </p>
        <p>
          So when a case genuinely has no explanation, we say that. Not that it
          is probably swamp gas, and not that it is probably a spacecraft. That
          no one has explained it: not the witnesses, not the investigators, not
          the government. That sentence is the most accurate thing available in
          a lot of these cases, and we would rather write it than fill the gap
          with a guess in either direction.
        </p>
        <p>
          Open questions, yes. Invented answers, no. Asking what could possibly
          do that is honest. Saying it was an alien craft states as fact
          something nobody can support, and so does saying it was definitely a
          weather balloon when nobody checked.
        </p>

        <H2>How every account is written</H2>
        <p>
          Each case follows the same four parts, in the same order, so you can
          compare entries against each other rather than against our mood:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>What the footage or the record shows, described without interpretation.</li>
          <li>What witnesses and officials actually said, attributed to them by name where names exist.</li>
          <li>What has been confirmed, denied, corroborated, or measured.</li>
          <li>What remains unknown.</li>
        </ul>
        <p className="mt-4">
          That last section is the one that matters most, and it is never empty
          on an unresolved case. The temptation when writing up a strange story
          is to smooth the gaps until it reads well. We put the gaps in a
          labelled box instead.
        </p>
        <p>
          We do not assert a claim in our own voice. If a pilot says an object
          accelerated beyond anything he trained against, we write that the
          pilot said it. We also do not tell you a witness was credible. We tell
          you they were a naval aviator with radar confirmation, and you can
          decide what that is worth.
        </p>

        <H2>What the labels mean</H2>
        <p>
          Every case carries one of four labels, applied from written criteria
          rather than instinct. The reason for the label appears on the case
          itself, so you can check our working.
        </p>
        <dl className="mt-4 space-y-4">
          {CLASSIFICATION_ORDER.map((c) => (
            <div key={c} className="rounded-xl border border-border p-4">
              <dt>
                <ClassificationBadge value={c} />
                <span className="sr-only">{CLASSIFICATION_LABELS[c]}</span>
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {CLASSIFICATION_DEFINITIONS[c]}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">
          We include the debunked ones deliberately. An archive that only
          collects mysteries is a collection, not a record. When we find out
          that a famous photograph was made out of painted polystyrene, that
          belongs here just as much as the cases nobody can account for. Where
          two labels both fit, we take the more conservative one and explain the
          uncertainty in the open.
        </p>

        <H2>The science section is not the case section</H2>
        <p>
          Exoplanets, biosignatures and interstellar objects are covered
          separately, and they are held to a different standard because they are
          a different kind of claim. A sighting is a report. A paper is a
          published result. We never let one borrow the standing of the other.
        </p>
        <p>
          Science entries carry a status that reflects how settled the finding
          actually is, from candidate through to confirmed or disputed, and each
          one has a section saying what the result does not establish. That
          section exists because it is usually the first thing dropped when this
          material reaches a headline.
        </p>

        <H2>Where the material comes from</H2>
        <p>
          Government releases and national archives first, because they are
          public record and can be checked: the Pentagon&apos;s ongoing UAP
          releases, the US National Archives, the UK Ministry of Defence files,
          and France&apos;s GEIPAN, which publishes its investigation files
          openly. Then established civilian databases, then footage, then
          non-English sources that English-language sites tend to skip.
        </p>
        <p>
          We embed video from the platform hosting it and never re-host someone
          else&apos;s footage. Documents are linked at the source, and the
          button on a case takes you to the original rather than our copy of it.
          News articles are used to find out that a case exists and to check
          basic facts. We do not reproduce a journalist&apos;s writing. Every
          account here is written from scratch.
        </p>

        <H2>What we get wrong</H2>
        <p>
          Some of this will be wrong. Sources move, documents get reinterpreted,
          and a case that looks unexplained today can be solved next year by
          someone with better data. When that happens we change the entry and
          the label rather than defending an old call.
        </p>
        <p>
          If you can show us that something here is inaccurate, or you have
          footage, a document, or a detail we have missed, send it and we will
          look at it properly.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Send us something
          </Link>
          <Link
            href="/takedown"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            Request a takedown
          </Link>
        </div>
      </div>
    </div>
  );
}
