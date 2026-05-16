import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle, X, Send, RotateCcw, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function GuideView() {
  const { id } = useParams();
  const { logout, refreshUser } = useAuth();
  const [guide, setGuide] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [flipped, setFlipped] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [expandedTerms, setExpandedTerms] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => { loadGuide(); }, [id]);
  useEffect(() => { if (showChat) loadChat(); }, [showChat]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadGuide() {
    const g = await api.guides.get(id);
    setGuide(g);
  }

  async function loadChat() {
    const msgs = await api.chat.history(id);
    setMessages(msgs);
  }

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    setMessages(prev => [...prev, { id: Date.now(), role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const reply = await api.chat.send(id, msg);
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), role: "assistant", content: "Sorry, I couldn't respond. Please try again." }]);
    } finally { setChatLoading(false); }
  };

  const clearChat = async () => {
    await api.chat.clear(id);
    setMessages([]);
  };

  const submitQuiz = async () => {
    const questions = guide.quiz_questions;
    let correct = 0;
    questions.forEach((_, i) => { if (quizAnswers[i] === "correct") correct++; });
    setScore(correct);
    setQuizSubmitted(true);
    await api.guides.submitQuiz(id, correct, questions.length);
    await refreshUser();
    await loadGuide();
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setScore(0);
    setFlipped({});
  };

  if (!guide) return (
    <div className="flex min-h-screen bg-slate-950 items-center justify-center">
      <div className="text-indigo-400 animate-pulse text-lg">Loading guide...</div>
    </div>
  );

  const questions = guide.quiz_questions || [];
  const terms = guide.key_terms || [];

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onLogout={logout} />
      <main className={`flex-1 ml-64 transition-all ${showChat ? "mr-96" : ""}`}>
        <div className="p-8 max-w-3xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={18} /> Dashboard
          </Link>

          {/* Title */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{guide.title}</h1>
              <p className="text-gray-400 text-sm">{new Date(guide.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              {guide.best_quiz_score > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Trophy size={15} className="text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Best score: {guide.best_quiz_score}/{questions.length} ({Math.round(guide.best_quiz_score / questions.length * 100)}%)</span>
                </div>
              )}
            </div>
            <button onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${showChat ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/40"}`}>
              <MessageCircle size={16} /> AI Tutor
            </button>
          </div>

          {/* Summary */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📝 Summary</h2>
            <ul className="space-y-2">
              {guide.summary.map((point, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 text-gray-300">
                  <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                  <span className="leading-relaxed">{point}</span>
                </motion.li>
              ))}
            </ul>
          </section>

          {/* Key Terms */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
            <button className="w-full flex items-center justify-between text-lg font-bold text-white"
              onClick={() => setExpandedTerms(!expandedTerms)}>
              <span>🔑 Key Terms</span>
              {expandedTerms ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {expandedTerms && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {terms.map((item, i) => (
                    <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                      <p className="font-semibold text-indigo-300 text-sm">{item.term}</p>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.definition}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Quiz */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">🧠 Quiz</h2>
              {quizSubmitted && (
                <button onClick={resetQuiz} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
                  <RotateCcw size={14} /> Retry
                </button>
              )}
            </div>

            {quizSubmitted && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-5 mb-5 text-center ${score === questions.length ? "bg-green-500/10 border border-green-500/20" : score >= questions.length * 0.6 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                <div className="text-4xl mb-2">{score === questions.length ? "🏆" : score >= questions.length * 0.6 ? "⭐" : "💪"}</div>
                <p className="text-2xl font-bold text-white mb-1">{score}/{questions.length} correct</p>
                <p className="text-gray-400">{score === questions.length ? "Perfect score! You're a master!" : score >= questions.length * 0.6 ? "Great job! Keep it up!" : "Keep studying — you've got this!"}</p>
                <p className="text-indigo-400 text-sm mt-2">+{score * 10} XP earned</p>
              </motion.div>
            )}

            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-4">
                  <p className="text-white font-medium mb-3">{i + 1}. {q.question}</p>
                  {!quizSubmitted ? (
                    <div className="flex gap-2">
                      <button onClick={() => { setFlipped(f => ({ ...f, [i]: true })); }}
                        className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
                        {flipped[i] ? "Hide answer" : "Show answer"}
                      </button>
                      {flipped[i] && (
                        <div className="flex-1">
                          <p className="text-gray-300 text-sm mb-3 bg-white/5 rounded-lg px-3 py-2">{q.answer}</p>
                          {!quizAnswers[i] && (
                            <div className="flex gap-2">
                              <button onClick={() => setQuizAnswers(a => ({ ...a, [i]: "correct" }))}
                                className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors">✓ Got it</button>
                              <button onClick={() => setQuizAnswers(a => ({ ...a, [i]: "wrong" }))}
                                className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors">✗ Missed it</button>
                            </div>
                          )}
                          {quizAnswers[i] && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${quizAnswers[i] === "correct" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {quizAnswers[i] === "correct" ? "✓ Marked correct" : "✗ Marked wrong"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-sm flex-1">{q.answer}</p>
                      <span className={`text-lg`}>{quizAnswers[i] === "correct" ? "✅" : "❌"}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!quizSubmitted && Object.keys(quizAnswers).length === questions.length && (
              <button onClick={submitQuiz}
                className="w-full mt-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white transition-all">
                Submit Quiz & Earn XP ⚡
              </button>
            )}
          </section>
        </div>
      </main>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.aside initial={{ x: 384 }} animate={{ x: 0 }} exit={{ x: 384 }} transition={{ type: "spring", damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-white/10 flex flex-col z-40">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2"><MessageCircle size={16} className="text-indigo-400" /> AI Tutor</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ask anything about this lecture</p>
              </div>
              <div className="flex gap-2">
                <button onClick={clearChat} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Clear</button>
                <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Ask me anything about <span className="text-indigo-400">{guide.title}</span>.</p>
                  <div className="mt-4 space-y-2">
                    {["Can you explain the first summary point?", "Give me an example of a key term", "What should I focus on for the exam?"].map(s => (
                      <button key={s} onClick={() => setChatInput(s)}
                        className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors">
                        "{s}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white/10 text-gray-200"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl px-4 py-3 text-sm text-gray-400">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendChat} className="p-4 border-t border-white/10 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about this lecture..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white transition-colors">
                <Send size={16} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
