import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

// Allowed tags and attributes — strictly limited to safe formatting only
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "br"],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

// Matches \( ... \) for inline math and \[ ... \] / $$ ... $$ for block math.
// Deliberately NOT supporting bare single-$ delimiters — guide content about
// economics/finance can contain literal dollar amounts ("costs $5 or $10"),
// which a single-$ regex would misinterpret as one math span between them.
const MATH_PATTERN = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;

/**
 * Pulls math segments out into placeholder tokens BEFORE markdown/HTML
 * processing runs, since LaTeX source (e.g. "a * b", underscores, braces)
 * would otherwise collide with the markdown bold/italic regexes and get
 * mangled before KaTeX ever sees it. Placeholders are restored with the
 * actual rendered math after sanitization.
 */
function extractMath(html) {
  const placeholders = [];
  const withPlaceholders = html.replace(MATH_PATTERN, (match, display1, display2, inline) => {
    const isDisplay = display1 !== undefined || display2 !== undefined;
    const expr = display1 ?? display2 ?? inline;
    const token = `@@MATH_${placeholders.length}@@`;
    const rendered = katex.renderToString(expr, { throwOnError: false, displayMode: isDisplay });
    // KaTeX's own markup (span/svg/MathML) is spliced back in after the main
    // sanitize pass below, so it needs its own pass here — DOMPurify's default
    // profile (not the restrictive PURIFY_CONFIG) keeps KaTeX's tags intact
    // while still stripping any script/event-handler payload.
    placeholders.push(DOMPurify.sanitize(rendered));
    return token;
  });
  return { withPlaceholders, placeholders };
}

function restoreMath(html, placeholders) {
  return html.replace(/@@MATH_(\d+)@@/g, (_, i) => placeholders[Number(i)] ?? "");
}

/**
 * Safely renders an HTML string from the AI.
 * Always routes through DOMPurify so HTML entities (&amp; &lt; etc.) are
 * decoded correctly by the browser's innerHTML parser — plain text gets the
 * same treatment and never shows raw entity strings to the user.
 */
export default function RichText({ html, className = "" }) {
  if (!html) return null;

  const { withPlaceholders, placeholders } = extractMath(html);

  // Strip any stray markdown syntax the AI might leak into HTML fields.
  // Bold before italic so **text** is not accidentally eaten by the italic rule.
  // The italic regex uses a negative lookahead/lookbehind to avoid matching * inside **.
  const normalized = withPlaceholders
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/^#{1,6}\s+/gm, ""); // strip # headings

  const sanitized = DOMPurify.sanitize(normalized, PURIFY_CONFIG);

  // If DOMPurify stripped everything to empty, fall back to plain text (strip HTML tags first)
  if (!sanitized.trim()) {
    return <p className={`rich-text ${className}`}>{html.replace(/<[^>]+>/g, "")}</p>;
  }

  const clean = placeholders.length > 0 ? restoreMath(sanitized, placeholders) : sanitized;

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
