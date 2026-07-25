# Design Direction — Visual Identity

*The look-and-feel brief. A companion to the master blueprint; hand it to Claude Code alongside the others so the build has a clear aesthetic target instead of guessing. Meant to be reacted to and adjusted.*

---

## The feel in one line

A serious publication that happens to be about the extraordinary. Editorial bones (like quality journalism or a good archive), modern chrome (rounded frames, pill buttons, a crisp nav), two themes. The wonder comes from the content, not the decoration.

---

## Typography

- **Headlines and case/entry titles: a serif with editorial character** (Lora, Source Serif, or similar). This is the signature move; it signals "written, considered, trustworthy" and instantly separates you from the generic-AI look.
- **Body, UI, nav, buttons: a clean neutral sans** (Inter or a system sans). Highly readable for long accounts.
- Mostly two weights (regular + medium). **Sentence case everywhere.** No ALL CAPS, no Title Case.
- Long-read comfort: generous line-height (~1.7) on account bodies.

## Color

- **Restrained neutral base.** Light theme is "editorial paper" (warm near-white, dark ink). Dark theme is "night sky" (deep charcoal, not pure black; soft off-white text).
- **One accent** for links, primary buttons, and active nav. Something serious and faintly cosmic (a deep blue or indigo); no neon.
- **Semantic classification badges** (consistent site-wide, meaning in the color):
  - Acknowledged → green · Unverified → amber · Likely explained → muted blue-grey · Debunked → red
  - Science statuses use a quieter set (candidate / confirmed / disputed).
- Keep the palette tight: neutrals + one accent + the semantic badge set. No rainbow.

## Layout & chrome

- **Rounded corners, consistent:** cards ~12px, buttons/controls ~8px, pills for tags and badges.
- **Flat and clean:** hairline low-contrast borders and whitespace instead of heavy boxes or drop shadows.
- **A slim, sticky top nav:** serif wordmark left; Cases / Science / Browse / About + a search pill + a theme toggle right; subtle bottom border.
- **Cards** for cases and science entries: media/image at top, badge, serif title, sans dek, meta row, clear action. Cases and Science share the card shape but read as distinct (badge set, icon).
- **Mobile-first responsive:** nav collapses to a menu, cards stack, sidebars and ad slots reflow. One site, reflowing, no separate mobile version.

## Imagery

- **Content is the visual richness.** Real footage stills and space/telescope imagery carry the drama; the UI stays quiet around them. Framed or full-bleed media at the top of pages.
- Consistent aspect handling (16:9 for full/gov video, 9:16 for TikTok/Shorts).
- Atmospheric touches only, and only in the dark theme. **No UFO/alien kitsch** — no glowing saucers, no little green men. Kitsch destroys the credibility the whole project is built to earn.

## Motion

- Minimal and purposeful: gentle hover states, a smooth theme toggle, home carousels with pause-on-hover. Respect `prefers-reduced-motion`.

## The two themes

- **Light = editorial paper.** Warm-neutral background, dark ink, accent for interaction.
- **Dark = night sky.** Deep charcoal, soft light text, a slightly brighter accent; imagery pops.
- One toggle in the nav; remember the choice.

## Build foundation

- Build on **shadcn/ui + Tailwind** for professional components out of the box, then apply this identity (fonts, colors, radii) as the theme layer. This is what avoids both the generic-AI default look and the rigid-bought-template trap.

## The one rule

**Restraint.** Confident, quiet, editorial. Let the extraordinary content supply the awe.

---

*Living brief. The pieces most likely to change with your taste: the exact serif, the accent color, and the dark-theme mood. The pieces that should not: sentence case, the semantic badge colors, restraint, and no kitsch.*
