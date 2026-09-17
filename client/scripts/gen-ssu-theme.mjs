import { readFileSync } from "fs";

const classes = readFileSync("./ssu-theme-classes.txt", "utf8").trim().split("\n");

// Shade-tier mapping onto Tailwind's own blue/orange palette (SSU Tigers colors).
// Indigo is shifted up one tier (400->blue-500, 500->blue-600, ...) so the
// primary brand blue reads as confident/saturated rather than pastel.
const INDIGO_HEX = {
  50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
  400: "#3b82f6", 500: "#2563eb", 600: "#1d4ed8", 700: "#1e40af",
  800: "#1e3a8a", 900: "#172554", 950: "#172554",
};
const VIOLET_HEX = {
  300: "#fb923c", 400: "#f97316", 500: "#ea580c", 600: "#c2410c",
  700: "#9a3412", 950: "#431407",
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function esc(cls) {
  return cls.replace(/[/.]/g, m => "\\" + m);
}

const lines = [];
for (const cls of classes) {
  const m = cls.match(/^(bg|border|text|from|via|to|ring|shadow)-(indigo|violet)-(\d+)(\/(\d+))?$/);
  if (!m) { console.error("NO MATCH:", cls); continue; }
  const [, prop, family, shade, , alpha] = m;
  const hex = family === "indigo" ? INDIGO_HEX[shade] : VIOLET_HEX[shade];
  if (!hex) { console.error("NO SHADE MAP:", cls); continue; }
  const rgb = hexToRgb(hex);
  const sel = `html.theme-ssu .${esc(cls)}`;
  const a = alpha ? (parseInt(alpha) / 100) : 1;
  const rgba = `rgba(${rgb},${a})`;

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
