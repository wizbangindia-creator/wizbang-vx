import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Globe2 } from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag, { SectionHeader } from "../components/site/VxStyle";
import { COUNTRIES } from "../data/countries";
import OtherCountryCard from "../components/site/OtherCountryCard";

export default function CountriesIndexPage() {
  return (
    <PageShell>
      <Seo
        title="Study Abroad Countries · VisaXpert"
        description="VisaXpert handles 9 study-abroad destinations: Germany, Canada, Australia, Ireland, Netherlands, Sweden, Dubai (UAE), Finland & Denmark. Pick a country to see why it's worth your shortlist."
        path="/countries"
      />
      <VxStyleTag />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5" aria-label="breadcrumb">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-medium">Countries</span>
          </nav>
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-700 flex items-center gap-2"><Globe2 size={13} /> Countries we serve</p>
          <h1 className="mt-4 text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight font-display text-slate-900">
            Nine destinations.<br /><span className="font-display italic text-slate-500">One trusted team.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl">Each market has its own visa playbook in our office. Pick a country to read why it deserves a serious look.</p>
        </div>
      </section>

      <section className="pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COUNTRIES.map((c) => (
            <Link
              key={c.slug}
              to={`/countries/${c.slug}`}
              className={`relative group p-6 rounded-3xl bg-white border ${c.highlight ? "border-orange-200 shadow-orange-100/60 shadow-xl" : "border-slate-100"} hover:-translate-y-1 hover:shadow-xl transition-all`}
              data-testid={`countries-index-${c.slug}`}
            >
              {c.highlight && (
                <span className="absolute -top-2.5 right-5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white shadow">Flagship</span>
              )}
              <p className="text-4xl mb-3 leading-none">{c.flag}</p>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{c.name}</h3>
              <p className="text-xs uppercase tracking-wider font-bold text-blue-700 mt-1">{c.tagline}</p>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-3">{c.hero.sub}</p>
              <span className="inline-flex items-center gap-1 text-sm text-blue-700 font-semibold mt-5 group-hover:gap-2 transition-all">
                Explore {c.name} <ArrowRight size={13} />
              </span>
            </Link>
          ))}
          <OtherCountryCard testId="countries-index-other" />
        </div>
      </section>
    </PageShell>
  );
}
