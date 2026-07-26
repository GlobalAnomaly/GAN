/**
 * Turn source artwork into web-sized assets.
 *
 * The originals are 5000px tall and several megabytes each. Serving those
 * would cost more in load time than the art adds in atmosphere, and fast pages
 * are one of the SEO fundamentals this site is built on.
 *
 * Backdrops are downscaled hard on purpose: they sit behind content at low
 * opacity, so detail nobody can see is pure weight. The hero keeps more
 * resolution because it is looked at directly.
 *
 * Usage:  npx tsx scripts/optimize-images.ts
 */

import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const SOURCE_DIR = "C:/Users/utilisateur/Downloads";
const OUT_DIR = resolve(process.cwd(), "public/images");

interface Job {
  from: string;
  to: string;
  width: number;
  quality: number;
  note: string;
  /**
   * Deepen the dark tones while leaving the light ones alone.
   *
   * Needed for the light-theme backdrop: the artwork is near-white and so is
   * the page it sits on, so nothing distinguishes them and lowering opacity
   * only makes that worse. Its saucers, document cards and dishes are the only
   * parts that can read at all, so those are pushed darker while the whites
   * stay white and keep blending invisibly into the paper.
   *
   * Applied as out = slope * in + offset, anchored so white stays white.
   */
  deepenDarks?: number;
}

const JOBS: Job[] = [
  {
    from: "Global Header.png",
    to: "hero.webp",
    // Wide enough for a 1152px container on a retina screen without going silly.
    width: 1800,
    quality: 82,
    note: "home page hero",
  },
  {
    from: "dark theme back.jpg",
    to: "backdrop-dark.webp",
    width: 1400,
    quality: 62,
    note: "dark theme backdrop",
  },
  {
    from: "Bright theme back.jpg",
    to: "backdrop-light.webp",
    width: 1400,
    quality: 68,
    note: "light theme backdrop",
    deepenDarks: 1.45,
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const job of JOBS) {
    const from = resolve(SOURCE_DIR, job.from);
    const to = resolve(OUT_DIR, job.to);

    const before = (await stat(from)).size;

    let pipeline = sharp(from).resize({
      width: job.width,
      withoutEnlargement: true,
    });

    if (job.deepenDarks) {
      // Anchoring the offset at 255 keeps pure white exactly where it is, so
      // the page background stays clean and only the darker shapes gain weight.
      const slope = job.deepenDarks;
      pipeline = pipeline.linear(slope, 255 * (1 - slope));
    }

    const info = await pipeline.webp({ quality: job.quality }).toFile(to);

    const saved = Math.round((1 - info.size / before) * 100);

    console.log(
      `${job.to.padEnd(22)} ${String(info.width).padStart(4)}x${String(info.height).padEnd(5)} ` +
        `${(before / 1024 / 1024).toFixed(1)}MB -> ${(info.size / 1024).toFixed(0)}KB  (${saved}% smaller)  ${job.note}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
