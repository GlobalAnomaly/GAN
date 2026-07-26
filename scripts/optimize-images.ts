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
    quality: 62,
    note: "light theme backdrop",
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const job of JOBS) {
    const from = resolve(SOURCE_DIR, job.from);
    const to = resolve(OUT_DIR, job.to);

    const before = (await stat(from)).size;

    const info = await sharp(from)
      .resize({ width: job.width, withoutEnlargement: true })
      .webp({ quality: job.quality })
      .toFile(to);

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
