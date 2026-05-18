import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const EFFECTIVE = "May 16, 2026";
const COMPANY = "StudyBuddi";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="text-indigo-400" size={22} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{COMPANY}</span>
        </Link>
        <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">Get started free →</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Effective: {EFFECTIVE}</p>

        {[
          ["1. Acceptance", `By creating an account or using ${COMPANY}, you agree to these Terms. If you do not agree, do not use the service.`],
          ["2. Description of Service", `${COMPANY} is an AI-powered study tool that generates summaries, flashcards, and quizzes from user-supplied content. The service is provided "as is" and may be updated or changed at any time.`],
          ["3. Accounts", "You must provide accurate information when creating an account. You are responsible for maintaining the security of your password and for all activity under your account. You must be at least 13 years old to use this service."],
          ["4. Acceptable Use", `You may not use ${COMPANY} to upload illegal content, infringe intellectual property rights, attempt to hack or disrupt the service, or create accounts for automated or abusive purposes.`],
          ["5. User Content", "You retain ownership of content you upload. By uploading content, you grant us a limited license to process it for the purpose of providing the service. We do not sell your content to third parties."],
          ["6. AI-Generated Content", "Summaries, quizzes, and other AI-generated outputs are provided for study assistance only. They may contain errors. Do not rely on them as a sole source of truth for exams or professional decisions."],
          ["7. Payments", "Some features may require a paid subscription in the future. Pricing, billing terms, and refund policies will be disclosed at the time of purchase."],
          ["8. Termination", "We reserve the right to suspend or terminate accounts that violate these Terms, at our sole discretion and without prior notice."],
          ["9. Disclaimer of Warranties", `${COMPANY} is provided without warranties of any kind, express or implied. We do not guarantee the accuracy, reliability, or availability of the service.`],
          ["10. Limitation of Liability", `To the maximum extent permitted by law, ${COMPANY} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.`],
          ["11. Changes to Terms", "We may update these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms."],
          ["12. Contact", "For questions about these Terms, email us at support@studybuddi.app."],
        ].map(([title, body]) => (
          <section key={title} className="mb-8">
            <h2 className="text-white font-bold text-lg mb-2">{title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
          </section>
        ))}
      </main>
    </div>
  );
}

