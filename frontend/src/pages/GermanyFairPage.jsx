import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  GraduationCap,
  MapPin,
  Phone,
  Calendar,
  ArrowRight,
  CheckCircle2,
  X,
  MessageCircle,
  Sparkles,
  Gift,
  Users,
  BadgeCheck,
  Ticket,
  Shield,
  Clock,
  Star,
  Wallet,
  PlaneTakeoff,
  Award,
  Check,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const DEFAULT_LOGO = "/assets/visaxpert-logo.png";
const WHATSAPP_NUMBER = "918264812231";

// German flag palette helper stripe
function FlagStripe({ className = "" }) {
  return (
    <div className={`flex h-full w-full overflow-hidden ${className}`}>
      <div className="flex-1 bg-black" />
      <div className="flex-1 bg-[#DD0000]" />
      <div className="flex-1 bg-[#FFCE00]" />
    </div>
  );
}

const eventSchedule = [
  {
    city: "Jammu",
    date: "16th September 2026",
    short: "16 Sep",
    day: "Wednesday",
    targetDate: "2026-09-16T10:00:00",
    address: "83-B/B, adjoining R K Chouhan Jewellers, Gandhi Nagar, Jammu",
    phone: "098788 66657",
    color: "from-[#DD0000] to-red-700",
    accent: "text-[#DD0000]",
    ring: "ring-red-200",
    dot: "bg-[#DD0000]",
  },
  {
    city: "Pathankot",
    date: "17th September 2026",
    short: "17 Sep",
    day: "Thursday",
    targetDate: "2026-09-17T10:00:00",
    address: "Dhangu Rd, opp. Hotel Venice Lane, Jodhamal Colony, Pathankot",
    phone: "080547 78465",
    color: "from-neutral-800 to-black",
    accent: "text-neutral-900",
    ring: "ring-neutral-300",
    dot: "bg-neutral-900",
  },
  {
    city: "Amritsar",
    date: "18th September 2026",
    short: "18 Sep",
    day: "Friday",
    targetDate: "2026-09-18T10:00:00",
    address: "LGF, SCO-21, Block-B, District Shopping Complex, Ranjit Avenue",
    phone: "082848 37654",
    color: "from-amber-500 to-yellow-600",
    accent: "text-amber-600",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
  },
  {
    city: "Ludhiana",
    date: "19th September 2026",
    short: "19 Sep",
    day: "Saturday",
    targetDate: "2026-09-19T10:00:00",
    address: "LGF, SCO-17, Model Town Extension Market, Near Krishna Mandir Rd",
    phone: "098881 94266",
    color: "from-red-600 to-red-800",
    accent: "text-red-700",
    ring: "ring-red-200",
    dot: "bg-red-700",
  },
];

const universities = [
  { name: "GISMA University of Applied Sciences", logo: "/assets/universities/germany/gisma.jpg" },
  { name: "Media University of Applied Sciences", logo: "/assets/universities/germany/media-university.webp" },
  { name: "MDH University of Applied Sciences", logo: "/assets/universities/germany/mdh-university.png" },
  { name: "Arden University", logo: "/assets/universities/germany/arden.jpg" },
  { name: "BSBI University", logo: "/assets/universities/germany/bsbi.jpg" },
  { name: "Cologne Business School", logo: "/assets/universities/germany/cbs.svg" },
  { name: "SRH University", logo: "/assets/universities/germany/srh.jpg" },
  { name: "University of Europe for Applied Sciences", logo: "/assets/universities/germany/ue.jpg" },
  { name: "UE Amsterdam", logo: "/assets/universities/germany/ue.jpg" },
];

