import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

function SectionPreview({ section, index, dark }) {
  const [open, setOpen] = useState(index === 0);
  const card = dark ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm";
  const sub = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`border rounded-2xl overflow-hidden ${card}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dark ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
            {index + 1}
          </span>
          <span className={`font-semibold text-sm leading-tight ${dark ? "text-white" : "text-gray-800"}`}>{section.title}</span>
        </div>
        {open
          ? <ChevronUp size={15} className={sub} />
          : <ChevronDown size={15} className={sub} />}
      </button>

      {open && (
        <div className={`px-5 pb-5 border-t ${dark ? "border-white/10" : "border-gray-100"}`}>
          <p className={`text-sm leading-relaxed mt-4 ${sub}`}>{section.overview}</p>

          {section.keyPoints?.length > 0 && (
            <div className="mt-4">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-indigo-400" : "text-indigo-600"}`}>Key Points</p>
              <ul className="space-y-1.5">
                {section.keyPoints.map((pt, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    <span className={`mt-1 shrink-0 ${dark ? "text-indigo-400" : "text-indigo-500"}`}>•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.terms?.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {section.terms.map((t, i) => (
                <div key={i} className={`rounded-xl p-3 ${dark ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-indigo-50 border border-indigo-100"}`}>
                  <p className={`font-semibold text-sm ${dark ? "text-indigo-300" : "text-indigo-700"}`}>{t.term}</p>
                  <p className={`text-xs mt-1 leading-relaxed ${sub}`}>{t.definition}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Results({ results, onReset, dark }) {
  const [flipped, setFlipped] = useState({});
  const sections = results.sections || [];
  const summary = results.summary || [];
  const terms = results.keyTerms || results.key_terms || [];
  const questions = results.quizQuestions || results.quiz_questions || [];

  const card = dark ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm";
  const text = dark ? "text-gray-300" : "text-gray-700";
  const sub = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className="space-y-4">
      {results.title && <h3 className="text-lg font-bold text-white">{results.title}</h3>}

      {/* Sections (new rich format) */}
      {sections.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-indigo-400" />
            <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-800"}`}>
              {sections.length} Sections — expand each to preview
            </p>
          </div>
          {sections.map((s, i) => (
            <SectionPreview key={i} section={s} index={i} dark={dark} />
          ))}
        </div>
      ) : (
        <>
          {/* Legacy: flat summary */}
          <div className={`border rounded-2xl p-5 ${card}`}>
            <h3 className={`font-bold mb-3 flex items-center gap-2 ${dark ? "text-white" : "text-gray-800"}`}>📝 Summary</h3>
            <ul className="space-y-2">
              {summary.map((p, i) => (
                <li key={i} className={`flex items-start gap-2 text-sm ${text}`}>
                  <span className="text-indigo-400 mt-0.5">•</span><span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legacy: key terms */}
          <div className={`border rounded-2xl p-5 ${card}`}>
            <h3 className={`font-bold mb-3 ${dark ? "text-white" : "text-gray-800"}`}>🔑 Key Terms</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {terms.map((item, i) => (
                <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                  <p className="font-semibold text-indigo-400 text-sm">{item.term}</p>
                  <p className={`text-xs mt-1 leading-relaxed ${sub}`}>{item.definition}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legacy: quiz */}
          <div className={`border rounded-2xl p-5 ${card}`}>
            <h3 className={`font-bold mb-3 ${dark ? "text-white" : "text-gray-800"}`}>🧠 Quiz Preview</h3>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
                  className={`border ${dark ? "border-white/10 hover:border-indigo-500/40" : "border-gray-100 hover:border-indigo-200"} rounded-xl p-3 cursor-pointer transition-colors`}>
                  <p className={`text-sm font-medium ${dark ? "text-gray-200" : "text-gray-700"}`}>{q.question}</p>
                  {flipped[i] && <p className="text-indigo-400 text-sm mt-2 pt-2 border-t border-white/10">✅ {q.answer}</p>}
                  {!flipped[i] && <p className={`text-xs mt-1 ${sub}`}>Tap to reveal answer</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
