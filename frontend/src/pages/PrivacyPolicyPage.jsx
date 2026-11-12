import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="privacy-policy-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium" data-testid="privacy-back-home">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 text-blue-600 font-bold">
            <ShieldCheck size={18} /> VisaXpert
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 mb-10">Last updated: January 2026</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. About VisaXpert</h2>
            <p>
              VisaXpert International is a private overseas-education consultancy operated from India with branch
              offices in Ludhiana, Amritsar, Pathankot and Jammu, and a representative office in Berlin, Germany.
              We are an independent consulting firm and are <strong>not affiliated with any government body, embassy,
              consulate, or university</strong>. We provide guidance, documentation support, and counselling services
              for students applying for higher education and study visas abroad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. What information we collect</h2>
            <p className="mb-2">When you submit a form on our website, we collect only the data you voluntarily provide:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Full name</li>
              <li>Email address</li>
              <li>Mobile / phone number</li>
              <li>City and country of interest</li>
              <li>Preferred counselling mode and any additional details you choose to share</li>
            </ul>
            <p className="mt-3">
              We do not collect government IDs, passwords, payment details, or any sensitive personal data on this
              website. We do not run keystroke loggers or hidden trackers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How we use your information</h2>
            <p className="mb-2">Your information is used strictly for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Contacting you to schedule a counselling session</li>
              <li>Sending you information about your study-abroad query</li>
              <li>Sending event reminders (e.g., Germany Education Fair) you registered for</li>
              <li>Improving our services and counselling quality</li>
            </ul>
            <p className="mt-3">
              We will never sell, rent or trade your personal data. We do not share your information with third
              parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Communication consent</h2>
            <p>
              By submitting a form on our website, you consent to be contacted by VisaXpert via phone call, SMS,
              email and/or WhatsApp regarding your enquiry. You can opt out at any time by replying
              &quot;STOP&quot; to a WhatsApp/SMS message or by emailing
              <a href="mailto:info@visaxpertinternational.co.in" className="text-blue-600 underline ml-1">info@visaxpertinternational.co.in</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Cookies and analytics</h2>
            <p>
              We use Google Tag Manager, Google Analytics and Google Ads conversion tracking to understand how
              visitors use our site and to measure ad performance. These tools may set cookies in your browser.
              You can disable cookies in your browser settings; doing so will not prevent you from submitting our
              forms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Data retention and security</h2>
            <p>
              Your data is stored securely on encrypted databases. We retain enquiry data for as long as is
              necessary to serve your application and for legitimate business / legal record-keeping purposes
              (typically up to 5 years), after which it is deleted on request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Your rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Request a copy of the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li>Withdraw consent for further communication</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email
              <a href="mailto:info@visaxpertinternational.co.in" className="text-blue-600 underline ml-1">info@visaxpertinternational.co.in</a>
              with the subject line &quot;Privacy Request&quot;. We respond within 7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Important disclaimer</h2>
            <p>
              <strong>VisaXpert does not guarantee visa approvals or university admissions.</strong> Visa decisions
              are made solely by the destination country&apos;s embassy/consulate. Admission decisions are made
              solely by the respective university. Any discounts, scholarships or fee waivers mentioned on our
              promotional pages (e.g., &ldquo;up to &euro;1000 discount&rdquo;, &ldquo;up to 50% processing-fee
              waiver&rdquo;) are <strong>indicative offers from participating universities at our education fairs,
              subject to the university&apos;s own evaluation and approval</strong>. They are not guaranteed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Contact us</h2>
            <p>
              <strong>VisaXpert International</strong><br />
              Email: <a href="mailto:info@visaxpertinternational.co.in" className="text-blue-600 underline">info@visaxpertinternational.co.in</a><br />
              Phone (India): <a href="tel:9875985641" className="text-blue-600 underline">+91 9875985641</a><br />
              Berlin Office: Belziger Strasse 69-71, 10823, Berlin, Germany
            </p>
          </section>

          {/* ===================== GDPR / DSGVO SECTION ===================== */}
          <section className="pt-6 border-t-2 border-emerald-200" data-testid="privacy-gdpr-section">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold mb-3">
              Germany / EU — DSGVO &amp; BDSG addendum
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Datenschutzerklärung (Germany / EU GDPR)
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              This section applies in addition to the policy above for visitors
              from Germany and the European Union, and governs data collected
              via our <Link to="/berlin" className="text-emerald-700 underline">/berlin</Link>{" "}
              landing page and any other interactions with our Berlin entity.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">
              Verantwortlicher / Controller
            </h3>
            <p>
              VisaXpert UG (haftungsbeschränkt)<br />
              Belziger Straße 69-71, 10823 Berlin, Deutschland<br />
              E-Mail: <a href="mailto:info@visaxpertinternational.co.in" className="text-emerald-700 underline">info@visaxpertinternational.co.in</a><br />
              Telefon: <a href="tel:+491784555932" className="text-emerald-700 underline">+49 1784555932</a><br />
              Eingetragen beim Amtsgericht Charlottenburg, HRB 287955 B.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Rechtsgrundlagen / Legal basis
            </h3>
            <p>
              Wir verarbeiten personenbezogene Daten ausschließlich auf
              folgender Grundlage:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Art. 6 (1) lit. a DSGVO</strong> – Einwilligung beim
                Absenden des Beratungsformulars.
              </li>
              <li>
                <strong>Art. 6 (1) lit. b DSGVO</strong> – Anbahnung und
                Erfüllung des Beratungsvertrages.
              </li>
              <li>
                <strong>Art. 6 (1) lit. f DSGVO</strong> – berechtigtes
                Interesse an Reichweitenmessung und Sicherheit unserer Website.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Kategorien personenbezogener Daten
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, E-Mail-Adresse, Telefonnummer</li>
              <li>Stadt &amp; Zielland, aktuelle Universität (sofern angegeben)</li>
              <li>Gewünschter Beratungsmodus (online, telefonisch, im Berliner Büro)</li>
              <li>Technische Daten: IP-Adresse, Browser, Zeitpunkt des Aufrufs</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Empfänger / Auftragsverarbeiter
            </h3>
            <p className="mb-2">
              Zur Erbringung unserer Leistungen setzen wir folgende
              Auftragsverarbeiter mit Auftragsverarbeitungsverträgen (Art. 28
              DSGVO) ein:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Resend Inc.</strong> (USA) – Versand von
                Bestätigungs- und Erinnerungs-E-Mails. SCC nach Art. 46 DSGVO.
              </li>
              <li>
                <strong>AiSensy / Triny Innovations (Indien)</strong> –
                WhatsApp Business Messaging.
              </li>
              <li>
                <strong>Google Ireland Limited</strong> – Google Analytics 4,
                Google Tag Manager, Google Ads Conversion-Tracking.
              </li>
              <li>
                <strong>Hosting</strong> – Cloud-Provider innerhalb der EU bzw.
                mit Standardvertragsklauseln.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Cookies &amp; Tracking
            </h3>
            <p>
              Wir setzen technisch notwendige Cookies sowie – nach Ihrer
              ausdrücklichen Einwilligung über das Cookie-Banner (§ 25 Abs. 1
              TTDSG, Art. 6 Abs. 1 lit. a DSGVO) – Marketing- und
              Analyse-Cookies (Google Analytics 4, Google Ads). Sie können Ihre
              Einwilligung jederzeit über das Cookie-Banner widerrufen.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Speicherdauer / Retention
            </h3>
            <p>
              Anfrage- und Beratungsdaten werden gelöscht, sobald der Zweck
              ihrer Verarbeitung entfällt – spätestens nach Ablauf der
              gesetzlichen Aufbewahrungsfristen (i. d. R. 6 Jahre nach § 257 HGB
              bzw. 10 Jahre nach § 147 AO, soweit anwendbar). Server-Logfiles
              werden nach spätestens 14 Tagen anonymisiert.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Ihre Rechte als betroffene Person
            </h3>
            <p className="mb-2">
              Sie haben gemäß DSGVO insbesondere das Recht auf:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Auskunft (Art. 15 DSGVO)</li>
              <li>Berichtigung (Art. 16 DSGVO)</li>
              <li>Löschung (&quot;Recht auf Vergessenwerden&quot;, Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch (Art. 21 DSGVO)</li>
              <li>Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
            </ul>
            <p className="mt-3">
              Anfragen zu Ihren Rechten richten Sie bitte an{" "}
              <a href="mailto:info@visaxpertinternational.co.in" className="text-emerald-700 underline">
                info@visaxpertinternational.co.in
              </a>
              . Wir antworten innerhalb der gesetzlichen Frist von einem Monat.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Beschwerderecht bei einer Aufsichtsbehörde
            </h3>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
              zu beschweren – in unserem Fall die{" "}
              <strong>
                Berliner Beauftragte für Datenschutz und Informationsfreiheit
              </strong>{" "}
              (
              <a
                href="https://www.datenschutz-berlin.de"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline"
              >
                www.datenschutz-berlin.de
              </a>
              ).
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Drittlandtransfer
            </h3>
            <p>
              Sofern Daten an Empfänger außerhalb der EU übermittelt werden
              (z. B. Resend in den USA, AiSensy in Indien), erfolgt dies auf
              Grundlage von EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c
              DSGVO) bzw. Ihrer ausdrücklichen Einwilligung (Art. 49 Abs. 1
              lit. a DSGVO).
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Pflicht zur Bereitstellung
            </h3>
            <p>
              Die Bereitstellung Ihrer personenbezogenen Daten ist weder
              gesetzlich noch vertraglich vorgeschrieben. Sie sind jedoch
              erforderlich, damit wir Sie kontaktieren und beraten können.
              Ohne diese Angaben können wir keine Beratung anbieten.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              Automatisierte Entscheidungsfindung
            </h3>
            <p>
              Eine automatisierte Entscheidungsfindung einschließlich Profiling
              (Art. 22 DSGVO) findet nicht statt.
            </p>

            <p className="text-xs text-slate-400 mt-6">
              Siehe auch unser{" "}
              <Link to="/impressum" className="text-emerald-700 underline">
                Impressum
              </Link>
              .
            </p>
          </section>
          {/* ===================== END GDPR SECTION ===================== */}

          <section className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              See also our <Link to="/terms" className="text-blue-600 underline">Terms of Service</Link>{" "}
              and our <Link to="/impressum" className="text-blue-600 underline">Impressum</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
