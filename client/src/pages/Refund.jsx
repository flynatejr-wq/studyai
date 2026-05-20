import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const EFFECTIVE = "May 20, 2026";
const COMPANY   = "StudyBuddi";

export default function Refund() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective: {EFFECTIVE}</p>

        {[
          [
            "1. Free Tier",
            `${COMPANY} offers a free tier that lets you try the service before purchasing. We encourage you to use the free tier to evaluate whether ${COMPANY} meets your needs before upgrading.`,
          ],
          [
            "2. Subscription Refunds",
            "If you are not satisfied with your Pro subscription, you may request a full refund within 7 days of your initial purchase. After 7 days, refunds are issued at our discretion and are generally not provided for partial billing periods.",
          ],
          [
            "3. How to Request a Refund",
            "To request a refund, email support@studybuddi.app with your account email and the reason for your request. We aim to respond within 2 business days. Approved refunds are processed back to your original payment method within 5–10 business days.",
          ],
          [
            "4. Annual Subscriptions",
            "For annual plans, you may request a pro-rated refund for the unused portion of your subscription within 30 days of purchase. After 30 days, annual subscriptions are non-refundable.",
          ],
          [
            "5. Exceptions",
            "Refunds will not be issued for accounts that have violated our Terms of Service, including accounts suspended for abuse or fraudulent activity. Refunds are also not available for purchases made through third-party platforms (e.g. App Store, Google Play) — please contact the respective platform for those.",
          ],
          [
            "6. Chargebacks",
            "If you dispute a charge with your bank or credit card issuer before contacting us, we may be unable to offer a refund and your account may be suspended. Please reach out to us first — we're happy to help resolve any billing issues.",
          ],
          [
            "7. Contact",
            "For refund requests or billing questions, email us at support@studybuddi.app. Please include your account email and a description of the issue.",
          ],
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
