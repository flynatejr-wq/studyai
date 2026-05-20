import DOMPurify from "dompurify";

// Allowed tags and attributes — strictly limited to safe formatting only
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "br"],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Safely renders an HTML string from the AI.
 * Always routes through DOMPurify so HTML entities (&amp; &lt; etc.) are
 * decoded correctly by the browser's innerHTML parser — plain text gets the
 * same treatment and never shows raw entity strings to the user.
 */
export default function RichText({ html, className = "" }) {
  if (!html) return null;

  // Strip any stray markdown syntax the AI might leak into HTML fields
  const normalized = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^#{1,6}\s+/gm, ""); // strip # headings

  const clean = DOMPurify.sanitize(normalized, PURIFY_CONFIG);

  // If DOMPurify stripped everything to empty, fall back to escaped plain text
  if (!clean.trim()) {
    return <p className={`rich-text ${className}`}>{html}</p>;
  }

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
