import DOMPurify from "dompurify";

// Allowed tags and attributes — strictly limited to safe formatting only
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "br"],
  ALLOWED_ATTR: [], // no attributes whatsoever
  KEEP_CONTENT: true,
};

/**
 * Safely renders an HTML string from the AI.
 * Falls back gracefully if the string contains no HTML (plain text is fine too).
 */
export default function RichText({ html, className = "" }) {
  if (!html) return null;

  // If no HTML tags present, just render as plain text to avoid unnecessary sanitization overhead
  const hasHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!hasHtml) {
    return <p className={className}>{html}</p>;
  }

  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);
  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
