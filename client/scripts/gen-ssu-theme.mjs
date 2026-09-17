import { readFileSync } from "fs";

const classes = readFileSync("./ssu-theme-classes.txt", "utf8").replace(/\r/g, "").trim().split("\n");

// Shade-tier names map onto CSS custom properties (--ssu-blue-N / --ssu-orange-N,
// defined as "r,g,b" triplets in index.css) so the palette can be retuned in one
// place instead of regenerating 100+ literal rgba() rules.
const INDIGO_VARS = { 50:50, 100:100, 200:200, 300:300, 400:400, 500:500, 600:600, 700:700, 800:800, 900:900, 950:900 };
const VIOLET_VARS = { 300:300, 400:400, 500:500, 600:600, 700:700, 950:950 };

function esc(cls) {
  return cls.replace(/[/.]/g, m => "\\" + m);
}

const lines = [];
for (const cls of classes) {
  const m = cls.match(/^(bg|border|text|from|via|to|ring|shadow)-(indigo|violet)-(\d+)(\/(\d+))?$/);
  if (!m) { console.error("NO MATCH:", cls); continue; }
  const [, prop, family, shade, , alpha] = m;
  const tier = family === "indigo" ? INDIGO_VARS[shade] : VIOLET_VARS[shade];
  if (tier === undefined) { console.error("NO SHADE MAP:", cls); continue; }
  const varName = family === "indigo" ? `--ssu-blue-${tier}` : `--ssu-orange-${tier}`;
  const sel = `html.theme-ssu .${esc(cls)}`;
  const a = alpha ? (parseInt(alpha) / 100) : 1;
  const rgba = `rgba(var(${varName}),${a})`;

  if (prop === "bg")     lines.push(`${sel} { background-color: ${rgba} !important; }`);
  if (prop === "border") lines.push(`${sel} { border-color: ${rgba} !important; }`);
  if (prop === "text")   lines.push(`${sel} { color: ${rgba} !important; }`);
  if (prop === "from")   lines.push(`${sel} { --tw-gradient-from: ${rgba} !important; }`);
  if (prop === "via")    lines.push(`${sel} { --tw-gradient-stops: var(--tw-gradient-from), ${rgba}, var(--tw-gradient-to) !important; }`);
  if (prop === "to")     lines.push(`${sel} { --tw-gradient-to: ${rgba} !important; }`);
  if (prop === "ring")   lines.push(`${sel} { --tw-ring-color: ${rgba} !important; }`);
  if (prop === "shadow") lines.push(`${sel} { --tw-shadow-color: ${rgba} !important; }`);
}
console.log(lines.join("\n"));
