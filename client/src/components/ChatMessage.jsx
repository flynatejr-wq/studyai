import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an AI tutor chat message with full markdown support.
 * User messages are plain text (no markdown rendering needed).
 */
export default function ChatMessage({ msg }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed break-words bg-indigo-600 text-white">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-white/10 text-gray-200 chat-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Paragraphs
            p: ({ children }) => (
              <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
            ),
            // Bold
            strong: ({ children }) => (
              <strong className="font-semibold text-white">{children}</strong>
            ),
            // Italic
            em: ({ children }) => (
              <em className="italic text-indigo-300">{children}</em>
            ),
            // Unordered list
            ul: ({ children }) => (
              <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-400">{children}</ul>
            ),
            // Ordered list
            ol: ({ children }) => (
              <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-400">{children}</ol>
            ),
            // List item
            li: ({ children }) => (
              <li className="leading-relaxed pl-1">{children}</li>
            ),
            // Blockquote (used for definitions)
            blockquote: ({ children }) => (
              <blockquote className="my-2 border-l-2 border-indigo-500/60 pl-3 text-gray-400 italic">
                {children}
              </blockquote>
            ),
            // Inline code (formulas, symbols)
            code: ({ inline, children }) =>
              inline ? (
                <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-indigo-300 font-mono text-xs">
                  {children}
                </code>
              ) : (
                <pre className="my-2 p-3 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
                  <code className="font-mono text-xs text-gray-300">{children}</code>
                </pre>
              ),
            // Headings (h2, h3 most likely in tutor responses)
            h2: ({ children }) => (
              <h2 className="font-bold text-white mt-3 mb-1 text-sm">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-semibold text-indigo-300 mt-2 mb-1 text-sm">{children}</h3>
            ),
            // Horizontal rule
            hr: () => <hr className="my-3 border-white/10" />,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
