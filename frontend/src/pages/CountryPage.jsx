import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Sparkles, GraduationCap, Coins,
  CalendarDays, FileCheck, Phone, Globe2, ChevronRight,
} from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag, { SectionHeader } from "../components/site/VxStyle";
import LeadForm from "../components/site/LeadForm";
import { COUNTRIES, COUNTRY_BY_SLUG } from "../data/countries";

const PHONE_DIAL = "+919875985641";

export default function CountryPage() {
  const { slug } = useParams();
  const country = COUNTRY_BY_SLUG[slug];

  if (!country) {
    return (
      <PageShell>
        <Seo title="Country not found · VisaXpert" path={`/countries/${slug}`} />
        <VxStyleTag />
        <div className="max-w-3xl mx-auto px-4 py-32 text-center">
          <p className="text-slate-500 text-sm uppercase tracking-wider">404</p>
          <h1 className="text-4xl font-display mt-4 text-slate-900">Country not in our directory yet.</h1>
          <p className="mt-4 text-slate-600">Try one of the destinations we support:</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {COUNTRIES.map((c) => (
              <Link
                key={c.slug}
                to={`/countries/${c.slug}`}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                {c.flag} {c.name}
              </Link>
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: country.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <PageShell>
      <Seo
        title={`Study in ${country.name} · VisaXpert · ${country.tagline}`}
        description={country.hero.sub}
        path={`/countries/${country.slug}`}
        jsonLd={faqLd}
      />
      <VxStyleTag />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-100/70 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-28">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5 flex-wrap" aria-label="breadcrumb">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <ChevronRight size={12} />
            <Link to="/countries" className="hover:text-blue-700">Countries</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-medium">{country.name}</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7 vx-fade-up">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ring-1 ${country.accent.bg} ${country.accent.text} ${country.accent.ring}`}>
                {country.flag} {country.tagline}
              </span>
              <h1 className="mt-5 text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight font-display text-slate-900">
                {country.hero.headline}
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                {country.hero.sub}
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <a
                  href="#consultation"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-slate-900 text-white font-semibold text-[15px] hover:bg-slate-800 transition-all shadow-[0_8px_30px_-6px_rgba(15,23,42,.45)]"
                  data-testid="country-hero-cta"
                >
                  Free {country.name} consultation
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href={`tel:${PHONE_DIAL}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white border-2 border-slate-200 text-slate-800 font-semibold text-[15px] hover:border-blue-400 hover:text-blue-700 transition-colors"
                >
                  <Phone size={16} /> +91 98759 85641
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> ICEF certified</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Free counselling</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> 4000+ visas approved</div>
              </div>
            </div>

            <div id="consultation" className="lg:col-span-5 vx-fade-up" style={{ animationDelay: ".12s" }}>
              <LeadForm
                defaultCountry={country.name}
                source="country_page"
                campaign={`country_${country.slug}`}
                testId={`country-${country.slug}-form`}
                title={`Book your free ${country.name} call`}
                sub="Tell us a little about you — we'll do the rest."
                cta={`Apply for ${country.name}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow={`Why ${country.name}`}
            title={<>Six reasons {country.name}<br /><span className="font-display italic text-slate-500">deserves a serious look.</span></>}
            intro="The same checklist our counsellors run with every student. Honest, country-specific, no marketing fluff."
          />
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {country.whyChoose.map((w, i) => (
              <div key={i} className="p-7 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300" data-testid={`why-${country.slug}-${i}`}>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center mb-4">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{w.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top universities */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Top universities"
            title={<>Universities we<br /><span className="font-display italic text-slate-500">place students at.</span></>}
            intro="A short, opinionated list — we file applications to these every intake."
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {country.topUniversities.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 grid place-items-center rounded-xl bg-white shadow-sm text-blue-700 shrink-0"><GraduationCap size={18} /></div>
                <p className="text-slate-800 font-medium text-[15px]">{u}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-5">+ {country.name === "Germany" ? "30+" : "20+"} more partner universities. Ask your counsellor for a full list.</p>
        </div>
      </section>

      {/* Visa journey */}
      <section className="py-20 lg:py-28 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 vx-grid-bg opacity-[0.08] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-wider text-blue-300 font-semibold">The journey</p>
            <h2 className="mt-4 text-4xl lg:text-6xl font-display leading-[1.05]">
              From signup to <span className="vx-gradient-text">{country.name}</span>.
            </h2>
            <p className="mt-4 text-slate-300 text-lg max-w-2xl">A clear, milestone-by-milestone plan — refined across thousands of student journeys.</p>
          </div>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {country.visaPath.map((s, i) => (
              <div key={i} className="rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center text-blue-300 font-bold text-sm">{i + 1}</div>
                <p className="mt-4 text-white font-semibold">{s.step}</p>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost + intakes */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">Numbers you'll need</p>
            <h2 className="mt-3 text-3xl lg:text-4xl font-display text-slate-900 leading-tight">
              Approximate cost <span className="font-display italic text-slate-500">of studying in {country.name}.</span>
            </h2>
            <div className="mt-6 bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
              {country.cost.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Coins size={16} className="text-blue-600" />
                    <p className="text-slate-700 text-sm">{c.item}</p>
                  </div>
                  <p className="text-slate-900 font-semibold text-sm">{c.val}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Figures are indicative for 2024–25. Exact numbers vary by program.</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">When you can start</p>
            <h2 className="mt-3 text-3xl lg:text-4xl font-display text-slate-900 leading-tight">
              {country.name} <span className="font-display italic text-slate-500">intakes.</span>
            </h2>
            <div className="mt-6 space-y-3">
              {country.intakes.map((intake, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100">
                  <div className="w-11 h-11 grid place-items-center rounded-xl bg-orange-100 text-orange-600"><CalendarDays size={18} /></div>
                  <div>
                    <p className="text-slate-900 font-semibold">{intake}</p>
                    <p className="text-xs text-slate-500">Start your application 8–12 months in advance.</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/contact"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Need a more detailed timeline? Talk to a counsellor <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="FAQ"
            title={`Common questions about ${country.name}`}
            intro="More answers in our full FAQ centre, or just call us."
          />
          <div className="mt-12 space-y-3">
            {country.faqs.map((f, i) => (
              <details key={i} className="group rounded-2xl border border-slate-200 bg-white open:shadow-sm">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-6 py-5">
                  <span className="font-semibold text-slate-900 text-[15px]">{f.q}</span>
                  <FileCheck size={16} className="text-blue-600 shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-6 pb-5 text-slate-600 leading-relaxed text-[15px]">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/faq" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
              Read full FAQ <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Cross-link other countries */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold flex items-center gap-2"><Globe2 size={14} /> Explore other destinations</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {COUNTRIES.filter((c) => c.slug !== country.slug).map((c) => (
              <Link
                key={c.slug}
                to={`/countries/${c.slug}`}
                className="px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                {c.flag} {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
