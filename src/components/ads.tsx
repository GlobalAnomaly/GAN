import Script from "next/script";
import { getFlags } from "@/lib/flags";
import { SITE } from "@/lib/site";

/**
 * Advertising, built and switched off.
 *
 * Nothing here loads while `ads_on` is false in the settings table, so the
 * site currently ships zero third-party scripts and sets no advertising
 * cookies. That is what lets the privacy policy make the short, plain claims
 * it makes.
 *
 * BEFORE TURNING THE FLAG ON, two things are not optional:
 *
 *   1. The privacy policy has to describe advertising cookies. It reads the
 *      same flag, so the wording switches automatically, but the text should
 *      be checked by someone qualified rather than trusted because it is
 *      automated.
 *   2. Traffic from the EU and UK needs a certified consent management
 *      platform before personalised ads may be served. This is Google's own
 *      AdSense policy, not only a legal question, and this site's operator and
 *      much of its audience are in the EU. It is not built here, because a
 *      consent banner nobody has chosen the wording of is worse than none.
 */

export async function AdSenseScript() {
  const { ads_on } = await getFlags();
  if (!ads_on) return null;

  return (
    <Script
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsensePublisherId}`}
      crossOrigin="anonymous"
    />
  );
}

/**
 * A reserved ad position.
 *
 * Renders nothing at all when ads are off, rather than an empty box: a gap
 * held open for something that is not there reads as a broken page.
 */
export async function AdSlot({
  slot,
  className,
}: {
  /** The ad unit id from the AdSense dashboard. */
  slot?: string;
  className?: string;
}) {
  const { ads_on } = await getFlags();
  if (!ads_on || !slot) return null;

  return (
    <aside className={className} aria-label="Advertisement">
      <ins
        className="adsbygoogle block"
        data-ad-client={SITE.adsensePublisherId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script id={`ad-${slot}`} strategy="afterInteractive">
        {`(adsbygoogle = window.adsbygoogle || []).push({});`}
      </Script>
    </aside>
  );
}
