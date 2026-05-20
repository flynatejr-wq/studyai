import { Link } from "react-router-dom";
import { BookOpen, Mail, MessageSquare, Clock } from "lucide-react";

const COMPANY = "StudyBuddi";

const TOPICS = [
  { label: "Billing & Refunds",     email: "support@studybuddi.app?subject=Billing%20Question" },
  { label: "Technical Support",     email: "support@studybuddi.app?subject=Technical%20Support" },
  { label: "Privacy & Data Requests", email: "support@studybuddi.app?subject=Privacy%20Request" },
  { label: "Partnership & Press",   email: "hello@studybuddi.app?subject=Partnership%20Enquiry" },
];

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="text-indigo-400" size={22} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{COMPANY}</span>
        </Link>
        <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
          Get started free →
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
        <p className="text-gray-400 text-sm mb-10 leading-relaxed">
          We're a small team and we read every message. Pick the topic that best matches your question.
        </p>

        {/* Response time */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-10">
          <Clock className="text-indigo-400 shrink-0" size={18} />
          <p className="text-sm text-indigo-300 m-0">
            We typically respond within <strong>1–2 business days</strong>.
          </p>
        </div>

        {/* Topic cards */}
        <div className="grid gap-4 mb-12">
          {TOPICS.map(({ label, email }) => (
            <a
              key={label}
              href={`mailto:${email}`}
              className="flex items-center justify-between gap-4 p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-indigo-400" />
                </div>
                <span className="text-white font-medium text-sm">{label}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-indigo-400 transition-colors text-xs">
                <Mail size={13} />
                <span>support@studybuddi.app</span>
              </div>
            </a>
          ))}
        </div>

        {/* Account holders: use in-app chat */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-white font-bold text-base mb-2">Already have an account?</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            The fastest way to get help is through the AI tutor inside your guide, or by emailing us directly with your account email so we can look up your details.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            Sign in to your account →
          </Link>
        </div>
      </main>
    </div>
  );
}
