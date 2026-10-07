import { createRequire } from "node:module";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import roster from "../docs/committee_members.json" with { type: "json" };

// Reuse Next.js's installed image processor, as in prepare-merch.mjs.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const output = path.resolve("public/executives/committees");
await mkdir(output, { recursive: true });
let originalBytes = 0;
let preparedBytes = 0;

for (const member of roster) {
  const slug = member.full_name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const source = path.resolve("public", member.upload_your_preferred_picture.slice(1));
  const destination = path.join(output, `${slug}.webp`);
  let image = sharp(source).rotate();
  if (slug === "cheryl-saah-dekyi") {
    // Remove only the screenshot's white/black surround above the supplied photo.
    image = image.extract({ left: 0, top: 494, width: 1080, height: 634 });
  }
  await image.resize({ width: 960, height: 1280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 }).toFile(destination);
  originalBytes += (await stat(source)).size;
  preparedBytes += (await stat(destination)).size;
}

console.log(`Prepared ${roster.length} portraits: ${(originalBytes / 1048576).toFixed(1)} MB originals → ${(preparedBytes / 1048576).toFixed(1)} MB WebP display copies.`);
