import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  X,
  MessageCircle,
  Sparkles,
  Gift,
  BadgeCheck,
  Award,
  Trophy,
  PartyPopper,
  IndianRupee,
  Star,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  MapPin,
  ImageIcon,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const DEFAULT_LOGO = "/assets/visaxpert-logo.png";
const WHATSAPP_NUMBER = "918264812231";

const URGENCY_OPTIONS = [
  { value: "Already Booked", label: "Already Booked (IELTS exam already booked)" },
  { value: "Within 2 weeks", label: "Within 2 weeks" },
  { value: "Within a month", label: "Within a month" },
  { value: "1-2 months", label: "1-2 months from now" },
  { value: "3+ months", label: "3 months or later" },
];

const ENGLISH_TEST_OPTIONS = [
  { value: "IELTS", label: "IELTS" },
  { value: "PTE", label: "PTE" },
  { value: "Others", label: "Others" },
];

const OFFICES = [
  { value: "Ludhiana", label: "Ludhiana" },
  { value: "Amritsar", label: "Amritsar" },
  { value: "Pathankot", label: "Pathankot" },
  { value: "Jammu", label: "Jammu" },
];

const BRANCHES = [
  {
    city: "Ludhiana",
    address: "LGF, SCO-17, Model Town Extension Market, Near Krishna Mandir Rd, Ludhiana, Punjab 141002",
    phone: "098881 94266",
    state: "Punjab",
  },
  {
    city: "Amritsar",
    address: "LGF, SCO-21, Block-B, District Shopping Complex, Ranjit Avenue, Amritsar, Punjab 143001",
    phone: "082848 37654",
    state: "Punjab",
  },
  {
    city: "Pathankot",
    address: "Dhangu Rd, opp. Hotel Venice Lane, Jodhamal Colony, Pathankot, Punjab 145001",
    phone: "080547 78465",
    state: "Punjab",
  },
  {
    city: "Jammu",
    address: "83-B/B, adjoining R K Chouhan Jewellers, Gandhi Nagar, Jammu, J&K 180004",
    phone: "098788 66657",
    state: "J&K",
  },
  {
    city: "Berlin",
    address: "Belziger strasse 69-71, 10823, Berlin, Germany",
    phone: "+49 1784555932",
    state: "Germany",
  },
];

const TRUST = [
  { value: "14+", label: "Years of Trust", sub: "Since 2012", color: "text-amber-600" },
  { value: "4000+", label: "Visa Success Stories", sub: "And counting", color: "text-rose-600" },
  { value: "ICEF", label: "Certified Agency", sub: "Globally accredited", color: "text-emerald-600" },
  { value: "India & Berlin", label: "Our Presence", sub: "Offices across both", color: "text-violet-600", valueClass: "text-lg md:text-xl leading-tight" },
];

