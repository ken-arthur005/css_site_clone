import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Reuse the image processor already installed with Next.js; no new package.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const root = path.resolve("public/merch");
const { data, info } = await sharp(path.join(root, "layers/shirt.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const colours = { black: "#353535", magenta: "#ba3591", white: "#d0d0d0", blue: "#3e4c7b" };
const inks = { black: "#353535", magenta: "#a43973", white: "#d0d0d0", blue: "#364f8f" };
const variants = [["kernel-panic", "black", "magenta"], ["hot-reload", "magenta", "white"], ["blue-screen", "blue", "white"], ["dark-mode", "black", "white"], ["light-mode", "white", "black"], ["hyperlink", "white", "blue"]];
const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
await mkdir(path.join(root, "tees"), { recursive: true });
for (const [id, base, ink] of variants) {
  const fabric = rgb(colours[base]), print = rgb(inks[ink]);
  const pixels = Buffer.alloc(data.length);
  for (let j = 0; j < data.length; j += 4) {
    const shade = data[j] * 1.6 / 255, coverage = data[j + 1] / 255;
    for (let c = 0; c < 3; c++) pixels[j + c] = Math.min(255, Math.round(shade * (coverage * print[c] + (1 - coverage) * fabric[c])));
    pixels[j + 3] = data[j + 2];
  }
  for (const side of ["front", "back"]) {
    const left = side === "front" ? 0 : 1076;
    const width = side === "front" ? 1076 : info.width - 1076;
    await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left, top: 0, width, height: info.height }).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(root, `tees/${id}-${side}.webp`));
  }
  console.log(`Prepared ${id} front/back`);
}

await mkdir(path.join(root, "textures"), { recursive: true });
const textureNames = {
  "kernel-panic": "pink on black", "hot-reload": "white on pink", "blue-screen": "white on blue",
  "dark-mode": "white on black", "light-mode": "black on white", "hyperlink": "blue on white",
};
for (const [id, name] of Object.entries(textureNames)) {
  await sharp(path.resolve(`public/css_shirt_3dmodel/merch/textures/css shirt ${name}.png`)).resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).webp({ quality: 95 }).toFile(path.join(root, `textures/${id}.webp`));
  console.log(`Prepared 2048px ${id} model texture`);
}
