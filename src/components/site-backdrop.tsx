/**
 * Atmospheric backdrop, on every page.
 *
 * It began as home-page-only, on the reasoning that imagery competes with prose
 * exactly where attention matters most. That was overruled deliberately: looking
 * like a bare data dump has its own cost, and the artwork is what tells a reader
 * this is a place someone built rather than a database with a web form on it.
 *
 * Two things keep it from fighting the text. The mask fades it out well before
 * the halfway mark, so the dense part of any page sits on plain ground. And the
 * opacity is low enough in both themes that it reads as paper texture rather than
 * as a picture.
 *
 * Worth knowing if this ever needs revisiting: it is `fixed`, so the fade stays
 * at the same height on screen as the reader scrolls rather than scrolling away.
 * On a long case page that means a permanent wash behind the top of the viewport.
 * If that turns out to hurt on the reading pages, the fix is a lower opacity for
 * those routes rather than removing it again.
 *
 * Both themes get their own artwork and CSS picks between them, so there is no
 * flash of the wrong one on load.
 */
export function SiteBackdrop() {
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
