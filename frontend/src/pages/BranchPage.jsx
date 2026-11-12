import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Phone, Mail, MapPin, Clock, ChevronRight, CheckCircle2, Navigation } from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag, { SectionHeader } from "../components/site/VxStyle";
import LeadForm from "../components/site/LeadForm";
import { BRANCHES, BRANCH_BY_SLUG } from "../data/branches";

const PHONE_DIAL = "+919875985641";

export default function BranchPage() {
  const { slug } = useParams();
  const branch = BRANCH_BY_SLUG[slug];

  if (!branch) {
    return (
      <PageShell>
        <Seo title="Branch not found · VisaXpert" path={`/branches/${slug}`} />
        <VxStyleTag />
        <div className="max-w-3xl mx-auto px-4 py-32 text-center">
          <p className="text-slate-500 text-sm uppercase tracking-wider">404</p>
          <h1 className="text-4xl font-display mt-4 text-slate-900">Branch not found.</h1>
          <p className="mt-4 text-slate-600">VisaXpert has 5 branches:</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {BRANCHES.map((b) => (
              <Link key={b.slug} to={`/branches/${b.slug}`} className="px-4 py-2 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-sm font-medium">
                {b.city}
              </Link>
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: branch.headline,
    address: {
      "@type": "PostalAddress",
      streetAddress: branch.address,
      addressLocality: branch.city,
      addressCountry: branch.city === "Berlin" ? "DE" : "IN",
    },
    telephone: branch.phone,
    email: branch.email,
    parentOrganization: { "@type": "Organization", name: "VisaXpert Visa & Immigration Services" },
  };

  return (
    <PageShell>
      <Seo
        title={`${branch.headline} · ${branch.region} · VisaXpert`}
        description={`${branch.sub} Walk in, call ${branch.phone}, or email ${branch.email}.`}
        path={`/branches/${branch.slug}`}
        jsonLd={localBusinessLd}
      />
      <VxStyleTag />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-blue-100/70 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5 flex-wrap" aria-label="breadcrumb">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <ChevronRight size={12} />
            <Link to="/branches" className="hover:text-blue-700">Branches</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-medium">{branch.city}</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-7">
              <span className="inline-block text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                {branch.tagline}
              </span>
              <h1 className="mt-5 text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight font-display text-slate-900">
                {branch.headline} {branch.flag && <span className="text-4xl align-middle">{branch.flag}</span>}
              </h1>
              <p className="mt-3 text-slate-500 text-sm uppercase tracking-wider font-semibold">{branch.region}</p>
              <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">{branch.sub}</p>

              <div className="mt-9 grid sm:grid-cols-2 gap-3">
                <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors" data-testid="branch-phone">
                  <Phone size={17} /> {branch.phone}
                </a>
                <a href={`mailto:${branch.email}`} className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 font-semibold hover:border-blue-400 hover:text-blue-700 transition-colors">
                  <Mail size={17} /> {branch.email}
                </a>
              </div>

              <div className="mt-10 grid sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-2 mb-3"><MapPin size={13} /> Address</p>
                  <p className="text-slate-800 text-[15px] leading-relaxed" data-testid="branch-address">{branch.address}</p>
                  {branch.directions && (
                    <a href={branch.directions} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800" data-testid="branch-directions-btn">
                      <Navigation size={14} /> Get directions
                    </a>
                  )}
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-2 mb-3"><Clock size={13} /> Hours</p>
                  {branch.hours.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-[14px]">
                      <span className="text-slate-700">{h.day}</span>
                      <span className="text-slate-900 font-medium">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <LeadForm
                source="branch_page"
                campaign={`branch_${branch.slug}`}
                testId={`branch-${branch.slug}-form`}
                title={`Book your slot in ${branch.city}`}
                sub="Reserve a free counselling session at this branch."
                cta={`Book a slot at ${branch.city}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services at this branch */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Services at this branch"
            title={<>What we handle at<br /><span className="font-display italic text-slate-500">{branch.city}.</span></>}
            intro="Full-service across all VisaXpert branches — this office focuses on the items below."
          />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branch.services.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-5 rounded-2xl bg-white border border-slate-100">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <p className="text-slate-800 font-medium text-[15px]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other branches */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">Other branches</p>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {BRANCHES.filter((b) => b.slug !== branch.slug).map((b) => (
              <Link
                key={b.slug}
                to={`/branches/${b.slug}`}
                className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-300 transition-colors group"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{b.tagline}</p>
                <p className="mt-2 text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  VisaXpert · {b.city} {b.flag}
                </p>
                <p className="text-xs text-slate-500 mt-1">{b.region}</p>
                <span className="inline-flex items-center gap-1 text-sm text-blue-700 font-semibold mt-3">
                  Open page <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
