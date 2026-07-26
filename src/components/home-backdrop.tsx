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
      {/* Light theme. Lower opacity than the dark one: the artwork is pale and
          sits under dark ink, so it washes out contrast far more easily. */}
      <div
        className="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-[0.18] dark:hidden"
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
