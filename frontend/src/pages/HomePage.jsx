import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Award,
  Star,
  Plane,
  FileText,
  MapPin,
  Phone,
  Mail,
  Quote,
  ChevronDown,
  Building2,
  Users,
  TrendingUp,
  PlayCircle,
  X as XIcon,
  HeartHandshake,
  Eye,
} from "lucide-react";

import Navbar from "../components/site/Navbar";
import Footer from "../components/site/Footer";
import Seo from "../components/site/Seo";
import { VIDEO_TESTIMONIALS } from "../data/videoTestimonials";
import { COUNTRIES as ALL_COUNTRIES } from "../data/countries";
import { toast } from "sonner";
import { useEnquiry } from "../components/site/EnquiryModal";
import OtherCountryCard from "../components/site/OtherCountryCard";
import StudentSlider from "../components/site/StudentSlider";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PHONE_DIAL = "+919875985641";

// ─── Static content ────────────────────────────────────────────────────────
const STATS = [
  { value: "14+",    label: "Years of expertise",    sub: "Since 2012",    Icon: Award },
  { value: "4,000+", label: "Visas approved",        sub: "Across 9 countries", Icon: ShieldCheck },
  { value: "5",      label: "Branches",              sub: "Punjab · Jammu · Berlin", Icon: MapPin },
  { value: "ICEF",   label: "Certified agency",      sub: "Trust by design", Icon: Sparkles },
];

const COUNTRIES = ALL_COUNTRIES.map((c) => ({
  name: c.name,
  flag: c.flag,
  slug: c.slug,
  note: c.tagline,
  highlight: c.highlight,
  desc: c.hero.sub.length > 90 ? c.hero.sub.slice(0, 88) + "…" : c.hero.sub,
}));

const SERVICES = [
  { Icon: GraduationCap, title: "University admissions",  desc: "Profile evaluation, course-fit, applications & document review." },
  { Icon: FileText,      title: "Student visa filing",    desc: "End-to-end visa processing across 8+ embassies with success-rate focus." },
  { Icon: Sparkles,      title: "Scholarship guidance",   desc: "We find and apply for scholarships and fee waivers that fit your profile." },
  { Icon: Plane,         title: "Pre-departure briefings",desc: "Travel, banking, SIM, accommodation — covered before you fly." },
  { Icon: Building2,     title: "University transfer",    desc: "Switching universities inside Germany? We make it stress-free." },
  { Icon: ShieldCheck,   title: "Post-arrival support",   desc: "Berlin office on-ground for housing, registration, jobs." },
];

const FAQS = [
  {
    q: "What makes VisaXpert different from other study-abroad consultants?",
    a: "14+ years of focused experience, 4,000+ approved visas, ICEF certification, and a Berlin office that physically supports students after they land. We optimise for outcomes, not application volume."
  },
  {
    q: "Which countries does VisaXpert handle?",
    a: "Germany, Canada, Australia, Ireland, Netherlands, Sweden, Dubai (UAE), Finland, Denmark, and select courses in other EU countries. Germany is our flagship — most trusted for that route."
  },
  {
    q: "I'm already studying in Germany — can VisaXpert help me change universities?",
    a: "Absolutely. University change is a dedicated service handled by our Berlin office. We assess the eligibility, file the transfer and coordinate with the new institution end-to-end."
  },
  {
    q: "How do I get started?",
    a: "Submit the short form above or call us at +91 98759 85641. We'll arrange a free, no-obligation consultation within 24 hours."
  },
];

const HOMEPAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "VisaXpert | Study Abroad Specialists Since 2012",
  description:
    "ICEF-certified study abroad consultancy with 14+ years of experience and 4000+ visas approved. Five branches across Punjab, Jammu and Berlin. Free consultation.",
  url: "https://visaxpert.in/",
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="font-body text-slate-800 bg-white selection:bg-blue-100 selection:text-blue-900">
      <Seo
        title="VisaXpert | Study Abroad Specialists Since 2012 · ICEF Certified"
        description="VisaXpert is an ICEF-certified study abroad consultancy with 14+ years and 4000+ approved visas. Germany, Canada, Australia, Ireland, Netherlands, Sweden, Dubai, Finland & Denmark. Book a free consultation."
        path="/"
        jsonLd={[HOMEPAGE_LD, FAQ_LD]}
      />
      <Helmet>
        <style>{`
          :root {
            --vx-blue:   #0066B1;
            --vx-blue-2: #1E40AF;
            --vx-accent: #FF6B35;
          }
          html { scroll-behavior: smooth; }
          .font-display { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: -0.01em; }
          .font-body    { font-family: 'Manrope', system-ui, sans-serif; }
          /* Refined brand gradient — blue → teal → coral. Smooth, study-abroad
             friendly (avoids the muddy navy → orange transition that read poorly). */
          .vx-gradient-text {
            background: linear-gradient(95deg, #1E3A8A 0%, #0066B1 35%, #0EA5E9 65%, #F97316 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .vx-grid-bg {
            background-image:
              linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px);
            background-size: 64px 64px;
            mask-image: radial-gradient(ellipse 60% 60% at 50% 30%, #000 35%, transparent 80%);
          }
          .vx-passport-decor {
            background-image:
              radial-gradient(circle 320px at 80% 18%, rgba(255,107,53,0.10), transparent 60%),
              radial-gradient(circle 360px at 18% 70%, rgba(0,102,177,0.10), transparent 60%);
          }
          .vx-fade-up { animation: vxFadeUp .9s cubic-bezier(.16,1,.3,1) both; }
          @keyframes vxFadeUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: none;} }
        `}</style>
      </Helmet>

      <Navbar />

      <main className="pt-16 lg:pt-20">
        <Hero />
        <TrustBar />
        <Approach />
        <WhyUs />
        <Countries />
        <Services />
        <BigNumbers />
        <Founder />
        <StudentSlider />
        <VideoStories />
        <Faq />
        <ContactCta />
      </main>

      <Footer />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero() {
  const { openEnquiry } = useEnquiry();
  return (
    <section className="relative overflow-hidden bg-white vx-passport-decor">
      <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-100/70 blur-3xl pointer-events-none" />

      {/* Soft study-abroad arc: dotted plane-trajectory across the hero */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 600"
        className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="vxArc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0066B1" stopOpacity="0" />
            <stop offset="40%" stopColor="#0066B1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d="M -40 470 Q 380 100 1240 380"
          fill="none"
          stroke="url(#vxArc)"
          strokeWidth="2"
          strokeDasharray="2 8"
        />
        {/* Plane glyph at the tip of the arc */}
        <g transform="translate(1115 320) rotate(20)">
          <path
            d="M-22 0 L18 -3 L26 -8 L30 -3 L26 2 L18 -3 L4 6 L0 6 L8 -1 L-6 -1 L-10 4 L-14 4 L-12 -1 L-22 0 Z"
            fill="#0F172A"
          />
        </g>
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7 vx-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={13} /> ICEF Certified · Since 2012
            </span>
            <h1 className="mt-5 text-[42px] sm:text-[58px] lg:text-[80px] leading-[1.02] tracking-tight font-display text-slate-900">
              Your passport <br />
              <span className="vx-gradient-text">to studying abroad.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
              VisaXpert has guided <strong className="text-slate-900 font-semibold">4,000+ students</strong> across <strong className="text-slate-900 font-semibold">9 countries</strong> for over <strong className="text-slate-900 font-semibold">14 years</strong>. From Ludhiana to Berlin, we handle admissions, visa — and the bits in between.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3" data-testid="hero-cta-row">
              <button
                type="button"
                onClick={() => openEnquiry({ origin: "home_hero" })}
                className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-slate-900 text-white font-semibold text-[15px] hover:bg-slate-800 transition-all shadow-[0_8px_30px_-6px_rgba(15,23,42,.45)] hover:-translate-y-0.5"
                data-testid="hero-primary-cta"
              >
                Book free consultation
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href={`tel:${PHONE_DIAL}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white border-2 border-slate-200 text-slate-800 font-semibold text-[15px] hover:border-blue-400 hover:text-blue-700 transition-colors"
                data-testid="hero-phone-cta"
              >
                <Phone size={16} /> +91 98759 85641
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
              {[
                "Same-day counselling",
                "5 walk-in branches",
                "Berlin on-ground team",
              ].map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" /> {b}
                </div>
              ))}
            </div>
          </div>

          {/* Lead form */}
          <div className="lg:col-span-5 vx-fade-up" style={{ animationDelay: ".12s" }}>
            <HeroLeadForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroLeadForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    country: "Germany",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please share at least your name and phone number");
      return;
    }
    setSubmitting(true);
    const country = form.country === "Other" ? (form.otherCountry || "").trim() || "Other" : form.country;
    try {
      await axios.post(`${API}/webhook/lead`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        source: "homepage",
        platform: "visaxpert.in",
        campaign: "home_hero_form",
        country,
        extra_data: { interested_country: country, channel: "homepage_hero" },
      });
      setDone(true);
      toast.success("Got it! A counsellor will reach out within 24 hours.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong, please call us instead.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative" data-testid="hero-lead-form">
      <div className="absolute -inset-2 bg-gradient-to-br from-blue-100 via-white to-orange-100 rounded-[28px] blur-xl opacity-70" />
      <form
        onSubmit={submit}
        className="relative bg-white border border-slate-100 rounded-3xl shadow-[0_30px_80px_-30px_rgba(15,23,42,.25)] p-7 lg:p-8 space-y-4"
      >
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
            <Sparkles size={11} /> Free 30-min consultation
          </p>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">
            Talk to a real counsellor today.
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Drop your details — we'll call you within a working day.
          </p>
        </div>

        {done ? (
          <div className="py-10 text-center" data-testid="hero-form-success">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 grid place-items-center">
              <CheckCircle2 size={26} className="text-emerald-600" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Request received!</p>
            <p className="text-sm text-slate-500 mt-1">A VisaXpert counsellor will reach out shortly.</p>
          </div>
        ) : (
          <>
            <Field label="Full name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Aman Singh"
                className="vx-input"
                data-testid="hero-form-name"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91"
                  className="vx-input"
                  data-testid="hero-form-phone"
                  required
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@email.com"
                  className="vx-input"
                  data-testid="hero-form-email"
                />
              </Field>
            </div>
            <Field label="Country you're interested in">
              <select
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className="vx-input"
                data-testid="hero-form-country"
              >
                {[...ALL_COUNTRIES.map((c) => c.name), "Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            {form.country === "Other" && (
              <Field label="Which country?">
                <input type="text" value={form.otherCountry || ""} onChange={(e) => update("otherCountry", e.target.value)} placeholder="Type the country name" className="vx-input" data-testid="hero-form-other-country" />
              </Field>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-60"
              data-testid="hero-form-submit"
            >
              {submitting ? "Sending…" : (
                <>Get my free consultation <ArrowRight size={16} /></>
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              By submitting, you agree to receive a callback. No spam, ever.
            </p>
          </>
        )}
      </form>
      <style>{`
        .vx-input {
          width: 100%; padding: 0.7rem 0.9rem; border-radius: 12px;
          border: 1.5px solid #E2E8F0; background: #FAFAFA;
          font-size: 0.9rem; outline: none;
          transition: border-color .15s, background-color .15s, box-shadow .15s;
        }
        .vx-input:focus {
          border-color: #1D4ED8; background: #fff;
          box-shadow: 0 0 0 4px rgba(29,78,216,.10);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────
function TrustBar() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-4" data-testid={`trust-stat-${s.label}`}>
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm grid place-items-center text-blue-700 shrink-0">
                <s.Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
                <p className="text-sm text-slate-700 font-medium mt-1">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Approach ─────────────────────────────────────────────────────────────
const APPROACH = [
  { Icon: HeartHandshake, title: "Genuine", desc: "Advice that fits your profile and budget — never what simply earns us more." },
  { Icon: Eye, title: "Transparent", desc: "Fees in writing, honest chances of success and full visibility of your file." },
  { Icon: ShieldCheck, title: "Reliable", desc: "14+ years and 4,000+ visas, with one team from first call to landing day." },
];

function Approach() {
  return (
    <section className="py-16 lg:py-20 bg-slate-950 text-white" data-testid="home-approach">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-4">
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-300">The VisaXpert approach</p>
          <h2 className="mt-3 text-4xl lg:text-5xl font-display leading-[1.05]">Genuine. Transparent.<br /><span className="italic text-orange-300">Reliable.</span></h2>
          <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white" data-testid="home-approach-about-link">
            Meet the people behind it <ArrowRight size={14} />
          </Link>
        </div>
        <div className="lg:col-span-8 grid sm:grid-cols-3 gap-4">
          {APPROACH.map((a) => (
            <div key={a.title} className="rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors" data-testid={`home-approach-${a.title.toLowerCase()}`}>
              <a.Icon size={24} className="text-orange-300" />
              <h3 className="mt-5 text-2xl font-display">{a.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// ─── Why us ───────────────────────────────────────────────────────────────
function WhyUs() {
  const items = [
    { Icon: ShieldCheck,  title: "ICEF certified agency",      desc: "Globally recognised standards — the same body that universities trust." },
    { Icon: Award,        title: "Most trusted for Germany",   desc: "From admission to PR pathway, we're the operative experts in Germany." },
    { Icon: Users,        title: "Founded by Sunil Arora & Rajesh Joshi", desc: "Two founders personally invested in every student's outcome since 2012." },
    { Icon: Globe2,       title: "9 countries handled",       desc: "One team, one process, working English-speaking destinations end-to-end." },
    { Icon: Building2,    title: "Berlin office on-ground",    desc: "Real post-landing help — not a brochure, an actual office." },
    { Icon: TrendingUp,   title: "Outcome-first method",       desc: "We measure ourselves by approvals, not applications." },
  ];

  return (
    <section id="why" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Why VisaXpert"
          title={<>Six reasons families choose us<br /><span className="text-slate-500 font-display italic">again and again.</span></>}
          intro="We're not a referral desk. We're a 14-year-old team obsessed with whether you actually land where you wanted to."
        />
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it) => (
            <div
              key={it.title}
              className="group p-7 rounded-3xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
              data-testid={`why-card-${it.title}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center mb-5 group-hover:bg-blue-700 group-hover:text-white transition-colors">
                <it.Icon size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{it.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Countries ─────────────────────────────────────────────────────────────
function Countries() {
  return (
    <section id="countries" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Countries we serve"
          title={<>Nine destinations.<br /><span className="font-display italic text-slate-500">One trusted team.</span></>}
          intro="Each country has its own playbook in our office. We work the embassy, the universities, and the post-arrival nuts and bolts."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COUNTRIES.map((c) => (
            <Link
              to={`/countries/${c.slug}`}
              key={c.name}
              className={`relative p-6 rounded-3xl bg-white border ${c.highlight ? "border-orange-200 shadow-orange-100/60 shadow-xl" : "border-slate-100"} hover:-translate-y-1 hover:shadow-xl transition-all duration-300 block`}
              data-testid={`country-card-${c.name}`}
            >
              {c.highlight && (
                <span className="absolute -top-2.5 right-5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white shadow">Flagship</span>
              )}
              <p className="text-4xl mb-3 leading-none">{c.flag}</p>
              <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
              <p className="text-xs uppercase tracking-wider font-bold text-blue-700 mt-1">{c.note}</p>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{c.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm text-blue-700 font-semibold mt-4">
                Explore <ArrowRight size={13} />
              </span>
            </Link>
          ))}
          <OtherCountryCard />
        </div>
      </div>
    </section>
  );
}

// ─── Services ──────────────────────────────────────────────────────────────
function Services() {
  return (
    <section id="services" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Services"
          title={<>From course choice<br /><span className="font-display italic text-slate-500">to your first job abroad.</span></>}
          intro="VisaXpert handles every stage — and we don't quietly hand you off after the visa is stamped."
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="p-7 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 hover:border-blue-200 transition-all"
              data-testid={`service-card-${s.title}`}
            >
              <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 grid place-items-center mb-4">
                <s.Icon size={19} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Numbers ───────────────────────────────────────────────────────────────
function BigNumbers() {
  return (
    <section className="py-20 lg:py-28 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 vx-grid-bg opacity-[0.08] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-blue-300 font-semibold">
            By the numbers
          </p>
          <h2 className="mt-4 text-4xl lg:text-6xl font-display leading-[1.1]">
            Outcomes you can <span className="vx-gradient-text">measure</span>.
          </h2>
          <p className="mt-4 text-slate-300 text-lg max-w-2xl">
            14 years of word-of-mouth doesn't lie. Here's a tiny slice of what that looks like.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { v: "4,000+", l: "Successful visas" },
            { v: "14+",    l: "Years of trust" },
            { v: "97%",    l: "Visa-approval rate" },
            { v: "9",      l: "Countries handled" },
          ].map((n) => (
            <div key={n.l} className="rounded-3xl bg-white/5 border border-white/10 p-7 hover:bg-white/10 transition-colors">
              <p className="text-5xl lg:text-6xl font-display text-white leading-none">{n.v}</p>
              <p className="text-sm uppercase tracking-wider text-slate-400 font-semibold mt-3">{n.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Founder ──────────────────────────────────────────────────────────────
function Founder() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-orange-50 border border-slate-100 shadow-xl">
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center px-8">
                  <div className="mx-auto w-32 h-32 rounded-full bg-white shadow-lg grid place-items-center mb-5">
                    <Users size={48} className="text-blue-700" />
                  </div>
                  <p className="text-2xl font-display text-slate-900">Mr. Sunil Arora</p>
                  <p className="text-sm text-slate-600 mt-1">Founder &amp; Director · VisaXpert</p>
                  <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-white shadow-sm text-xs font-semibold text-orange-600">
                    <Award size={12} /> ICEF Certified
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-blue-700">
              <Quote size={13} /> From the founder
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-display leading-[1.1] text-slate-900">
              "We don't sell visas.<br /><span className="italic text-slate-500">We build careers.</span>"
            </h2>
            <p className="mt-6 text-slate-600 leading-relaxed">
              I started VisaXpert in 2012 with a single conviction: every student who walks into our office should leave with a plan they can trust. Fourteen years later, 4000+ families have placed that trust in us — and we treat each one like it's our first.
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed">
              We invested in a Berlin office because we believed our work doesn't end at visa-stamp. It ends when you've found your feet, your housing, your first internship. That's the VisaXpert difference.
            </p>
            <p className="mt-6 text-slate-900 font-semibold">— Sunil Arora</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Video testimonials ───────────────────────────────────────────────────
function VideoStories() {
  const [active, setActive] = useState(null); // currently-playing entry
  const videoRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === "Escape") setActive(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <section id="video-stories" className="py-20 lg:py-28 bg-slate-50 relative overflow-hidden">
      {/* Soft world-map style decoration */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 30%, #0066B1 0, transparent 18%)," +
            "radial-gradient(circle at 80% 60%, #FF6B35 0, transparent 18%)," +
            "radial-gradient(circle at 40% 80%, #10B981 0, transparent 16%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
            <PlayCircle size={13} /> Hear it from them
          </p>
          <h2 className="mt-4 text-4xl lg:text-6xl font-display leading-[1.05] text-slate-900">
            Real students.<br /><span className="font-display italic text-slate-500">Real journeys.</span>
          </h2>
          <p className="mt-5 text-slate-600 text-lg max-w-2xl leading-relaxed">
            Nine countries. One trusted team. Tap any story to watch a student tell you exactly what working with VisaXpert was like.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VIDEO_TESTIMONIALS.map((v, i) => (
            <button
              key={i}
              onClick={() => setActive(v)}
              className={`group relative aspect-[3/4] rounded-3xl overflow-hidden text-left ${v.cardTint} ring-1 ring-white/10 hover:-translate-y-1 transition-transform shadow-xl shadow-slate-900/30`}
              data-testid={`video-testimonial-${i}`}
            >
              {/* Country flag-inspired gradient base */}
              <div className={`absolute inset-0 bg-gradient-to-br ${v.gradient} opacity-90`} />
              {/* Soft radial mesh on top to add depth */}
              <div
                className="absolute inset-0 mix-blend-overlay opacity-60"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.35), transparent 45%)," +
                    "radial-gradient(circle at 0% 100%, rgba(0,0,0,0.45), transparent 55%)",
                }}
              />
              {/* Decorative motif — big country emoji, low opacity, off-centre */}
              <div className="absolute -right-6 -top-4 text-[180px] leading-none opacity-15 select-none pointer-events-none">
                {v.decor}
              </div>
              {/* Bottom dark scrim for legibility */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />

              {/* Play affordance */}
              <div className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 grid place-items-center text-white group-hover:bg-white group-hover:text-slate-900 transition-all">
                <PlayCircle size={22} />
              </div>

              {/* Country chip top-left */}
              <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
                <span>{v.flag}</span> {v.country}
              </div>

              {/* Caption */}
              <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                <p className={`text-[10px] uppercase tracking-[0.25em] font-bold ${v.accent}`}>
                  Class of '26 · {v.country}
                </p>
                <p className="mt-2 font-display text-[26px] leading-tight">{v.name}</p>
                <p className="text-xs text-white/80 mt-1">{v.course}</p>
                <p className="text-xs text-white/60">{v.school}</p>
                <p className="mt-3 text-sm text-white/90 line-clamp-2 italic">"{v.quote}"</p>
              </div>
            </button>
          ))}
        </div>

        {/* Trust strip + CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-5 text-sm text-slate-600">
            <span className="flex items-center gap-2"><Globe2 size={15} className="text-blue-600" /> 9 countries</span>
            <span className="hidden sm:flex items-center gap-2"><GraduationCap size={15} className="text-blue-600" /> 4,000+ alumni</span>
            <span className="hidden md:flex items-center gap-2"><Award size={15} className="text-orange-600" /> ICEF certified</span>
          </div>
          <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
            Become the next story <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 grid place-items-center"
          onClick={() => setActive(null)}
          data-testid="video-lightbox"
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActive(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white inline-flex items-center gap-2 text-sm"
              aria-label="Close"
              data-testid="video-lightbox-close"
            >
              <XIcon size={18} /> Close
            </button>
            <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
              <video
                ref={videoRef}
                key={active.video}
                src={active.video}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video object-contain bg-black"
              />
            </div>
            <div className="mt-4 text-center text-white">
              <p className="font-display text-2xl">{active.name} · {active.country} {active.flag}</p>
              <p className="text-sm text-slate-300 mt-1">{active.course} · {active.school}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Common questions"
          intro="Quick answers to the things students and parents most often ask us."
        />
        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const expanded = open === i;
            return (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid={`faq-${i}`}>
                <button
                  onClick={() => setOpen(expanded ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 text-[15px]">{f.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
                {expanded && (
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed text-[15px]">{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CTA banner ────────────────────────────────────────────────────────────
function ContactCta() {
  return (
    <section id="contact" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-10 lg:p-16 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-blue-500/30 blur-3xl pointer-events-none" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-blue-300">
                Talk to a counsellor
              </p>
              <h2 className="mt-4 text-4xl lg:text-6xl font-display leading-[1.05]">
                Your future abroad,<br /> starts with a 30-min call.
              </h2>
              <p className="mt-5 text-slate-300 text-lg max-w-md leading-relaxed">
                No pressure, no signup. Just a real counsellor helping you make the right choice — for free.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <a
                href={`tel:${PHONE_DIAL}`}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-white text-slate-900 font-semibold text-base hover:bg-blue-50 transition-colors w-fit"
                data-testid="cta-call"
              >
                <Phone size={18} className="text-blue-700" /> +91 98759 85641
              </a>
              <a
                href="https://wa.me/919875985641"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-emerald-500 text-white font-semibold text-base hover:bg-emerald-600 transition-colors w-fit"
                data-testid="cta-whatsapp"
              >
                💬 Chat on WhatsApp
              </a>
              <p className="text-xs text-slate-400 lg:text-right pt-2">Mon–Sat · 10:00 AM – 7:00 PM IST</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Reusable header ──────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, intro }) {
  return (
    <div className="max-w-3xl">
      <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-4xl lg:text-5xl font-display text-slate-900 leading-[1.05]">
        {title}
      </h2>
      {intro && <p className="mt-5 text-slate-600 text-lg max-w-2xl leading-relaxed">{intro}</p>}
    </div>
  );
}
