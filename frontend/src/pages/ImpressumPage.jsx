import { Link } from "react-router-dom";
import { Scale, ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="impressum-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link
            to="/berlin"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
            data-testid="impressum-back-berlin"
          >
            <ArrowLeft size={16} /> Back to Berlin
          </Link>
          <div className="inline-flex items-center gap-2 text-emerald-700 font-bold">
            <Scale size={18} /> VisaXpert Berlin
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
          Impressum
        </h1>
        <p className="text-slate-500 mb-10">
          Angaben gemäß § 5 TMG / Information pursuant to § 5 of the German
          Telemedia Act (TMG)
        </p>

        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-8 text-slate-700 leading-relaxed"
          data-testid="impressum-content"
        >
          {/* Company */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Diensteanbieter / Service Provider
            </h2>
            <p className="font-semibold text-slate-900">
              VisaXpert UG (haftungsbeschränkt)
            </p>
            <p>Belziger Straße 69-71</p>
            <p>10823 Berlin</p>
            <p>Deutschland / Germany</p>
          </section>

          {/* Register */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Registereintrag / Register Entry
            </h2>
            <p>
              <span className="text-slate-500">Registergericht / Registration Court:</span>{" "}
              <strong>Amtsgericht Charlottenburg, Berlin</strong>
            </p>
            <p>
              <span className="text-slate-500">Handelsregisternummer / Commercial Register Number:</span>{" "}
              <strong>HRB 287955 B</strong>
            </p>
            <p>
              <span className="text-slate-500">Gewerbeanmeldung / Business Registration:</span>{" "}
              <strong>Bezirksamt Tempelhof-Schöneberg, Berlin</strong>
            </p>
          </section>

          {/* Tax */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Steuerliche Angaben / Tax Information
            </h2>
            <p>
              <span className="text-slate-500">Umsatzsteuer-Identifikationsnummer (USt-IdNr.) / VAT ID:</span>{" "}
              <strong>beantragt / applied for</strong>
            </p>
            <p>
              <span className="text-slate-500">Steuernummer / Tax Number:</span>{" "}
              <strong>beantragt / applied for</strong>
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Kontakt / Contact
            </h2>
            <p>
              <span className="text-slate-500">Telefon / Phone:</span>{" "}
              <a href="tel:+491784555932" className="text-emerald-700 hover:underline">
                +49 1784555932
              </a>
            </p>
            <p>
              <span className="text-slate-500">E-Mail:</span>{" "}
              <a
                href="mailto:info@visaxpertinternational.co.in"
                className="text-emerald-700 hover:underline"
                data-testid="impressum-email"
              >
                info@visaxpertinternational.co.in
              </a>
            </p>
          </section>

          {/* Responsible per MStV */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV / Responsible
              for content per § 18 (2) MStV
            </h2>
            <p>Sunil Arora</p>
            <p>VisaXpert UG (haftungsbeschränkt)</p>
            <p>Belziger Straße 69-71, 10823 Berlin, Germany</p>
          </section>

          {/* Liability content */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Haftungsausschluss / Disclaimer
            </h2>
            <p className="mb-3">
              <strong>Haftung für Inhalte.</strong> Die Inhalte unserer Seiten
              wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch
              keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7
              Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind
              wir jedoch nicht verpflichtet, übermittelte oder gespeicherte
              fremde Informationen zu überwachen oder nach Umständen zu
              forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p>
              <strong>Liability for content.</strong> Despite careful editorial
              control, we cannot assume any liability for the content of
              external links. The operators of linked websites are solely
              responsible for their content. All information on this website is
              provided to the best of our knowledge but without guarantee of
              accuracy, completeness or timeliness.
            </p>
          </section>

          {/* Copyright */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Urheberrecht / Copyright Notice
            </h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
              diesen Seiten unterliegen dem deutschen Urheberrecht.
              Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
              schriftlichen Zustimmung von VisaXpert UG (haftungsbeschränkt).
            </p>
            <p className="mt-2">
              All texts, images, graphics and other content on this website are
              protected by copyright. Reproduction, modification or
              distribution requires prior written consent from VisaXpert UG
              (haftungsbeschränkt).
            </p>
          </section>

          {/* Dispute */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Streitbeilegung / Dispute Resolution
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              .
            </p>
            <p className="mt-2">
              Wir sind nicht bereit oder verpflichtet, an
              Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG). / We are
              neither willing nor obligated to participate in dispute
              resolution proceedings before a consumer arbitration board as
              defined by the VSBG.
            </p>
          </section>

          {/* Disclaimer about role */}
          <section className="rounded-xl bg-amber-50 border border-amber-200 p-5">
            <h3 className="font-semibold text-amber-900 mb-2">
              Hinweis zur Tätigkeit / About our role
            </h3>
            <p className="text-amber-900">
              VisaXpert UG (haftungsbeschränkt) ist eine private
              Bildungsberatung und steht in keinerlei Verbindung zu einer
              Botschaft, einem Konsulat, einer Behörde oder einer Universität.
              Wir garantieren keine Zulassungen oder Visumerteilungen. /
              VisaXpert UG is a private education consultancy and is not
              affiliated with any embassy, consulate, government body, or
              university. We do not guarantee admissions or visa approvals.
            </p>
          </section>

          <p className="text-xs text-slate-400">
            Stand / Last updated: Januar / January 2026
          </p>
        </div>
      </main>
    </div>
  );
}
