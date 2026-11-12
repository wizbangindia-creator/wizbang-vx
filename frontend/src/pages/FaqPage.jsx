import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Info, Flag, Sparkles, ShieldCheck, Users, Search } from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag from "../components/site/VxStyle";
import { FAQ_CATEGORIES, FLAT_FAQS } from "../data/faqs";

const ICONS = { info: Info, flag: Flag, sparkles: Sparkles, shield: ShieldCheck, users: Users };

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FLAT_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState(FAQ_CATEGORIES[0]?.key);
  const [openSet, setOpenSet] = useState(() => new Set());

  const q = query.trim().toLowerCase();
  const filtered = FAQ_CATEGORIES.map((c) => ({
    ...c,
    items: q
      ? c.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q))
      : c.items,
  })).filter((c) => c.items.length > 0);

  const toggle = (id) => {
    const next = new Set(openSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpenSet(next);
  };

  return (
    <PageShell>
      <Seo
        title="FAQ · VisaXpert · Frequently asked questions on study abroad"
        description="Answers to common questions on Germany, Canada, Australia, IELTS, visa filing, costs and timelines — from VisaXpert's 14 years of student counselling."
        path="/faq"
        jsonLd={faqLd}
      />
      <VxStyleTag />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5" aria-label="breadcrumb">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-medium">FAQ</span>
          </nav>
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-700">Frequently asked</p>
          <h1 className="mt-4 text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight font-display text-slate-900">
            The questions <br />
            <span className="font-display italic text-slate-500">we hear every day.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl">
            Search the categories below, or just type your question. Can't find what you're looking for?
            <Link to="/contact" className="text-blue-700 font-semibold hover:underline ml-1">Ask us directly.</Link>
          </p>

          {/* Search */}
          <div className="mt-10 relative max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for IELTS, Germany, blocked account…"
              className="w-full pl-11 pr-4 py-3.5 rounded-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-sm bg-white"
              data-testid="faq-search"
            />
          </div>
        </div>
      </section>

      <section className="pb-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">Categories</p>
            <div className="space-y-1 sticky top-24">
              {FAQ_CATEGORIES.map((c) => {
                const Icon = ICONS[c.icon] || Info;
                const active = activeKey === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => {
                      setActiveKey(c.key);
                      const el = document.getElementById(`faq-cat-${c.key}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-100"
                    }`}
                    data-testid={`faq-cat-btn-${c.key}`}
                  >
                    <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />
                    {c.title}
                    <span className="ml-auto text-[11px] text-slate-400 font-mono">{c.items.length}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-9 space-y-14" data-testid="faq-content">
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500">No matches for <span className="font-semibold text-slate-700">"{query}"</span>.</p>
                <Link to="/contact" className="mt-4 inline-block text-blue-700 font-semibold hover:underline">Ask a counsellor directly →</Link>
              </div>
            )}
            {filtered.map((c) => {
              const Icon = ICONS[c.icon] || Info;
              return (
                <div key={c.key} id={`faq-cat-${c.key}`} className="scroll-mt-28">
                  <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                    <Icon size={13} /> {c.title}
                  </p>
                  <h2 className="mt-4 text-3xl font-display text-slate-900 leading-tight">{c.title}</h2>
                  <div className="mt-6 space-y-3">
                    {c.items.map((f, idx) => {
                      const id = `${c.key}-${idx}`;
                      const open = openSet.has(id);
                      return (
                        <div key={id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid={`faq-item-${id}`}>
                          <button
                            onClick={() => toggle(id)}
                            className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-slate-50"
                          >
                            <span className="font-semibold text-slate-900 text-[15px]">{f.q}</span>
                            <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                          </button>
                          {open && (
                            <div className="px-6 pb-5 text-slate-600 leading-relaxed text-[15px]">{f.a}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
