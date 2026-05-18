import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const EFFECTIVE = "May 16, 2026";
const COMPANY = "StudyBuddi";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="text-indigo-400" size={22} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{COMPANY}</span>
        </Link>
        <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">Get started free â†’</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective: {EFFECTIVE}</p>

        {[
          ["1. Information We Collect", "We collect information you provide directly: your name, email address, password (stored as a secure hash), and the content you upload to generate study guides. We also collect usage data such as quiz scores and study time to power features like your progress dashboard."],
          ["2. How We Use Your Information", "We use your information to provide and improve the service, personalize your experience (e.g., XP, achievements, streak tracking), and send transactional emails such as password reset links. We do not use your information for advertising."],
          ["3. Data Storage", "Your data is stored on secure servers. Study guide content and account information are stored in a database hosted on Railway. Passwords are hashed using bcrypt and are never stored in plain text."],
          ["4. AI Processing", "When you create a study guide, your content is sent to Anthropic's Claude API for processing. Please review Anthropic's privacy policy for details on how they handle data sent via API."],
          ["5. Data Sharing", "We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share data with service providers (hosting, email delivery) only as necessary to operate the service."],
          ["6. Cookies & Local Storage", "We use browser localStorage to store your authentication token. We do not use tracking cookies or third-party analytics."],
          ["7. Data Retention", "We retain your data for as long as your account is active. You may delete your account at any time from the Settings page, which permanently removes all associated data."],
          ["8. Your Rights", "You have the right to access, correct, or delete your personal data. You can update your name and password in Settings. To request a full data export or deletion, contact us directly."],
          ["9. Children's Privacy", "This service is not directed at children under 13. We do not knowingly collect personal information from children under 13."],
          ["10. Changes to This Policy", "We may update this Privacy Policy periodically. We will notify you of material changes via email or an in-app notice."],
          ["11. Contact", "For privacy-related questions or data requests, email us at support@studybuddi.app."],
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