// Resolve a /api/uploads/... URL using the configured backend host
const resolveImage = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_URL}${url}`;
};

export default function IeltsCelebrationPage() {
  const formRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [showThankYou, setShowThankYou] = useState(false);
  const [stories, setStories] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    english_test: "",
    urgency: "",
    nearest_office: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // fetch shared logo + success stories
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/page-logos`);
        if (res.data?.main_logo_url) setLogoUrl(res.data.main_logo_url);
      } catch (e) {
        // ignore — fall back to default
      }
      try {
        const r = await axios.get(`${API}/success-stories?page=ielts_celebration`);
        setStories(r.data?.stories || []);
      } catch (e) {
        setStories([]);
      }
    })();
  }, []);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 12);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const n = {};
    if (!formData.name || formData.name.trim().length < 2) n.name = "Please enter your full name";
    if (!formData.phone || !/^(\d{10}|\d{12})$/.test(formData.phone)) n.phone = "Enter a valid 10 or 12 digit phone";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) n.email = "Enter a valid email or leave blank";
    if (!formData.english_test) n.english_test = "Which English test are you appearing for?";
    // urgency is only required when student is appearing for IELTS
    if (formData.english_test === "IELTS" && !formData.urgency) n.urgency = "When are you planning to book?";
    if (!formData.nearest_office) n.nearest_office = "Pick your nearest VisaXpert office";
    setErrors(n);
    return Object.keys(n).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/webhook/lead`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || "",
        country: "IELTS Exam Booking",
        source: "ielts_celebration",
        campaign: "14 Years Celebration - IELTS Offer 2026",
        platform: "ielts_celebration_landing",
        english_test: formData.english_test,
        urgency: formData.english_test === "IELTS" ? formData.urgency : "N/A (Non-IELTS)",
        nearest_office: formData.nearest_office,
        preferred_branch: formData.nearest_office,
        module: formData.english_test === "IELTS" ? "Academic IELTS" : formData.english_test,
      });
      setShowThankYou(true);
      setFormData({ name: "", phone: "", email: "", english_test: "", urgency: "", nearest_office: "" });
      toast.success("You're in — we'll call you soon!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-white relative overflow-hidden" data-testid="ielts-celebration-page">
      {/* Decorative confetti dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-amber-300/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-rose-300/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-violet-300/30 rounded-full blur-3xl"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="VisaXpert" className="h-10 md:h-12" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
            <div className="hidden md:block border-l border-amber-200 pl-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold leading-none">Celebrating</p>
              <p className="text-[10px] uppercase tracking-widest text-rose-600 font-bold leading-none">14 Years of Wins</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:9875985641" className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700" data-testid="nav-phone-link">
              <Phone size={16} /> 9875985641
            </a>
            <button onClick={scrollToForm}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-rose-500/30"
              data-testid="nav-claim-btn">
              Claim Offer
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 md:pt-28 pb-12 md:pb-16 relative z-10" ref={formRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* LEFT (desktop) / BELOW form (mobile): copy with giant 14 */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-amber-700 px-4 py-2 rounded-full text-xs font-bold mb-6 border border-amber-200 shadow-sm" data-testid="celebration-badge">
                <PartyPopper size={14} className="text-rose-500" />
                14 YEARS · 4000+ VISAS · ONE BIG CELEBRATION
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] mb-5 text-slate-900" data-testid="hero-title">
                Book your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600">
                  Academic IELTS
                </span>
                <br />
                exam with VisaXpert &amp; get{" "}
                <span className="text-rose-600">₹1,000 OFF</span>
                <br />
                <span className="text-2xl sm:text-3xl lg:text-4xl">+ a special anniversary <span className="text-amber-600">gift hamper</span> 🎁</span>
              </h1>

              <p className="text-base md:text-lg text-slate-600 mb-7 max-w-xl mx-auto lg:mx-0">
                To celebrate <b className="text-slate-900">14 years</b> and <b className="text-slate-900">4,000+ visas</b> approved through VisaXpert, every <b>Academic IELTS</b> exam booked this month gets a flat <b className="text-rose-600">₹1,000 fee discount</b> plus a curated <b className="text-amber-600">anniversary gift hamper</b>.
              </p>

              {/* Trust grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
                {TRUST.map((t, i) => (
                  <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-amber-100 shadow-sm" data-testid={`trust-card-${i}`}>
                    <p className={`font-black ${t.color} ${t.valueClass || "text-2xl md:text-3xl"}`}>{t.value}</p>
                    <p className="text-[11px] md:text-xs font-bold text-slate-700 uppercase tracking-wide mt-1">{t.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.sub}</p>
                  </div>
                ))}
              </div>

              {/* CTA Strip */}
              <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start" data-testid="hero-cta-strip">
                <button onClick={scrollToForm}
                  className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white rounded-full text-base font-bold hover:brightness-110 transition-all shadow-xl shadow-rose-500/30"
                  data-testid="hero-claim-btn">
                  Claim My Anniversary Offer <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>An anniversary <b className="text-rose-600">thank-you</b> from VisaXpert</span>
                </div>
              </div>
            </div>

            {/* RIGHT (desktop) / TOP (mobile): Form */}
            <div className="w-full max-w-lg mx-auto lg:mx-0 lg:ml-auto order-1 lg:order-2">
              <div className="relative">
                {/* Celebratory ribbon */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap" data-testid="form-ribbon">
                  <Gift size={12} /> Limited Anniversary Offer
                </div>

                <div className="bg-white rounded-3xl shadow-2xl pt-8 px-6 pb-6 md:p-8 border-2 border-amber-200/60 relative">
                  <div className="text-center mb-5">
                    <h2 className="text-2xl md:text-[26px] font-black text-slate-900 leading-tight" data-testid="form-title">
                      Reserve Your IELTS Perks
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Just a few quick details — our IELTS expert will call you in 24 hours.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="ielts-registration-form">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Your Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Priya Sharma"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm transition-colors ${errors.name ? "border-red-400" : "border-amber-100"}`} data-testid="ielts-input-name" />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Mobile Number *</label>
                      <div className="flex">
                        <span className="flex items-center px-3 bg-amber-50 border-2 border-r-0 border-amber-100 rounded-l-xl text-sm text-slate-700 font-bold">+91</span>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="10-digit mobile number" maxLength={12}
                          className={`w-full px-4 py-3 border-2 rounded-r-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm transition-colors ${errors.phone ? "border-red-400" : "border-amber-100"}`} data-testid="ielts-input-phone" />
                      </div>
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Email <span className="text-slate-400 font-normal normal-case">(optional — we&apos;ll email you the offer details)</span>
                      </label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm transition-colors ${errors.email ? "border-red-400" : "border-amber-100"}`} data-testid="ielts-input-email" />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Which English test are you appearing for? *</label>
                      <select name="english_test" value={formData.english_test} onChange={handleInputChange}
                        className={`w-full px-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm bg-white transition-colors ${errors.english_test ? "border-red-400" : "border-amber-100"}`} data-testid="ielts-select-english-test">
                        <option value="">Select your test</option>
                        {ENGLISH_TEST_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {errors.english_test && <p className="text-red-500 text-xs mt-1">{errors.english_test}</p>}

                      {/* Friendly message when PTE/Others selected */}
                      {(formData.english_test === "PTE" || formData.english_test === "Others") && (
                        <div className="mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex items-start gap-2" data-testid="non-ielts-info-banner">
                          <Sparkles size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            <b>No problem!</b> VisaXpert still has some <b>amazing offers</b> for you. Submit your details below and our team will share them in your callback.
                          </p>
                        </div>
                      )}
                    </div>

                    {formData.english_test === "IELTS" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">How soon are you planning to book? *</label>
                      <select name="urgency" value={formData.urgency} onChange={handleInputChange}
                        className={`w-full px-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm bg-white transition-colors ${errors.urgency ? "border-red-400" : "border-amber-100"}`} data-testid="ielts-select-urgency">
                        <option value="">Select an option</option>
                        {URGENCY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {errors.urgency && <p className="text-red-500 text-xs mt-1">{errors.urgency}</p>}

                      {/* Friendly message when student has already booked IELTS */}
                      {formData.urgency === "Already Booked" && (
                        <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-2" data-testid="already-booked-info-banner">
                          <Gift size={16} className="text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-800 leading-relaxed">
                            <b>No worries — you&apos;re still eligible to get the hamper!</b> Just pick your nearest branch below and our team will hand it over to you. 🎁
                          </p>
                        </div>
                      )}
                    </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        {formData.urgency === "Already Booked"
                          ? "Please choose your nearest branch to collect your hamper *"
                          : "Nearest VisaXpert Office *"}
                      </label>
                      <select name="nearest_office" value={formData.nearest_office} onChange={handleInputChange}
                        className={`w-full px-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm bg-white transition-colors ${errors.nearest_office ? "border-red-400" : "border-amber-100"}`} data-testid="ielts-select-office">
                        <option value="">
                          {formData.urgency === "Already Booked"
                            ? "Pick a branch to collect your hamper"
                            : "Where will you book the exam from?"}
                        </option>
                        {OFFICES.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {errors.nearest_office && <p className="text-red-500 text-xs mt-1">{errors.nearest_office}</p>}
                    </div>

                    <button type="submit" disabled={isSubmitting}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white rounded-xl font-black text-base hover:brightness-110 transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
                      data-testid="ielts-submit-btn">
                      {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Claim Anniversary Offer <ArrowRight size={18} /></>}
                    </button>
                  </form>

                  <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500 justify-center">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    100% safe · No spam · Reach out only about your IELTS booking
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 text-center">
                    By submitting, you consent to be contacted by VisaXpert via phone, SMS, email or WhatsApp regarding your IELTS booking. See our{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline" data-testid="form-privacy-link">Privacy Policy</a>{" "}
                    and{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline" data-testid="form-terms-link">Terms</a>. *Offer valid on Academic IELTS module only. Hamper contents may vary by stock & city.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Big Offer Cards */}
      <section className="relative z-10 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-xs font-bold mb-3">
              <Trophy size={14} /> ANNIVERSARY GIFTS
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900" data-testid="offers-heading">Two ways we say <span className="text-rose-600">&ldquo;thank you&rdquo;</span></h2>
            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">A genuine gesture for every Academic IELTS student who trusts us this anniversary month.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Offer 1 — ₹1,000 off */}
            <div className="relative group bg-white rounded-3xl border-2 border-amber-200 p-7 md:p-9 shadow-xl shadow-amber-200/40 overflow-hidden transition-transform hover:-translate-y-1" data-testid="offer-card-discount">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-300/40 rounded-full blur-2xl"></div>
              <div className="absolute top-5 right-5 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Offer 01</div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-400/40 mb-5">
                <IndianRupee size={28} />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                Flat <span className="text-amber-600">₹1,000 CASH</span><br />
                back on Academic IELTS
              </h3>
              <p className="text-slate-600 mt-3">Book your <b>Academic IELTS</b> exam slot through VisaXpert and we&apos;ll <b>pay you ₹1,000 in cash, in hand</b> — straight up, no codes, no fuss.</p>
              <ul className="space-y-2 mt-5 text-sm text-slate-700">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-amber-500 mt-0.5 shrink-0" /> Valid on the <b>Academic IELTS module only</b></li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-amber-500 mt-0.5 shrink-0" /> Book any test date in the next 90 days</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-amber-500 mt-0.5 shrink-0" /> Cash handed over at your nearest VisaXpert office</li>
              </ul>
            </div>

            {/* Offer 2 — Gift Hamper */}
            <div className="relative group bg-white rounded-3xl border-2 border-rose-200 p-7 md:p-9 shadow-xl shadow-rose-200/40 overflow-hidden transition-transform hover:-translate-y-1" data-testid="offer-card-hamper">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-300/40 rounded-full blur-2xl"></div>
              <div className="absolute top-5 right-5 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Offer 02</div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-rose-400/40 mb-5">
                <Gift size={28} />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                Special <span className="text-rose-600">Anniversary</span><br />
                <span className="text-rose-600">Gift Hamper</span> 🎁
              </h3>
              <p className="text-slate-600 mt-3">A curated VisaXpert anniversary hamper — handed over with your IELTS confirmation. Think study essentials, a branded planner, and a few delightful surprises.</p>
              <p className="text-[10px] text-slate-400 mt-5">*Hamper contents may vary slightly by city &amp; stock. Pickup from your nearest VisaXpert office.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SUCCESS STORIES GALLERY — admin-uploaded student visa images */}
      <section className="relative z-10 py-12 md:py-16 bg-white/60 backdrop-blur-sm" data-testid="success-stories-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold mb-3">
              <BadgeCheck size={14} /> REAL STUDENTS · REAL VISAS
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              4,000+ visas approved. <span className="text-rose-600">Meet a few.</span>
            </h2>
            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Some of the students whose study-abroad journey began with VisaXpert.</p>
          </div>

          {stories.length === 0 ? (
            <div className="max-w-3xl mx-auto bg-white border-2 border-dashed border-amber-200 rounded-3xl p-10 text-center" data-testid="stories-empty-state">
              <ImageIcon size={36} className="mx-auto text-amber-400 mb-3" />
              <p className="text-slate-700 font-bold">Your success-story gallery is empty.</p>
              <p className="text-slate-500 text-sm mt-1">
                Upload student visa photos from <b>Dashboard → Anniversary Stories</b> and they&apos;ll appear here automatically.
              </p>
            </div>
          ) : (
            <div className="vx-marquee relative overflow-hidden" data-testid="stories-marquee">
              {/* Soft edge-fade masks */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10"></div>

              <div className="vx-marquee-track gap-4 md:gap-6 py-3">
                {[...stories, ...stories].map((s, idx) => (
                  <div
                    key={`${s.story_id}-${idx}`}
                    className="relative bg-white rounded-2xl overflow-hidden border-2 border-amber-100 shadow-md w-44 md:w-56 shrink-0"
                    data-testid={idx < stories.length ? `story-card-${s.story_id}` : undefined}
                    aria-hidden={idx >= stories.length}
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-amber-50">
                      <img
                        src={resolveImage(s.image_url)}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs text-slate-400 mt-3">
                Hover to pause · {stories.length} of 4,000+ visa wins shown
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why VisaXpert celebration banner */}
      <section className="relative z-10 py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border-2 border-amber-200 rounded-3xl p-8 md:p-12 text-center shadow-xl shadow-amber-200/30 relative overflow-hidden">
            <div className="absolute top-4 left-4 text-amber-300"><Star size={20} fill="currentColor" /></div>
            <div className="absolute top-6 right-6 text-rose-300"><Star size={16} fill="currentColor" /></div>
            <div className="absolute bottom-6 left-10 text-fuchsia-300"><Star size={14} fill="currentColor" /></div>
            <div className="absolute bottom-4 right-12 text-amber-300"><Star size={18} fill="currentColor" /></div>

            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <Award size={14} /> EST. 2012 · CELEBRATING 14 YEARS
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              From <span className="text-rose-600">one office</span> to <span className="text-amber-600">4,000+ approved visas</span>,
              <br className="hidden md:block" /> we&apos;ve been doing this since <span className="text-violet-600">2012</span>.
            </h3>
            <p className="text-slate-600 mt-4 max-w-3xl mx-auto">
              This anniversary, you&apos;re not just booking an exam — you&apos;re booking with a team that has put <b>4,000+ students
              on flights</b> across Germany, the UK, Canada, Australia &amp; beyond. The offer is our way of celebrating <i>with you</i>.
            </p>

            <button onClick={scrollToForm}
              className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white rounded-full text-base font-bold hover:brightness-110 transition-all shadow-xl shadow-rose-500/30"
              data-testid="why-vx-cta-btn">
              <Sparkles size={18} /> Yes, count me in
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-12 md:py-16 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-10">Quick questions, quick answers</h2>
          <div className="space-y-3" data-testid="faq-list">
            {[
              { q: "Who can claim the ₹1,000 cash + gift hamper?", a: "Any student who books their Academic IELTS exam slot through VisaXpert during this anniversary campaign. One claim per passport." },
              { q: "Which IELTS modules are covered?", a: "This anniversary offer is valid on the Academic IELTS module only. General Training, UKVI and Life Skills modules are not part of this campaign." },
              { q: "When and how do I get the hamper?", a: "Immediately when you book your IELTS exam, the hamper is handed over at the nearest VisaXpert office you selected during signup." },
              { q: "Is the ₹1,000 off applied before or after I pay the exam fee?", a: "You pay the full exam fee at the time of booking — and we pay you ₹1,000 in cash, in hand, as our anniversary thank-you." },
              { q: "I have already booked my IELTS exam — am I still eligible?", a: "Yes! You are still eligible for the anniversary gift hamper. Just pick your nearest VisaXpert branch in the form and our team will hand over the hamper when you visit." },
              { q: "I am appearing for PTE or another English test — do I get anything?", a: "Absolutely. Fill in the form choosing PTE or Others and our team will share VisaXpert's special PTE / Other-English-test offers in your callback." },
              { q: "Does this come with any obligation to use other VisaXpert services?", a: "Not at all. The anniversary offer is independent of admissions, visa or coaching services. Take it as our thank-you for trusting us with your IELTS." },
            ].map((f, i) => (
              <details key={i} className="group bg-white rounded-2xl border-2 border-amber-100 p-5 open:border-rose-200 open:shadow-md transition-all" data-testid={`faq-item-${i}`}>
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-bold text-slate-900 pr-4">{f.q}</span>
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-rose-600 flex items-center justify-center font-black text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
            <PartyPopper size={14} /> THE PARTY ENDS SOON
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            Don&apos;t miss the <span className="text-rose-600">₹1,000 OFF</span> + anniversary gift hamper.
          </h2>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">A genuine anniversary thank-you to every student booking their Academic IELTS with us. Fill in your details — we&apos;ll do the rest.</p>
          <button onClick={scrollToForm}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white rounded-full text-lg font-black hover:brightness-110 transition-all shadow-xl shadow-rose-500/30"
            data-testid="final-cta-btn">
            Claim My Offer <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-12 pb-10 relative z-10" data-testid="ielts-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Branches strip */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-white/10"></div>
              <h3 className="text-amber-400 uppercase text-xs tracking-[0.25em] font-bold whitespace-nowrap">Visit Us · Branches Across India &amp; Berlin</h3>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="footer-branches-grid">
              {BRANCHES.map((b) => (
                <div key={b.city} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors" data-testid={`footer-branch-${b.city.toLowerCase()}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <MapPin size={16} className="text-rose-400" />
                      {b.city}
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">{b.state}</span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed mb-3">{b.address}</p>
                  <a
                    href={`tel:${b.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                    data-testid={`footer-branch-phone-${b.city.toLowerCase()}`}
                  >
                    <Phone size={14} /> {b.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 3-col strip */}
          <div className="grid md:grid-cols-3 gap-8 pt-2">
            <div>
              <img src={logoUrl} alt="VisaXpert" className="h-10 mb-3 brightness-200" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
              <p className="text-sm text-white/60">Celebrating 14 years of helping Indian students study abroad — IELTS, admissions, visas, all under one roof.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">ICEF Certified</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">Since 2012</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-400/10 border border-rose-400/30 px-2 py-0.5 rounded-full">4000+ Visas</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold uppercase text-xs tracking-widest text-amber-400 mb-3">Get in Touch</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2"><Phone size={14} className="text-amber-300" /> <a href="tel:9875985641" className="hover:text-white">9875985641</a></li>
                <li className="flex items-center gap-2"><Mail size={14} className="text-amber-300" /> <a href="mailto:info@visaxpertinternational.co.in" className="hover:text-white">info@visaxpertinternational.co.in</a></li>
                <li className="flex items-center gap-2"><MessageCircle size={14} className="text-emerald-400" />
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp us</a>
                </li>
              </ul>
              <p className="text-[11px] text-white/40 mt-4">Mon – Sat · 10 AM to 7 PM IST</p>
            </div>
            <div>
              <h4 className="font-bold uppercase text-xs tracking-widest text-amber-400 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="/privacy-policy" className="hover:text-white" data-testid="footer-privacy">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white" data-testid="footer-terms">Terms &amp; Conditions</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-white/40">
            <p>IELTS 14th Anniversary Campaign © VisaXpert International. All rights reserved.</p>
            <p className="mt-2 max-w-3xl mx-auto">VisaXpert International is a private overseas-education consultancy and is not affiliated with British Council, IDP or any government body. The IELTS exam is conducted by the official test partners; VisaXpert facilitates booking and offers anniversary perks subject to availability. Offer valid on Academic IELTS module only.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi VisaXpert! I want to claim the 14th-anniversary Academic IELTS offer.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl hover:bg-emerald-600 transition-colors"
        data-testid="whatsapp-fab"
      >
        <MessageCircle size={26} />
      </a>

      {/* Thank you modal */}
      {showThankYou && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-testid="thank-you-modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 relative shadow-2xl">
            <button onClick={() => setShowThankYou(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700" data-testid="thank-you-close">
              <X size={22} />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-lg mb-4">
                <PartyPopper size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">You&apos;re in! 🎉</h3>
              <p className="text-slate-600 mt-2">Your anniversary offer is reserved. Our IELTS expert will call you within 24 hours to confirm your Academic IELTS exam slot and the gift hamper.</p>
              <div className="bg-amber-50 border-2 border-amber-100 rounded-xl p-4 mt-5 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">What&apos;s reserved for you</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> ₹1,000 cash, in hand</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> Anniversary gift hamper 🎁</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> 2 free mock tests + 1-on-1 counselling</li>
                </ul>
              </div>
              <button onClick={() => setShowThankYou(false)} className="mt-5 w-full py-3 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white rounded-xl font-bold" data-testid="thank-you-done-btn">
                <Calendar size={16} className="inline mr-1" /> Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
