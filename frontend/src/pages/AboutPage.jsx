import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ChevronRight, ShieldCheck, Eye, HeartHandshake, Award, Users, MapPin, GraduationCap, ArrowRight } from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag, { SectionHeader } from "../components/site/VxStyle";
import { imgSrc } from "../components/site/StudentSlider";
import { useEnquiry } from "../components/site/EnquiryModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FOUNDERS = [
  { name: "Mr. Sunil Arora", role: "Founder & Director", bio: "Started VisaXpert in 2012 with one belief: every student deserves honest advice and a plan they can trust. He still leads counselling and visa strategy personally." },
  { name: "Mr. Rajesh Joshi", role: "Co-Founder & Director", bio: "Built VisaXpert's processes and branch network across Punjab and Jammu, making sure every file is handled with the same care, accuracy and accountability." },
];

const PILLARS = [
  { Icon: HeartHandshake, title: "Genuine", desc: "We only recommend courses and countries that truly fit your profile, budget and goals — never what simply earns us more." },
  { Icon: Eye, title: "Transparent", desc: "Clear fees in writing, honest chances of success and full visibility of your file at every step. No hidden charges, no surprises." },
  { Icon: ShieldCheck, title: "Reliable", desc: "14+ years, 4,000+ visas and the same team answering your call from first counselling to the day you land." },
];

const CREDENTIALS = [
  { Icon: Award, v: "ICEF", l: "Certified agency" },
  { Icon: GraduationCap, v: "4,000+", l: "Students placed" },
  { Icon: Users, v: "14+", l: "Years of trust" },
  { Icon: MapPin, v: "5", l: "Branches · India & Berlin" },
];

const initials = (n) => n.replace(/^Mr\.\s*/, "").split(" ").map((p) => p[0]).join("").slice(0, 2);

function useTeam() {
  const [team, setTeam] = useState([]);
  useEffect(() => { axios.get(`${API}/profiles/team`).then((r) => setTeam(r.data.items)).catch(() => {}); }, []);
  return team;
}

export default function AboutPage() {
  const team = useTeam();
  const { openEnquiry } = useEnquiry();
  const founderPhoto = (name) => team.find((t) => /founder/i.test(t.designation) && name.toLowerCase().includes(t.name.toLowerCase().replace(/^mr\.?\s*/, "").split(" ")[0]))?.image_url;
  const members = team.filter((t) => !/founder/i.test(t.designation));

  return (
    <PageShell>
      <Seo title="About VisaXpert · Genuine, transparent & reliable since 2012" description="Meet VisaXpert — founded by Mr. Sunil Arora and Mr. Rajesh Joshi. ICEF-certified, 14+ years, 4,000+ students. A genuine, transparent and reliable study-abroad team." path="/about" />
      <VxStyleTag />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5"><Link to="/" className="hover:text-blue-700">Home</Link><ChevronRight size={12} /><span className="text-slate-700 font-medium">About</span></nav>
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-700">About VisaXpert</p>
          <h1 className="mt-4 text-[44px] sm:text-[64px] lg:text-[84px] leading-[1.02] font-display text-slate-900 max-w-5xl" data-testid="about-title">
            Honest advice.<br /><span className="vx-gradient-text italic">Real outcomes.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
            Since 2012, VisaXpert has helped more than 4,000 students and families take one of the biggest decisions of their lives. We do it the only way we know — genuinely, transparently and reliably.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-slate-950 text-white" data-testid="about-approach">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-300">The VisaXpert approach</p>
          <h2 className="mt-4 text-4xl lg:text-6xl font-display leading-[1.05]">Three promises we<br /><span className="italic text-slate-400">never compromise on.</span></h2>
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="rounded-3xl bg-white/5 border border-white/10 p-8 hover:bg-white/10 transition-colors" data-testid={`about-pillar-${p.title.toLowerCase()}`}>
                <div className="flex items-center justify-between">
                  <p.Icon size={28} className="text-orange-300" />
                  <span className="font-display text-5xl text-white/15">0{i + 1}</span>
                </div>
                <h3 className="mt-8 text-3xl font-display">{p.title}</h3>
                <p className="mt-3 text-slate-300 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Founders" title={<>The people behind<br /><span className="font-display italic text-slate-500">VisaXpert.</span></>} />
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {FOUNDERS.map((f) => {
              const photo = founderPhoto(f.name);
              return (
                <div key={f.name} className="p-8 rounded-[32px] border border-slate-100 bg-gradient-to-br from-white to-blue-50/40 flex flex-col sm:flex-row gap-6" data-testid={`founder-${initials(f.name).toLowerCase()}`}>
                  <div className="w-32 h-32 rounded-3xl overflow-hidden shrink-0 bg-gradient-to-br from-blue-700 to-blue-500 grid place-items-center text-white font-display text-4xl">
                    {photo ? <img src={imgSrc(photo)} alt={f.name} className="w-full h-full object-cover" /> : initials(f.name)}
                  </div>
                  <div>
                    <p className="text-2xl font-display text-slate-900">{f.name}</p>
                    <p className="text-sm font-semibold text-orange-600 mt-1">{f.role}</p>
                    <p className="mt-4 text-slate-600 leading-relaxed">{f.bio}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50" data-testid="about-credentials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-blue-700">Certified & trusted</p>
              <h2 className="mt-3 text-3xl lg:text-4xl font-display text-slate-900">ICEF certified. Recognised by universities worldwide.</h2>
              <p className="mt-4 text-slate-600">ICEF certification means our counselling meets the global standard universities rely on when choosing the agencies they work with.</p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CREDENTIALS.map((c) => (
                <div key={c.l} className="rounded-3xl bg-white border border-slate-100 p-6">
                  <c.Icon size={20} className="text-blue-700" />
                  <p className="mt-4 text-3xl font-bold text-slate-900">{c.v}</p>
                  <p className="text-sm text-slate-500 mt-1">{c.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {members.length > 0 && (
        <section className="py-20 lg:py-28 bg-white" data-testid="about-team">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="Our team" title={<>The counsellors<br /><span className="font-display italic text-slate-500">you'll actually meet.</span></>} />
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {members.map((m) => (
                <div key={m.profile_id} className="group" data-testid={`team-member-${m.profile_id}`}>
                  <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-slate-100">
                    <img src={imgSrc(m.image_url)} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-900">{m.name}</p>
                  <p className="text-sm text-slate-500">{m.designation}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-display text-slate-900">Start with a free 30-minute call.</h2>
          <button onClick={() => openEnquiry({ origin: "about_page" })} className="mt-8 inline-flex items-center gap-2 px-7 py-4 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800" data-testid="about-book-btn">
            Book free consultation <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </PageShell>
  );
}
