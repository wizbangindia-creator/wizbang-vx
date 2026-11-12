import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  Sparkles,
  CalendarDays,
  Clock,
  Globe,
  GraduationCap,
  BadgeCheck,
  Wallet,
  FileCheck,
  Users,
  Video,
  ArrowRight,
  CheckCircle2,
  Star,
  MapPin,
  PhoneCall,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO = "/assets/visaxpert-logo.png";
const MDH_LOGO = "/assets/mdh-logo.png";

const HERO_IMG =
  "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const CAMPUS_IMG =
  "https://images.unsplash.com/photo-1712479535422-c2be2813cceb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const DESIGN_IMG =
  "https://images.unsplash.com/photo-1726594699522-d7c2f5459f52?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const MEETING_IMG =
  "https://images.unsplash.com/photo-1672380135241-c024f7fbfa13?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const QUALIFICATIONS = [
  "High School / 12th",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Other",
];

const COUNTRIES = [
  "India", "Germany", "Austria", "Switzerland", "Netherlands", "France",
  "Italy", "Spain", "Poland", "Sweden", "Denmark", "Ireland", "United Kingdom",
  "UAE", "Other",
];

const AGENDA = [
  {
    icon: GraduationCap,
    title: "Programs at MDH University",
    text: "Explore Bachelor's & Master's programs in design, media, management and tech — taught in English.",
  },
  {
    icon: Wallet,
    title: "Scholarships & Discounts",
    text: "Exclusive webinar-only tuition discounts and scholarship routes explained by university experts.",
  },
  {
    icon: FileCheck,
    title: "Complete Visa Process",
    text: "Step-by-step guidance on the German student visa, blocked account and documentation.",
  },
  {
    icon: BadgeCheck,
    title: "Transfer from Any EU Country",
    text: "Already studying in Europe? Learn how to switch your university and shift to Germany smoothly.",
  },
];

const PERKS = [
  "Live Q&A with MDH University experts",
  "Personalised 1-on-1 meeting after the webinar",
  "Program, scholarship & discount breakdown",
  "End-to-end visa & admission roadmap",
];

