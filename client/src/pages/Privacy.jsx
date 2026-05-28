import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const EFFECTIVE = "May 24, 2026";
const COMPANY = "StudyBuddi";

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective: {EFFECTIVE}</p>

        {[
          ["1. Information We Collect", "We collect information you provide directly: your name, email address, password (stored as a secure hash), and the content you upload to generate study guides (text, PDFs, images, audio). We also collect usage data such as quiz scores, study time, and progress metrics to power features like your dashboard. We collect your IP address and a anonymised browser fingerprint solely to prevent abuse of our free tier."],
          ["2. How We Use Your Information", "We use your information to provide and improve the service, personalize your experience (XP, achievements, streak tracking), send transactional emails (verification, password reset), and detect and prevent fraudulent use. We do not use your information for advertising, and we do not sell your data to any third party."],
          ["3. Data Storage & Security", "Your data is stored on secure servers hosted on Railway (United States). Passwords are hashed using bcrypt and are never stored in plain text. Authentication tokens are stored in your browser's localStorage and are never transmitted to third parties. All data in transit is encrypted via HTTPS (TLS 1.2+)."],
          ["4. AI Processing & Third-Party Services", "When you create a study guide, your uploaded content is transmitted to Anthropic's Claude API for AI processing. Anthropic does not use API-submitted content to train its models. We also use Brevo for transactional email delivery, Stripe for payment processing, Railway for cloud hosting, and Mixpanel for anonymised product analytics. Each provider operates under their own privacy policy and applicable data processing agreements."],
          ["5. FERPA & Student Privacy", "StudyBuddi is designed with student privacy in mind. We do not sell or share student-submitted content or education records with any third party for commercial purposes. Content you upload (notes, PDFs, lecture material) is used solely to generate your study guide and is not retained by our AI providers beyond the duration of the API request. If your school or university wishes to formally adopt StudyBuddi and requires a Data Processing Agreement (DPA) under FERPA or applicable state law, please contact us at support@studybuddi.academy. Individual students who voluntarily use StudyBuddi are responsible for ensuring their use complies with their institution's acceptable use policies."],
          ["6. Data Sharing", "We do not sell, rent, or share your personal information with third parties for marketing or advertising purposes. We share data with service providers (Anthropic, Railway, Brevo, Stripe, Mixpanel) only to the extent necessary to operate the service. We may disclose data if required by law or to protect the rights and safety of users."],
          ["7. Cookies & Local Storage", "We use browser localStorage to store your authentication token. Mixpanel receives anonymised usage events and your user ID (not your name, email, or content) to help us understand product usage. You can opt out of analytics by using a browser extension such as uBlock Origin or by enabling Do Not Track."],
          ["8. Data Retention & Deletion", "We retain your account data for as long as your account is active. Study guides and associated content are retained until you delete them or close your account. You may permanently delete your account at any time from the Settings page — this immediately and irreversibly removes all your personal data, guides, quiz history, and chat messages from our systems. To request a manual data export or deletion, contact support@studybuddi.academy and we will respond within 30 days."],
          ["9. Your Rights", "Depending on your location, you may have rights to access, correct, port, or delete your personal data. You can update your name and password directly in Settings. For any other data requests — including access to data we hold about you — contact us at support@studybuddi.academy."],
          ["10. Children's Privacy", "StudyBuddi is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, contact us immediately and we will delete the account."],
          ["11. Changes to This Policy", "We may update this Privacy Policy periodically. We will notify you of material changes via email or an in-app notice at least 14 days before the change takes effect. Continued use of the service after that date constitutes acceptance of the updated policy."],
          ["12. Contact & DPA Requests", "For privacy questions, data requests, or institutional Data Processing Agreement (DPA) inquiries, contact us at support@studybuddi.academy. For FERPA-related institutional requests, please include your institution name and the nature of the request."],
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

