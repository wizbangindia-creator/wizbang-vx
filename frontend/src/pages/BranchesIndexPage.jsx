import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Phone, Clock, MapPin } from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag from "../components/site/VxStyle";
import { BRANCHES } from "../data/branches";

export default function BranchesIndexPage() {
  return (
    <PageShell>
      <Seo
        title="VisaXpert Branches · 5 walk-in offices · Punjab, Jammu, Berlin"
        description="Walk in to any of our 5 branches across Ludhiana, Amritsar, Jammu, Pathankot or Berlin. Real on-ground support — including post-arrival help in Germany."
        path="/branches"
      />
      <VxStyleTag />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5" aria-label="breadcrumb">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-medium">Branches</span>
          </nav>
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-700 flex items-center gap-2"><MapPin size={13} /> Five branches</p>
          <h1 className="mt-4 text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight font-display text-slate-900">
            Walk-in offices across<br /><span className="font-display italic text-slate-500">Punjab, Jammu & Berlin.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl">
            Visit any branch for a free 30-minute consultation. Our Berlin office uniquely supports students after they land in Germany.
          </p>
        </div>
      </section>

      <section className="pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BRANCHES.map((b) => (
            <Link
              key={b.slug}
              to={`/branches/${b.slug}`}
              className="group p-7 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all"
              data-testid={`branches-index-${b.slug}`}
            >
              <span className="inline-block text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{b.tagline}</span>
              <h3 className="mt-4 text-2xl font-display text-slate-900 group-hover:text-blue-700 transition-colors">
                VisaXpert · {b.city} {b.flag}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{b.region}</p>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-2">{b.sub}</p>
              <div className="mt-5 pt-5 border-t border-slate-100 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-700"><Phone size={14} className="text-blue-600" /> {b.phone}</p>
                <p className="flex items-center gap-2 text-slate-700"><Clock size={14} className="text-blue-600" /> {b.hours[0] ? `${b.hours[0].day} ${b.hours[0].time}` : "Mon–Sat"}</p>
                <p className="flex items-start gap-2 text-slate-600"><MapPin size={14} className="text-blue-600 mt-0.5 shrink-0" /> <span className="line-clamp-2">{b.address}</span></p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm text-blue-700 font-semibold mt-5 group-hover:gap-2 transition-all">
                Open page <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
