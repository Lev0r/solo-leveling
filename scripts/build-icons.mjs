import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

async function rasterize(svgPath, size, outPath) {
  const svg = readFileSync(svgPath);
  await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

await rasterize(join(iconsDir, 'icon.svg'), 192, join(iconsDir, 'icon-192.png'));
await rasterize(join(iconsDir, 'icon.svg'), 512, join(iconsDir, 'icon-512.png'));
await rasterize(
  join(iconsDir, 'icon-maskable.svg'),
  512,
  join(iconsDir, 'icon-maskable-512.png'),
);
