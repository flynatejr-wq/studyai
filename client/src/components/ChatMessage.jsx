import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-white/10 text-gray-200">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Paragraphs
            p({ children }) {
              return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
            },
            // Bold
            strong({ children }) {
              return <strong className="font-semibold text-white">{children}</strong>;
            },
            // Italic / emphasis
            em({ children }) {
              return <em className="italic text-indigo-300">{children}</em>;
            },
            // Unordered list
            ul({ children }) {
              return <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-400">{children}</ul>;
            },
            // Ordered list
            ol({ children }) {
              return <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-400">{children}</ol>;
            },
            // List item
            li({ children }) {
              return <li className="leading-relaxed pl-1">{children}</li>;
            },
            // Blockquote — used for definitions and quoted material
            blockquote({ children }) {
              return (
                <blockquote className="my-2 border-l-2 border-indigo-500/60 pl-3 text-gray-400 italic">
                  {children}
                </blockquote>
              );
            },
            // Fenced code block container — v10: override `pre` for the wrapper
            pre({ children }) {
              return (
                <pre className="my-2 p-3 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
                  {children}
                </pre>
              );
            },
            // Code — v10: `inline` prop removed; detect inline by absence of className
            code({ className, children }) {
              // A fenced block will have a `language-*` className; inline won't have any
              const isBlock = Boolean(className);
              if (isBlock) {
                return (
                  <code className="font-mono text-xs text-gray-300">{children}</code>
                );
              }
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-indigo-300 font-mono text-xs">
                  {children}
                </code>
              );
            },
            // Headings
            h1({ children }) {
              return <h1 className="font-bold text-white mt-3 mb-1 text-base">{children}</h1>;
            },
            h2({ children }) {
              return <h2 className="font-bold text-white mt-3 mb-1 text-sm">{children}</h2>;
            },
            h3({ children }) {
              return <h3 className="font-semibold text-indigo-300 mt-2 mb-1 text-sm">{children}</h3>;
            },
            // Horizontal rule
            hr() {
              return <hr className="my-3 border-white/10" />;
            },
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