export default function MediaDesignWebinarPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    present_country: "",
    native_country: "",
    highest_qualification: "",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Please share your name, email and phone number");
      return;
    }
    if (!form.present_country || !form.native_country || !form.highest_qualification) {
      toast.error("Please complete all fields to register");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/webhook/lead`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: "Germany",
        source: "media_design_webinar",
        platform: "visaxpert.in",
        campaign: "media_design_university_webinar",
        webinar: "MDH University — University Change to Germany",
        present_country: form.present_country,
        native_country: form.native_country,
        highest_qualification: form.highest_qualification,
      });
      setDone(true);
      toast.success("You're registered! Check your email for webinar details.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body antialiased" data-testid="media-design-webinar-page">
      <Helmet prioritizeSeoTags>
        <title>University Change to Germany Webinar — MDH University × VisaXpert</title>
        <meta
          name="description"
          content="Free webinar with MDH University of Applied Sciences. Switch your university to Germany — learn about programs, scholarships, discounts and the complete visa process, plus a 1-on-1 meeting."
        />
        <link rel="canonical" href="https://visaxpert.in/webinar/media-design" />
      </Helmet>

      <PageStyle />

      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4" data-testid="webinar-brand">
            <img src={LOGO} alt="VisaXpert" className="h-8 w-auto" />
            <span className="h-6 w-px bg-slate-200" />
            <img src={MDH_LOGO} alt="MDH University of Applied Sciences" className="h-7 w-auto" />
          </div>
          <a
            href="tel:+919875985641"
            data-testid="webinar-nav-call"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors"
          >
            <PhoneCall size={16} className="text-amber-500" /> +91 98759 85641
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white">
        <div className="mdw-grid absolute inset-0" />
        <div className="mdw-glow absolute inset-0" />

        <div className="relative max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-20 lg:pt-16 lg:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-start">
          {/* Left */}
          <div className="mdw-fade">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-amber-700" data-testid="webinar-eyebrow">
              <Sparkles size={13} /> Free Live Webinar
            </span>

            <h1 className="mt-6 font-display text-[2.7rem] leading-[1.03] sm:text-6xl text-slate-900">
              Change Your University to{" "}
              <span className="mdw-grad">Germany</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-slate-600 leading-relaxed">
              Studying somewhere in Europe but dreaming of Germany? Join VisaXpert &amp;{" "}
              <strong className="text-slate-900">MDH University of Applied Sciences</strong>{" "}
              live. University experts reveal programs, scholarships, tuition discounts and the
              complete visa process — followed by a personal 1-on-1 meeting.
            </p>

            <div className="mt-8 flex flex-wrap gap-3" data-testid="webinar-meta">
              <MetaPill icon={CalendarDays} label="Save your seat — limited slots" />
              <MetaPill icon={Video} label="Live on Zoom" />
              <MetaPill icon={Clock} label="60 min + Q&A" />
            </div>

            <ul className="mt-8 grid sm:grid-cols-2 gap-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[HERO_IMG, DESIGN_IMG, MEETING_IMG].map((src) => (
                  <img key={src} src={src} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
                </div>
                <span className="text-slate-500">Trusted by 4,000+ students since 2012</span>
              </div>
            </div>
          </div>

          {/* Right — registration */}
          <div id="register" className="mdw-fade" style={{ animationDelay: ".12s" }}>
            <div className="relative rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_40px_100px_-40px_rgba(15,23,42,.25)]" data-testid="webinar-form-card">
              {done ? (
                <div className="py-14 text-center" data-testid="webinar-form-success">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
                    <CheckCircle2 size={30} className="text-emerald-600" />
                  </div>
                  <h3 className="mt-5 text-2xl font-bold">You're registered!</h3>
                  <p className="mt-2 text-slate-500">
                    Our team will email you the webinar link and schedule your 1-on-1 meeting.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      <Users size={12} /> Reserve your free seat
                    </span>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900">Register for the webinar</h3>
                    <p className="mt-1 text-sm text-slate-500">Fill in your details — it takes 30 seconds.</p>
                  </div>

                  <FieldInput
                    label="Full name" testId="webinar-name" type="text"
                    value={form.name} onChange={(v) => update("name", v)}
                    placeholder="e.g. Aman Singh" required
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      label="Email" testId="webinar-email" type="email"
                      value={form.email} onChange={(v) => update("email", v)}
                      placeholder="you@email.com" required
                    />
                    <FieldInput
                      label="Phone number" testId="webinar-phone" type="tel"
                      value={form.phone} onChange={(v) => update("phone", v)}
                      placeholder="+91 / +49" required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldSelect
                      label="Present country" testId="webinar-present-country"
                      value={form.present_country} onChange={(v) => update("present_country", v)}
                      options={COUNTRIES} placeholder="Where you live now"
                    />
                    <FieldSelect
                      label="Native country" testId="webinar-native-country"
                      value={form.native_country} onChange={(v) => update("native_country", v)}
                      options={COUNTRIES} placeholder="Your home country"
                    />
                  </div>
                  <FieldSelect
                    label="Highest qualification" testId="webinar-qualification"
                    value={form.highest_qualification} onChange={(v) => update("highest_qualification", v)}
                    options={QUALIFICATIONS} placeholder="Select your qualification"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="webinar-submit"
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-4 font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-blue-600/40 disabled:opacity-60"
                  >
                    {submitting ? "Registering…" : (<>Reserve my free seat <ArrowRight size={16} /></>)}
                  </button>
                  <p className="text-center text-[11px] text-slate-400">
                    By registering you agree to receive webinar &amp; consultation updates. No spam.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AGENDA */}
      <section className="relative border-t border-slate-100 py-20 lg:py-24 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-600">What you'll learn</span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl text-slate-900 leading-[1.05]">
              Everything to switch to Germany — in one session
            </h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 gap-5" data-testid="webinar-agenda">
            {AGENDA.map((a) => (
              <div key={a.title} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <a.icon size={22} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UNIVERSITY SPOTLIGHT */}
      <section className="relative border-t border-slate-100 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-2 gap-4">
            <img src={CAMPUS_IMG} alt="Germany campus" className="col-span-2 h-56 w-full rounded-2xl object-cover" />
            <img src={DESIGN_IMG} alt="Design studio" className="h-40 w-full rounded-2xl object-cover" />
            <img src={MEETING_IMG} alt="1-on-1 meeting" className="h-40 w-full rounded-2xl object-cover" />
          </div>
          <div>
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-600">In partnership with</span>
            <img src={MDH_LOGO} alt="MDH University of Applied Sciences" className="mt-5 h-10 w-auto" />
            <h2 className="mt-4 font-display text-4xl sm:text-5xl text-slate-900 leading-[1.05]">
              MDH — University of Applied Sciences
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed">
              A leading German university for design, media, management and technology. Meet their
              admissions experts live, understand which program fits you, and discover the
              scholarships and tuition discounts available to webinar attendees.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "English-taught Bachelor's & Master's programs",
                "Creative + industry-focused curriculum in Germany",
                "Dedicated scholarship & discount guidance",
                "Support to transfer credits from your current university",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-slate-700">
                  <BadgeCheck size={20} className="mt-0.5 shrink-0 text-emerald-500" /> {t}
                </li>
              ))}
            </ul>
            <a
              href="#register"
              data-testid="webinar-spotlight-cta"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Register now <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* 1-ON-1 STRIP */}
      <section className="relative border-t border-slate-100 py-16 bg-slate-50/60">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <Users size={26} />
          </div>
          <h2 className="mt-6 font-display text-3xl sm:text-4xl text-slate-900">
            After the webinar: your personal 1-on-1 meeting
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-slate-600 leading-relaxed">
            Every attendee gets a dedicated one-on-one session with a VisaXpert counsellor to map
            your profile, finalise your program and plan your visa — no cost, no obligation.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2"><Globe size={15} className="text-amber-500" /> Open to students across Europe &amp; India</span>
            <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-amber-500" /> Berlin on-ground team</span>
          </div>
          <a
            href="#register"
            data-testid="webinar-bottom-cta"
            className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5"
          >
            Reserve my free seat <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="VisaXpert" className="h-8 w-auto" />
            <span>© {new Date().getFullYear()} VisaXpert · ICEF Certified since 2012</span>
          </div>
          <a href="tel:+919875985641" className="inline-flex items-center gap-2 hover:text-blue-700">
            <PhoneCall size={15} className="text-amber-500" /> +91 98759 85641
          </a>
        </div>
      </footer>
    </div>
  );
}

function MetaPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
      <Icon size={15} className="text-amber-500" /> {label}
    </span>
  );
}

function FieldInput({ label, testId, type, value, onChange, placeholder, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        data-testid={testId}
        className="mdw-input"
      />
    </label>
  );
}

function FieldSelect({ label, testId, value, onChange, options, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="mdw-input"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function PageStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap');
      .font-display { font-family: 'Fraunces', serif; font-weight: 600; letter-spacing: -0.01em; }
      .font-body { font-family: 'Manrope', system-ui, sans-serif; }
      .mdw-grad {
        background: linear-gradient(95deg,#F59E0B 0%,#EA580C 40%,#2563EB 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .mdw-glow {
        pointer-events: none;
        background:
          radial-gradient(560px circle at 12% 8%, rgba(37,99,235,0.10), transparent 60%),
          radial-gradient(480px circle at 92% 14%, rgba(245,158,11,0.10), transparent 55%);
      }
      .mdw-grid {
        pointer-events: none;
        background-image:
          linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px);
        background-size: 60px 60px;
        mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 75%);
      }
      .mdw-input {
        width: 100%; padding: 0.72rem 0.9rem; border-radius: 12px;
        border: 1.5px solid #E2E8F0; background: #F8FAFC; color: #0F172A;
        font-size: 0.9rem; outline: none;
        transition: border-color .15s, background-color .15s, box-shadow .15s;
      }
      .mdw-input:focus {
        border-color: #1D4ED8; background: #fff;
        box-shadow: 0 0 0 4px rgba(29,78,216,.12);
      }
      .mdw-fade { animation: mdwFade .9s cubic-bezier(.16,1,.3,1) both; }
      @keyframes mdwFade { from { opacity: 0; transform: translateY(22px);} to { opacity: 1; transform: none;} }
    `}</style>
  );
}
