import katex from "katex";
import "katex/dist/katex.min.css";

// Same delimiter scheme as RichText.jsx: \( \) inline, \[ \] / $$ $$ block.
// No bare single-$ support (ambiguous with dollar amounts).
const MATH_PATTERN = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;

/**
 * For plain-text fields (quiz questions/options/explanations) that have no
 * HTML to sanitize — just literal text that may contain LaTeX math. Renders
 * as plain text when there's no math, so it's a safe drop-in replacement
 * for `{text}` wherever quiz content might include an equation.
 */
export default function MathText({ text, as: As = "span" }) {
  if (!text) return null;
  if (!MATH_PATTERN.test(text)) return <As>{text}</As>;
  MATH_PATTERN.lastIndex = 0; // reset after .test()

  const html = text.replace(MATH_PATTERN, (match, display1, display2, inline) => {
    const isDisplay = display1 !== undefined || display2 !== undefined;
    const expr = display1 ?? display2 ?? inline;
    return katex.renderToString(expr, { throwOnError: false, displayMode: isDisplay });
  });

  return <As dangerouslySetInnerHTML={{ __html: html }} />;
}
