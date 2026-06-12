/**
 * Re-encodes the high-res source art in assets-src/ into the lean web assets
 * served from public/. Run with `npm run optimize:assets` after replacing a
 * source image. Originals stay in assets-src/ (not served) so this is repeatable.
 *
 * Why this exists: the raw hero (2.9 MB JPEG), fallback (755 KB) and logo
 * (341 KB auto-traced SVG) were shipped as-is and dominated mobile transfer.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets-src');
const out = join(root, 'public');

await mkdir(out, { recursive: true });

const kb = bytes => `${Math.round(bytes / 1024)} KB`;

/** Full-bleed hero, displayed object-cover. Responsive WebP for srcset. */
async function hero() {
  for (const width of [768, 1280, 1920]) {
    const info = await sharp(join(src, 'viet-hero.jpg'))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(join(out, `viet-hero-${width}.webp`));
    console.log(`viet-hero-${width}.webp  ${kb(info.size)}`);
  }
}

/** Fallback card photo. One width covers card (~430px CSS) up to DPR 3. */
async function fallback() {
  const info = await sharp(join(src, 'bunbohue.jpg'))
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 68 })
    .toFile(join(out, 'bunbohue-card.webp'));
  console.log(`bunbohue-card.webp  ${kb(info.size)}`);
}

/** Logo shows at h-9/h-10 (≤40px); a 220px WebP is crisp to DPR 3+ for KBs. */
async function logo() {
  const logoInfo = await sharp(join(src, 'chezhuonglogo.svg'), { density: 200 })
    .resize({ width: 220 })
    .webp({ quality: 90 })
    .toFile(join(out, 'chezhuonglogo.webp'));
  console.log(`chezhuonglogo.webp  ${kb(logoInfo.size)}`);

  const iconInfo = await sharp(join(src, 'chezhuonglogo.svg'), { density: 200 })
    .resize({ width: 64, height: 64, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(out, 'favicon.png'));
  console.log(`favicon.png  ${kb(iconInfo.size)}`);
}

await Promise.all([hero(), fallback(), logo()]);
console.log('done');
