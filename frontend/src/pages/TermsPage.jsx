import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="terms-page">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium" data-testid="terms-back-home">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 text-blue-600 font-bold">
            <FileText size={18} /> VisaXpert
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 mb-10">Last updated: January 2026</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance</h2>
            <p>
              By accessing this website or submitting any form, you agree to these Terms of Service and to our
              <Link to="/privacy-policy" className="text-blue-600 underline ml-1">Privacy Policy</Link>. If you do not
              agree, please do not use this website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Nature of services</h2>
            <p>
              VisaXpert International is an independent overseas-education consultancy. We provide:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Counselling on course and university selection</li>
              <li>Documentation review and application support</li>
              <li>Visa-application guidance and interview preparation</li>
              <li>Pre-departure briefings and post-arrival support</li>
            </ul>
            <p className="mt-3">
              We are <strong>not</strong> a government body, embassy, consulate, university, or recruitment agent
              acting under any official accreditation other than our independent ICEF certification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. No guarantee of outcomes</h2>
            <p>
              <strong>We do not guarantee visa approvals or university admissions.</strong> All final decisions
              rest with the destination country&apos;s consular authorities and the respective universities. Our
              counsellors&apos; opinions on the strength of an application are advisory only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Promotional offers and education fairs</h2>
            <p>
              Discounts, scholarships, fee waivers, and &ldquo;spot admission&rdquo; offers mentioned on our
              promotional pages (including the Germany Education Fair) are <strong>indicative offers from
              participating universities, subject to the university&apos;s own evaluation, eligibility checks and
              approval</strong>. Phrases such as &ldquo;up to &euro;1000 discount&rdquo; or &ldquo;up to 50% fee
              waiver&rdquo; describe the maximum possible benefit; the actual benefit you receive depends entirely on
              the university&apos;s assessment of your profile. VisaXpert acts only as a facilitator between the
              student and the university.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. University logos and trademarks</h2>
            <p>
              Logos, trademarks and names of universities shown on our pages are the property of their respective
              owners and are displayed solely to indicate participation at our education fairs or counselling
              sessions. Display of a logo does not imply endorsement of VisaXpert by that university beyond the
              specific event referenced. If you are an affiliated university and would like a logo removed,
              please email us and we will action the request within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. User obligations</h2>
            <p>You agree to provide accurate and truthful information on our forms and during counselling. Submitting
              false information may result in termination of services without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Refunds and cancellations</h2>
            <p>
              Initial counselling sessions and event registrations are <strong>free of charge</strong>. For paid
              services, refund terms are governed by the individual service agreement signed at the time of
              engagement. Please contact your counsellor for the applicable refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, VisaXpert International&apos;s liability arising out of or
              relating to any service is limited to the fees actually paid by the client for that specific
              service. We are not liable for indirect, incidental or consequential damages, including loss of
              admission, visa rejection, or change in immigration policy by any country.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Governing law</h2>
            <p>
              These Terms are governed by the laws of India. Any dispute will be subject to the exclusive
              jurisdiction of the courts at Ludhiana, Punjab.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Contact</h2>
            <p>
              <strong>VisaXpert International</strong><br />
              Email: <a href="mailto:info@visaxpertinternational.co.in" className="text-blue-600 underline">info@visaxpertinternational.co.in</a><br />
              Phone: <a href="tel:9875985641" className="text-blue-600 underline">+91 9875985641</a>
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              See also our <Link to="/privacy-policy" className="text-blue-600 underline">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
