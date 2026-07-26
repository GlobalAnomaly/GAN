/**
 * Atmospheric backdrop for the home page only.
 *
 * Kept off case and science pages on purpose. Those are where people read six
 * hundred words, and imagery full of documents and charts competes with the
 * text for attention exactly where attention matters most. The front door can
 * carry drama; the reading rooms stay quiet.
 *
 * Fixed rather than scrolling, low opacity, and masked so it fades out well
 * before the content gets dense. Both themes get their own artwork and CSS
 * picks between them, so there is no flash of the wrong one on load.
 */
export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Light theme. Runs higher than it first did, because lowering opacity
          was the wrong lever entirely: the artwork is near-white and so is the
          paper it sits on, so fading it just removed what little there was to
          see. The file itself now has its dark tones deepened (see
          scripts/optimize-images.ts), and those shapes are what shows. The
          white areas still blend invisibly into the background, which is
          exactly what should happen to them. */}
      <div
        className="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-55 dark:hidden"
        style={{
          backgroundImage: "url(/images/backdrop-light.webp)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 25%, transparent 65%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 25%, transparent 65%)",
        }}
      />

      {/* Dark theme. Dark artwork on a dark ground tolerates more presence. */}
      <div
        className="absolute inset-0 hidden bg-cover bg-top bg-no-repeat opacity-40 dark:block"
        style={{
          backgroundImage: "url(/images/backdrop-dark.webp)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 30%, transparent 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 30%, transparent 70%)",
        }}
      />
    </div>
  );
}
