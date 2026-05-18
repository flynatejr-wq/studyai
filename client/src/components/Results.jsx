import { useState } from "react";

export default function Results({ results, onReset, dark }) {
  const [flipped, setFlipped] = useState({});
  const summary = results.summary || [];
  const terms = results.keyTerms || results.key_terms || [];
  const questions = results.quizQuestions || results.quiz_questions || [];

  const card = dark ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm";
  const text = dark ? "text-gray-300" : "text-gray-700";
  const sub = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className="space-y-4">
      {results.title && <h3 className="text-lg font-bold text-white">{results.title}</h3>}

      {/* Summary */}
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

      {/* Key Terms */}
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

      {/* Quiz */}
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
    </div>
  );
}
