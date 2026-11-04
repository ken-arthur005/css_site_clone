import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Backbone back previews for every colourway, and the General Lacoste photos,
// prepared from the old css-merch store's source assets. Reuses the image
// processor already installed with Next.js; no new package.
//
//   node tools/prepare-merch-extras.mjs [path-to-css-merch]
//
// The Backbone layer (css-merch/assets/layers/back-backbone.webp) replaces the
// back half of the shirt layer: R = fabric shading, G = print coverage, in the
// same encoding as public/merch/layers/shirt.webp. The silhouette alpha comes
// from the main layer's blue channel.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = path.resolve("public/merch");
const source = path.resolve(process.argv[2] ?? "../css-merch");
const SPLIT = 1076; // where the back half starts in the shirt layer

// Same colour recipe as tools/prepare-merch.mjs, so both backs match the fronts.
const colours = { black: "#353535", magenta: "#ba3591", white: "#d0d0d0", blue: "#3e4c7b" };
const inks = { black: "#353535", magenta: "#a43973", white: "#d0d0d0", blue: "#364f8f" };
const variants = [["kernel-panic", "black", "magenta"], ["hot-reload", "magenta", "white"], ["blue-screen", "blue", "white"], ["dark-mode", "black", "white"], ["light-mode", "white", "black"], ["hyperlink", "white", "blue"]];
const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

const main = await sharp(path.join(root, "layers/shirt.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const back = await sharp(path.join(source, "assets/layers/back-backbone.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (back.info.width !== main.info.width - SPLIT || back.info.height !== main.info.height) throw new Error("The Backbone layer doesn't match the shirt layer's back half.");

await mkdir(path.join(root, "tees"), { recursive: true });
const { width, height } = back.info;
for (const [id, base, ink] of variants) {
  const fabric = rgb(colours[base]), print = rgb(inks[ink]);
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const j = (y * width + x) * 4, m = (y * main.info.width + x + SPLIT) * 4;
    const shade = back.data[j] * 1.6 / 255, coverage = back.data[j + 1] / 255;
    for (let c = 0; c < 3; c++) pixels[j + c] = Math.min(255, Math.round(shade * (coverage * print[c] + (1 - coverage) * fabric[c])));
    pixels[j + 3] = main.data[m + 2];
  }
  await sharp(pixels, { raw: { width, height, channels: 4 } }).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(root, `tees/${id}-back-backbone.webp`));
  console.log(`Prepared ${id} Backbone back`);
}

await mkdir(path.join(root, "lacoste"), { recursive: true });
for (const side of ["front", "back"]) {
  await sharp(path.join(source, `assets/polo/general-${side}.webp`)).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(root, `lacoste/${side}.webp`));
  console.log(`Prepared General Lacoste ${side}`);
}
