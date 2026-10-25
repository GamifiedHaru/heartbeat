// Renders public/icons/icon.svg into the PNG sizes the PWA needs.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);
const svg = await readFile(join(dir, "icon.svg"));

async function render(name, size, padding = 0) {
  const inner = Math.round(size * (1 - padding * 2));
  const glyph = await sharp(svg, { density: 384 })
    .resize(inner, inner)
    .png()
    .toBuffer();
  const out = await sharp({
    create: { width: size, height: size, channels: 3, background: "#000000" },
  })
    .composite([
      {
        input: glyph,
        left: Math.round((size - inner) / 2),
        top: Math.round((size - inner) / 2),
      },
    ])
    .flatten({ background: "#000000" })
    .png()
    .toBuffer();
  await writeFile(join(dir, name), out);
  console.log(`wrote ${name} (${size}x${size})`);
}

await render("apple-touch-icon.png", 180);
await render("icon-192.png", 192);
await render("icon-512.png", 512);
// Maskable: keep the glyph inside the central 80% safe zone.
await render("icon-maskable-512.png", 512, 0.1);
