import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const iconSvg     = readFileSync(new URL("../public/icon.svg", import.meta.url));
const maskableSvg = readFileSync(new URL("../public/icon-maskable.svg", import.meta.url));

const jobs = [
  { src: iconSvg,     size: 180, out: "public/apple-touch-icon.png" },
  { src: iconSvg,     size: 192, out: "public/icon-192.png" },
  { src: iconSvg,     size: 512, out: "public/icon-512.png" },
  { src: maskableSvg, size: 192, out: "public/icon-maskable-192.png" },
  { src: maskableSvg, size: 512, out: "public/icon-maskable-512.png" },
];

for (const { src, size, out } of jobs) {
  await sharp(src, { density: 384 }).resize(size, size).png().toFile(fileURLToPath(new URL(`../${out}`, import.meta.url)));
  console.log(`wrote ${out}`);
}