// Countdown Hook
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };
    setTimeLeft(calculate());
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// Minimal countdown for timeline cards
function CountdownDisplay({ targetDate, accent }) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate);
  return (
    <div className="grid grid-cols-4 gap-1.5" data-testid="countdown-timer">
      {[
        { val: days, label: "Days" },
        { val: hours, label: "Hrs" },
        { val: minutes, label: "Min" },
        { val: seconds, label: "Sec" },
      ].map((item, i) => (
        <div key={i} className="text-center">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg py-1.5">
            <span className={`text-lg font-black leading-none tabular-nums ${accent}`}>{String(item.val).padStart(2, "0")}</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function GermanyFairPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", city: "", preferred_city: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [reviews, setReviews] = useState([]);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [partnerLogos, setPartnerLogos] = useState([]);
  const formRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/reviews?page=germany_fair`);
        if (res.data?.reviews?.length > 0) setReviews(res.data.reviews);
      } catch (e) {
        console.error("Failed to fetch reviews:", e);
      }
      try {
        const res = await axios.get(`${API}/page-logos`);
        if (res.data?.germany_fair) setLogoUrl(res.data.germany_fair);
      } catch (e) {
        console.error("Failed to fetch logo:", e);
      }
      try {
        const res = await axios.get(`${API}/partner-logos?page=germany_fair`);
        setPartnerLogos(res.data?.logos || []);
      } catch (e) {
        console.error("Failed to fetch partner logos:", e);
      }
    };
    fetchData();
  }, []);

  const handleImageError = (index) => setImageErrors((prev) => ({ ...prev, [index]: true }));
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

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
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) n.email = "Please enter a valid email";
    if (!formData.phone || !/^(\d{10}|\d{12})$/.test(formData.phone)) n.phone = "Please enter a valid 10 or 12 digit phone number";
    if (!formData.city || formData.city.trim().length < 2) n.city = "Please enter your city";
    if (!formData.preferred_city) n.preferred_city = "Please select a preferred fair city";
    setErrors(n);
    return Object.keys(n).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/webhook/lead`, {
        name: formData.name, email: formData.email, phone: formData.phone,
        city: formData.city, country: "Germany", source: "germany_fair",
        campaign: `Germany Fair 2026 - ${formData.preferred_city}`, platform: "germany_fair_landing",
        preferred_city: formData.preferred_city,
      });
      setShowThankYou(true);
      setFormData({ name: "", email: "", phone: "", city: "", preferred_city: "" });
      toast.success("Registration successful!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldBase = "w-full px-4 py-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#DD0000] focus:border-transparent outline-none text-sm transition-shadow";

  return (
    <div className="min-h-screen bg-white antialiased" data-testid="germany-fair-page">
      {/* German flag top stripe */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1.5"><FlagStripe /></div>

      {/* Navbar */}
      <nav className="fixed top-1.5 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="VisaXpert" className="h-9 md:h-11" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
            <div className="hidden md:block border-l border-neutral-200 pl-3">
              <p className="text-[10px] uppercase tracking-widest text-[#DD0000] font-bold leading-none">The Germany</p>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold leading-none">Study Abroad Specialist</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:9875985641" className="hidden sm:flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-[#DD0000] transition-colors">
              <Phone size={16} /> 9875985641
            </a>
            <button onClick={scrollToForm}
              className="px-5 py-2 bg-[#DD0000] text-white rounded-full text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/25"
              data-testid="nav-register-btn">
              Register Free
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO — centered editorial ===== */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
        {/* backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-50/50 via-white to-white" />
        <div className="absolute -top-24 right-0 -z-10 w-[520px] h-[520px] bg-amber-200/40 rounded-full blur-[150px]" />
        <div className="absolute top-40 -left-24 -z-10 w-[420px] h-[420px] bg-red-200/40 rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
          }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white text-neutral-700 px-4 py-2 rounded-full text-xs font-bold mb-7 border border-neutral-200 shadow-sm">
            <Award size={14} className="text-amber-500" />
            ICEF CERTIFIED
            <span className="w-1 h-1 rounded-full bg-neutral-300" />
            <span className="text-[#DD0000]">FREE ENTRY · LIMITED SEATS</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6">
            <span className="text-black">Germany</span>{" "}
            <span className="text-[#DD0000]">Education</span>
            <br className="hidden sm:block" />
            <span className="text-amber-500">Fair</span> <span className="text-black">2026</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto mb-9">
            Meet 10+ German universities & public-university experts across Punjab & Jammu —
            with an additional{" "}
            <span className="font-bold text-amber-600">upto {"\u20AC"}1000 discount exclusively for VisaXpert candidates</span>.
          </p>

          {/* THE HIGHLIGHT — No Fees ribbon */}
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-[#DD0000] to-red-700 text-white rounded-2xl pl-4 pr-6 py-3.5 shadow-2xl shadow-red-500/25 mb-9" data-testid="hero-nofee-highlight">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Wallet size={22} />
            </div>
            <div className="text-left">
              <p className="text-lg sm:text-2xl font-black leading-none">No Fees Before & After Visa</p>
              <p className="text-white/80 text-xs sm:text-sm mt-1">Pay nothing before your visa — and nothing after. 100% transparent.</p>
            </div>
          </div>

          {/* Date strip */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-9">
            {eventSchedule.map((e, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-neutral-200 rounded-full pl-3 pr-4 py-1.5 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${e.dot}`} />
                <span className="text-sm font-semibold text-neutral-900">{e.city}</span>
                <span className="text-xs font-medium text-neutral-400">{e.short}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#DD0000] text-white rounded-full font-bold text-base hover:bg-red-700 transition-all shadow-lg shadow-red-500/25"
              data-testid="hero-register-btn">
              Register Free <ArrowRight size={18} />
            </button>
            <a href="tel:9875985641"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-neutral-900 rounded-full font-bold text-base border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all">
              <Phone size={18} /> Call 9875985641
            </a>
          </div>
        </div>

        {/* Trust strip */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-200 border border-neutral-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            {[
              { icon: GraduationCap, val: "4000+", label: "Germany visas processed" },
              { icon: Clock, val: "14+", label: "Years of experience" },
              { icon: Shield, val: "Best", label: "Visa success rate" },
              { icon: MapPin, val: "Berlin", label: "Branch office in Germany" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center px-3 py-6">
                <s.icon size={22} className="text-[#DD0000] mb-2" />
                <p className="text-2xl md:text-3xl font-black text-neutral-900 leading-none">{s.val}</p>
                <p className="text-[11px] md:text-xs text-neutral-500 mt-1.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REGISTRATION — boarding pass ===== */}
      <section className="py-16 md:py-20 bg-neutral-50" ref={formRef}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[#DD0000] font-bold uppercase tracking-widest text-xs mb-3">Your Fair Pass</p>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900">Reserve Your Free Seat</h2>
            <p className="text-neutral-500 mt-2">Limited seats per city — grab your boarding pass to Germany.</p>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] rounded-3xl overflow-hidden bg-white shadow-2xl border border-neutral-100">
            {/* Form side */}
            <div className="p-7 md:p-10 order-2 lg:order-1">
              <div className="h-1.5 w-24 rounded-full mb-6 overflow-hidden"><FlagStripe /></div>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="fair-registration-form">
                <div>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name *"
                    className={`${fieldBase} ${errors.name ? "border-red-400" : "border-neutral-200"}`} data-testid="fair-input-name" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address *"
                    className={`${fieldBase} ${errors.email ? "border-red-400" : "border-neutral-200"}`} data-testid="fair-input-email" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div className="flex">
                  <span className="flex items-center px-3 bg-neutral-100 border border-r-0 border-neutral-200 rounded-l-xl text-sm text-neutral-500 font-medium">+91</span>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Mobile Number *" maxLength={12}
                    className={`${fieldBase} rounded-l-none ${errors.phone ? "border-red-400" : "border-neutral-200"}`} data-testid="fair-input-phone" />
                </div>
                {errors.phone && <p className="text-red-500 text-xs -mt-2">{errors.phone}</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="Your City *"
                      className={`${fieldBase} ${errors.city ? "border-red-400" : "border-neutral-200"}`} data-testid="fair-input-city" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <select name="preferred_city" value={formData.preferred_city} onChange={handleInputChange}
                      className={`${fieldBase} ${errors.preferred_city ? "border-red-400" : "border-neutral-200"}`} data-testid="fair-select-city">
                      <option value="">Fair Location *</option>
                      <option value="Jammu">Jammu — 16th Sep</option>
                      <option value="Pathankot">Pathankot — 17th Sep</option>
                      <option value="Amritsar">Amritsar — 18th Sep</option>
                      <option value="Ludhiana">Ludhiana — 19th Sep</option>
                    </select>
                    {errors.preferred_city && <p className="text-red-500 text-xs mt-1">{errors.preferred_city}</p>}
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#DD0000] text-white rounded-xl font-bold text-base hover:bg-red-700 transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                  data-testid="fair-submit-btn">
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Confirm My Free Seat <ArrowRight size={18} /></>}
                </button>
                <p className="text-[10px] text-neutral-400 text-center">
                  By registering, you consent to be contacted by VisaXpert via phone, SMS, email or WhatsApp. See our{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#DD0000] underline" data-testid="fair-form-privacy-link">Privacy Policy</a>{" "}
                  and{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#DD0000] underline" data-testid="fair-form-terms-link">Terms</a>. Offers are indicative, subject to university approval.
                </p>
              </form>
            </div>

            {/* Pass stub side */}
            <div className="relative bg-neutral-900 text-white p-7 md:p-10 order-1 lg:order-2 flex flex-col justify-between">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 hidden lg:block"><FlagStripe className="flex-col" /></div>
              <div>
                <div className="flex items-center gap-2 text-amber-400 mb-6">
                  <PlaneTakeoff size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Boarding Pass · 2026</span>
                </div>
                <p className="text-2xl font-black leading-tight mb-1">Germany Education Fair</p>
                <p className="text-white/50 text-sm mb-7">4 cities · 16–19 September</p>

                <ul className="space-y-3">
                  {[
                    "No fees before & after visa",
                    "upto \u20AC1000 VisaXpert-only discount",
                    "10+ universities & public experts",
                    "On-the-spot pre-screening",
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/85">
                      <Check size={16} className="text-amber-400 mt-0.5 flex-shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Entry</p>
                  <p className="text-lg font-black text-amber-400">FREE</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Seats</p>
                  <p className="text-lg font-black">Limited</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENEFITS — bento ===== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#DD0000] font-bold uppercase tracking-widest text-xs mb-3">The Advantage</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900">Why You Must Attend</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Big highlight card */}
            <div className="md:col-span-2 md:row-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#DD0000] to-red-700 text-white p-8 md:p-10 shadow-xl shadow-red-500/20" data-testid="benefit-card-0">
              <div className="absolute -right-8 -bottom-8 opacity-10"><Wallet size={180} /></div>
              <div className="relative">
                <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-xs font-black tracking-wider mb-4">OUR #1 HIGHLIGHT</span>
                <h3 className="text-2xl md:text-3xl font-black mb-3 max-w-md">No Fees Before & After Visa</h3>
                <p className="text-white/85 max-w-lg">Our biggest promise — zero consultancy fees. Pay nothing before your visa and nothing after. No hidden charges, ever.</p>
              </div>
            </div>

            {/* €1000 exclusive */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white p-8 shadow-xl shadow-amber-500/20" data-testid="benefit-card-1">
              <Gift size={28} className="mb-4" />
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider mb-3">EXCLUSIVE</span>
              <h3 className="text-xl font-black mb-2">Upto {"\u20AC"}1000 Discount</h3>
              <p className="text-white/90 text-sm">An additional tuition discount of upto {"\u20AC"}1000 offered <span className="font-bold">only to VisaXpert candidates</span>.</p>
            </div>

            {/* 10+ universities */}
            <div className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-8 shadow-xl" data-testid="benefit-card-2">
              <Users size={28} className="text-amber-400 mb-4" />
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-black tracking-wider mb-3">10+ UNIVERSITIES</span>
              <h3 className="text-xl font-black mb-2">Meet Universities In Person</h3>
              <p className="text-white/70 text-sm">Including public-university experts guiding you on tuition-free study options.</p>
            </div>

            {/* Pre-screening */}
            <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-white border border-neutral-200 p-8 hover:shadow-lg transition-shadow" data-testid="benefit-card-3">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck size={26} className="text-white" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-[#DD0000] text-xs font-black tracking-wider mb-2">FAST-TRACK</span>
                  <h3 className="text-xl font-black text-neutral-900 mb-2">On-the-spot Pre-screening for Admission</h3>
                  <p className="text-neutral-500 text-sm max-w-xl">Submit your profile at the fair for fast-track evaluation by university representatives — subject to university approval.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SCHEDULE — journey timeline ===== */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[#DD0000] font-bold uppercase tracking-widest text-xs mb-3">4 Cities · 4 Days</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900">Fair Schedule</h2>
            <p className="text-neutral-500 mt-2">Follow the journey — pick the stop nearest to you.</p>
          </div>

          <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* connecting line (desktop) */}
            <div className="hidden lg:block absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#DD0000] via-neutral-900 to-amber-500 opacity-30" />
            {eventSchedule.map((event, index) => (
              <div key={index} className="relative" data-testid={`schedule-card-${event.city.toLowerCase()}`}>
                {/* node */}
                <div className="flex lg:justify-center mb-5">
                  <div className={`relative z-10 w-10 h-10 rounded-full ${event.dot} text-white flex items-center justify-center font-black shadow-lg ring-4 ring-white`}>
                    {index + 1}
                  </div>
                </div>
                <div className={`group bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-black text-neutral-900">{event.city}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${event.accent}`}>
                      <Calendar size={13} /> {event.day}
                    </span>
                  </div>
                  <p className={`text-base font-bold ${event.accent} mb-4`}>{event.date}</p>

                  <CountdownDisplay targetDate={event.targetDate} accent={event.accent} />

                  <div className="space-y-2.5 text-sm text-neutral-500 mt-5">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-snug">{event.address}</span>
                    </div>
                    <a href={`tel:${event.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-[#DD0000] font-medium">
                      <Phone size={15} className="text-neutral-400 flex-shrink-0" /> {event.phone}
                    </a>
                  </div>
                  <button onClick={scrollToForm} className={`w-full mt-5 py-2.5 bg-gradient-to-r ${event.color} text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all`}>
                    Register for {event.city}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== UNIVERSITIES ===== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#DD0000] font-bold uppercase tracking-widest text-xs mb-3">Face to Face</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900">Participating Universities</h2>
            <p className="text-neutral-500 mt-2">Meet 10+ universities including public-university experts.</p>
          </div>
          {(() => {
            const combinedUnis = [
              ...universities,
              ...partnerLogos.map((l) => ({
                name: l.name,
                logo: (l.logo_url || "").replace(/^\/assets\/uploads\//, "/api/uploads/"),
              })),
            ];
            return (
              <>
                <div className="relative overflow-hidden mb-10 py-4 border-y border-neutral-100">
                  <div className="flex gap-12 md:gap-16 animate-scroll items-center">
                    {[...combinedUnis, ...combinedUnis].map((uni, index) => (
                      <div key={index} className="flex-shrink-0 w-[130px] md:w-[160px] h-[80px] md:h-[100px] flex items-center justify-center" title={uni.name} data-testid={`fair-uni-${index}`}>
                        {imageErrors[index % combinedUnis.length] ? (
                          <span className="text-2xl font-bold text-[#DD0000]">{uni.name.charAt(0)}</span>
                        ) : (
                          <img src={uni.logo} alt={uni.name} className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300" onError={() => handleImageError(index % combinedUnis.length)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {combinedUnis.map((uni, index) => (
                    <div key={index} className="flex items-center gap-3 bg-neutral-50 rounded-xl p-4 border border-neutral-100 hover:border-red-200 hover:bg-red-50/30 transition-all" data-testid={`fair-uni-card-${index}`}>
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-neutral-200 flex-shrink-0">
                        <GraduationCap size={20} className="text-[#DD0000]" />
                      </div>
                      <span className="text-sm font-medium text-neutral-700 leading-tight">{uni.name}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      {reviews.length > 0 && (
        <section className="py-16 md:py-24 bg-neutral-50" data-testid="fair-reviews-section">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-[#DD0000] font-bold uppercase tracking-widest text-xs mb-3">Student Stories</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900">What Our Students Say</h2>
            </div>
            <div className="relative overflow-hidden" data-testid="fair-reviews-slider">
              <div className="flex gap-6 md:gap-8 animate-reviews-scroll w-max">
                {[...reviews, ...reviews].map((review, index) => (
                  <div
                    key={`${review.review_id || "r"}-${index}`}
                    className="flex-shrink-0 w-[320px] md:w-[380px] bg-white rounded-2xl p-6 border border-neutral-100 hover:shadow-lg transition-all"
                    data-testid={`fair-review-${index}`}
                  >
                    <div className="flex gap-1 mb-4">
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-neutral-600 mb-6 leading-relaxed">"{review.content}"</p>
                    <div className="flex items-center gap-3">
                      {review.image_url ? (
                        <img src={review.image_url.replace(/^\/assets\/uploads\//, "/api/uploads/")} alt={review.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-[#DD0000] to-red-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{review.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-neutral-900">{review.name}</p>
                        <p className="text-sm text-neutral-500">Studies in {review.country}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-neutral-50 to-transparent"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-neutral-50 to-transparent"></div>
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA band ===== */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-[#DD0000] to-red-700">
        <div className="absolute top-0 left-0 right-0 h-1.5"><FlagStripe /></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">No Fees Before & After Visa</h2>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto">Pay nothing before or after your visa — plus a discount of upto {"\u20AC"}1000 exclusively for VisaXpert candidates, and 10+ universities under one roof.</p>
          <button onClick={scrollToForm} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#DD0000] rounded-full font-bold text-lg hover:bg-amber-50 transition-all shadow-2xl" data-testid="cta-register-btn">
            Register Now — It's Free <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-black py-12">
        <div className="h-1.5 mb-10 -mt-12"><FlagStripe /></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <img src={logoUrl} alt="VisaXpert" className="h-10 mb-3 brightness-200" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">The Germany Study Abroad Specialist</p>
              <p className="text-neutral-400 text-sm">4000+ Germany Visas since 2012. ICEF Certified. Best visa success rate for Germany.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Our Branches</h4>
              <ul className="space-y-4 text-sm text-neutral-400">
                {eventSchedule.map((branch, i) => (
                  <li key={i} className="flex items-start gap-2" data-testid={`footer-branch-${branch.city.toLowerCase()}`}>
                    <MapPin size={14} className="text-[#DD0000] mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-white font-semibold">{branch.city}</p>
                      <p className="text-xs text-neutral-400 leading-snug">{branch.address}</p>
                      <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-white transition-colors">
                        <Phone size={11} className="text-[#DD0000]" /> {branch.phone}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Berlin Office</h4>
              <div className="space-y-3 text-sm text-neutral-400">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#DD0000] mt-0.5 flex-shrink-0" />
                  <span>Belziger Strasse 69-71, 10823, Berlin, Germany</span>
                </div>
                <a href="tel:+491784555932" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone size={14} className="text-[#DD0000]" /> +49 1784555932
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MessageCircle size={14} className="text-green-500" /> WhatsApp Us
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Contact India</h4>
              <div className="space-y-3 text-sm text-neutral-400">
                <a href="tel:9875985641" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone size={14} className="text-[#DD0000]" /> 9875985641
                </a>
                <a href="mailto:info@visaxpertinternational.co.in" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MessageCircle size={14} className="text-[#DD0000]" /> info@visaxpertinternational.co.in
                </a>
                <p className="text-neutral-500 text-xs pt-2">Branches in Ludhiana, Amritsar, Pathankot & Jammu</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-800 text-center text-xs text-neutral-500">
            <p>Germany Education Fair 2026 by VisaXpert International. All rights reserved.</p>
            <p className="mt-2">VisaXpert International is a private overseas-education consultancy and is not affiliated with any government body, embassy, consulate, or university. We do not guarantee visa approvals or admissions. Discounts, fee waivers and admission offers shown are indicative — they are subject to evaluation and approval by the respective universities. University logos are property of their owners and are shown only to indicate participation in this fair.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-neutral-400">
              <a href="/privacy-policy" className="hover:text-white underline" data-testid="fair-footer-privacy-link">Privacy Policy</a>
              <span className="text-neutral-700">|</span>
              <a href="/terms" className="hover:text-white underline" data-testid="fair-footer-terms-link">Terms of Service</a>
              <span className="text-neutral-700">|</span>
              <a href="mailto:info@visaxpertinternational.co.in" className="hover:text-white underline">info@visaxpertinternational.co.in</a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp */}
      <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi,%20I'm%20interested%20in%20the%20Germany%20Education%20Fair%202026`} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:bg-green-600 transition-colors hover:scale-110" data-testid="whatsapp-btn">
        <MessageCircle size={28} className="text-white" fill="white" />
      </a>

      {/* Thank You Modal */}
      {showThankYou && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowThankYou(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in-up">
            <button onClick={() => setShowThankYou(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"><X size={24} /></button>
            <div className="w-20 h-20 bg-gradient-to-br from-[#DD0000] to-red-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-2" data-testid="thank-you-heading">You're Registered!</h3>
            <p className="text-neutral-500 mb-6">Thank you for registering for the Germany Education Fair 2026. Our team will contact you shortly with event details.</p>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-amber-800 font-semibold text-sm">Arrive early to get the best interaction time with university representatives!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
