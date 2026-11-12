import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  Building2,
  FileCheck,
  Users,
  Mail,
  User,
  School,
  RefreshCw,
  Star,
  Shield,
  ChevronDown,
  ArrowDown,
  Sparkles,
  BadgeCheck,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  MessageCircle,
  Globe,
  Target,
  GraduationCap,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const DEFAULT_LOGO = "/assets/visaxpert-logo.png";

// Process steps
const processSteps = [
  {
    step: 1,
    title: "Free Consultation",
    description: "Book a call with our Berlin experts to discuss your situation and goals",
    icon: MessageCircle,
  },
  {
    step: 2,
    title: "University Matching",
    description: "We identify the best universities matching your profile and career goals",
    icon: Target,
  },
  {
    step: 3,
    title: "Document Preparation",
    description: "Complete documentation support including transcripts and credit evaluation",
    icon: ClipboardCheck,
  },
  {
    step: 4,
    title: "Application & Admission",
    description: "We handle the entire application process until you receive admission",
    icon: BadgeCheck,
  },
];

// Services offered
const services = [
  {
    icon: Building2,
    title: "Private University to Public University",
    description: "Move to renowned public universities like TU Berlin, FU Berlin, or Humboldt for lower fees and better recognition",
    benefits: ["Lower tuition fees", "Better job prospects", "International recognition"],
    color: "emerald",
  },
  {
    icon: Sparkles,
    title: "Public University to Private University",
    description: "Switch to private universities for specialized programs, smaller classes, and faster degree completion",
    benefits: ["Flexible schedules", "Industry connections", "Faster graduation"],
    color: "emerald",
  },
  {
    icon: RefreshCw,
    title: "Course / Major Change",
    description: "Change your study program within Berlin universities with maximum credit transfer",
    benefits: ["Career realignment", "Follow your passion", "Credit optimization"],
    color: "emerald",
  },
  {
    icon: FileCheck,
    title: "Credit Transfer Support",
    description: "Expert evaluation and transfer of your existing credits to minimize study duration",
    benefits: ["Save time", "Save money", "No repeated courses"],
    color: "emerald",
  },
  {
    icon: Briefcase,
    title: "Career Counselling",
    description: "Align your university choice with your career goals for maximum employability",
    benefits: ["Career planning", "Industry insights", "Job placement support"],
    color: "emerald",
  },
];

// Universities we work with
const universities = [
  "TU Berlin", "FU Berlin", "Humboldt University", "HTW Berlin",
  "Beuth University", "SRH Berlin", "ESMT Berlin", "Bard College Berlin"
];

// Comparison table
const comparisonData = [
  { feature: "Tuition Fees", private: "€10,000 - €20,000/year", public: "€300 - €600/semester" },
  { feature: "Class Size", private: "15-30 students", public: "50-200 students" },
  { feature: "International Recognition", private: "Varies", public: "Highly recognized" },
  { feature: "Industry Connections", private: "Strong", public: "Moderate" },
  { feature: "Degree Duration", private: "Flexible", public: "Fixed" },
  { feature: "Research Opportunities", private: "Limited", public: "Extensive" },
];

// Testimonials
const testimonials = [
  {
    name: "Rahul Sharma",
    image: "RS",
    university: "Transferred to TU Berlin",
    course: "Computer Science",
    text: "VisaXpert helped me transfer from a private college to TU Berlin. The process was incredibly smooth and professional.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    image: "PP",
    university: "Changed to Humboldt University",
    course: "Economics",
    text: "I was stuck at a college with limited opportunities. Now I'm at Humboldt University - one of Germany's top universities. Thank you VisaXpert team!",
    rating: 5,
  },
  {
    name: "Amit Kumar",
    image: "AK",
    university: "Course Change at FU Berlin",
    course: "Business → Data Science",
    text: "Realized Business wasn't for me after 2 semesters. VisaXpert helped me switch to Data Science with maximum credit transfer. Best decision ever!",
    rating: 5,
  },
  {
    name: "Sneha Gupta",
    image: "SG",
    university: "HTW Berlin",
    course: "Engineering",
    text: "The visa update process during university change scared me. But VisaXpert handled everything perfectly. No stress at all!",
    rating: 5,
  },
];

// FAQ - Updated content
const faqs = [
  {
    question: "Can I transfer from a private university to a public university in Berlin?",
    answer: "Yes, it is possible, and many students explore this option during their studies in Germany.\n\nHowever, it's important to understand that this is not a direct transfer. In most cases, you apply again to a public university, and your previous studies are evaluated for credit recognition.\n\nSome students choose to switch for financial reasons, while others prefer to stay in private universities due to their structured support, smaller classes, and flexibility.\n\nThe right choice depends on your individual priorities — and both pathways are valid.",
  },
  {
    question: "How much can I save by switching to a public university?",
    answer: "Public universities in Germany are generally more affordable, as they charge only administrative fees (around €300–€600 per semester), while private universities have tuition fees that can range from €10,000 to €20,000 per year.\n\nAt the same time, private universities often provide added value through smaller class sizes, industry-focused programs, and more personalized academic support.\n\nFor students considering switching, the financial savings can be significant — but it's always important to balance cost with the overall learning experience and career goals.\n\nWe also help students explore cost-efficient options across both pathways, including competitive service pricing and access to university-level discounts where available.",
  },
  {
    question: "Will all my credits be transferred?",
    answer: "Credit transfer depends on how closely your previous subjects match the new course.\n\nIn many cases, students are able to transfer some of their credits, but not always all. Public universities tend to follow stricter academic matching, while private universities may offer more flexibility in recognizing prior learning.\n\nBecause of this, some students continue from a later semester, while others may need to step back slightly.\n\nA well-planned approach can help maximize your credit recognition.",
  },
  {
    question: "How long does the transfer process take?",
    answer: "The timeline depends on the intake and the university, but generally, the process takes a few weeks to a couple of months.\n\nPublic universities follow fixed deadlines and structured timelines, while private universities often offer more flexible admission cycles and faster processing.\n\nThis is why some students choose to stay in private universities for continuity, while others plan ahead to switch at the right time.",
  },
  {
    question: "Will my student visa be affected during the transfer?",
    answer: "Changing universities is allowed in Germany, and your visa is generally not affected as long as your student status remains valid.\n\nYou will need to update your details with the authorities once you switch universities.\n\nWhether you stay in a private university or move to a public one, the key is to ensure there are no gaps in your enrollment.",
  },
  {
    question: "What if I want to change my course/major completely?",
    answer: "This is possible in both private and public universities.\n\nPrivate universities often offer more flexibility when it comes to changing programs, while public universities may require stricter subject alignment and eligibility criteria.\n\nIf the new course is very different, you may need to start from an earlier semester.\n\nMany students use this opportunity to realign their studies with their long-term goals.",
  },
  {
    question: "Do you guarantee admission?",
    answer: "No consultancy can guarantee admission, as universities make the final decision.\n\nWhat we do is guide you based on your profile, helping you choose the most suitable options — whether that's continuing in a private university or switching to a public one.\n\nOur focus is on helping you make a decision that is academically right, financially sensible, and practical in the long term.",
  },
];

// German universities logos are now fully managed from the dashboard
// (Dashboard → Partner Logos → page "university_change"). The static
// fallback array has been removed in favour of the partner-logos API.

// Consultation modes
const consultationModes = [
  { value: "in_person", label: "In person meeting (Berlin Office)" },
  { value: "telephonic", label: "Telephonic call" },
  { value: "online", label: "Online Meeting" },
];

// Country codes (most common — Germany default)
const COUNTRY_CODES = [
  { code: "+49", label: "DE +49" },
  { code: "+91", label: "IN +91" },
  { code: "+44", label: "UK +44" },
  { code: "+1", label: "US +1" },
  { code: "+971", label: "AE +971" },
  { code: "+61", label: "AU +61" },
  { code: "+1", label: "CA +1" },
  { code: "+65", label: "SG +65" },
  { code: "+86", label: "CN +86" },
  { code: "+33", label: "FR +33" },
  { code: "+39", label: "IT +39" },
  { code: "+34", label: "ES +34" },
  { code: "+880", label: "BD +880" },
  { code: "+92", label: "PK +92" },
  { code: "+977", label: "NP +977" },
  { code: "+94", label: "LK +94" },
];

const BERLIN_PHONE = "+49 1784555932";
const WHATSAPP_NUMBER = "491784555932";

export default function UniversityChangePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country_code: "+49",
    city: "",
    current_university: "",
    transfer_type: "",
    consultation_mode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Marketing attribution captured from URL / sessionStorage on first paint so
  // we can tell which Meta campaign a lead or a WhatsApp click came from.
  const [utmData, setUtmData] = useState({});
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [reviews, setReviews] = useState([]);
  const [partnerLogos, setPartnerLogos] = useState([]);
  const formRef = useRef(null);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Capture Meta / Google campaign attribution from the URL on first load.
  // We persist to sessionStorage so a visitor who clicks around still keeps
  // the same UTMs even if they land on the form later.
  useEffect(() => {
    const UTM_KEYS = [
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
      "fbclid", "gclid",
    ];
    const STORE_KEY = "vx_uc_utm";
    let captured = {};
    try {
      const params = new URLSearchParams(window.location.search);
      UTM_KEYS.forEach((k) => {
        const v = params.get(k);
        if (v) captured[k] = v;
      });
      if (Object.keys(captured).length === 0) {
        const cached = sessionStorage.getItem(STORE_KEY);
        if (cached) captured = JSON.parse(cached) || {};
      } else {
        sessionStorage.setItem(STORE_KEY, JSON.stringify(captured));
      }
    } catch (e) {
      captured = {};
    }
    setUtmData(captured);
  }, []);

  // Fetch custom page logo + backend reviews
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await axios.get(`${API}/api/page-logos`);
        if (res.data?.university_change) setLogoUrl(res.data.university_change);
      } catch (e) {
        console.error("Failed to fetch logo:", e);
      }
    };
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`${API}/api/reviews?page=university_change`);
        if (res.data?.reviews?.length > 0) setReviews(res.data.reviews);
      } catch (e) {
        console.error("Failed to fetch reviews:", e);
      }
    };
    const fetchPartnerLogos = async () => {
      try {
        const res = await axios.get(`${API}/api/partner-logos?page=university_change`);
        setPartnerLogos(res.data?.logos || []);
      } catch (e) {
        console.error("Failed to fetch partner logos:", e);
      }
    };
    fetchLogo();
    fetchReviews();
    fetchPartnerLogos();
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "phone") {
      // strip everything except digits — country code is separate
      const cleaned = value.replace(/\D/g, "").slice(0, 15);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || formData.name.length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!formData.phone || formData.phone.length < 8) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!formData.transfer_type) {
      toast.error("Please select what you're looking for");
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = `${formData.country_code} ${formData.phone}`.trim();
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: fullPhone,
        city: formData.city || "Berlin",
        country: "Germany",
        source: "university_change",
        campaign: utmData.utm_campaign || "Berlin University Change",
        platform: "website",
        current_university: formData.current_university,
        transfer_type: formData.transfer_type,
        // Marketing attribution — persisted into the lead's extra_data so the
        // dashboard can attribute this lead to the correct Meta / Google campaign.
        ...utmData,
        landing_url: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      };

      await fetch(`${API}/api/webhook/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17858205001/fkGaCMm0joocEMmqusNC",
        });
      }

      if (window.dataLayer) {
        window.dataLayer.push({
          event: "form_submit",
          form_name: "university_change_enquiry",
        });
      }

      setShowSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        country_code: "+49",
        city: "",
        current_university: "",
        transfer_type: "",
        consultation_mode: "",
      });

    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Something went wrong. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const logClickEvent = (clickType) => {
    // Fire-and-forget; never block the user's redirect on this call.
    try {
      const body = {
        click_type: clickType,
        page: "berlin",
        ...utmData,
        landing_url: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      };
      // Use fetch with keepalive so the request survives the tab navigation.
      fetch(`${API}/api/uc-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  };

  const handleWhatsAppClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "whatsapp_click",
        page: "university_change",
        utm_campaign: utmData.utm_campaign || "",
        utm_source: utmData.utm_source || "",
      });
    }
    logClickEvent("whatsapp");
    // Include the campaign in the WhatsApp opening message so sales can also
    // see it inside WhatsApp itself.
    const camp = utmData.utm_campaign ? ` [${utmData.utm_campaign}]` : "";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I want to enquire about university change in Berlin.${camp}`, "_blank");
  };

  const handleCallClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "call_click",
        page: "university_change",
        utm_campaign: utmData.utm_campaign || "",
        utm_source: utmData.utm_source || "",
      });
    }
    logClickEvent("call");
    window.location.href = `tel:${BERLIN_PHONE.replace(/\s/g, "")}`;
  };

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const transferTypes = [
    { value: "shift_public", label: "Shifting to public university" },
    { value: "shift_private", label: "Shifting to private university" },
    { value: "others", label: "Others" },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section - Clean White Design */}
      <section className="relative min-h-screen bg-white text-slate-900 overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-12">
            <a href="/" className="flex items-center">
              <img src={logoUrl} alt="VisaXpert" className="h-14 md:h-16 object-contain" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
            </a>
            <button
              onClick={handleCallClick}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full transition-all text-sm font-medium"
            >
              <Phone size={16} />
              {BERLIN_PHONE}
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm mb-6 border border-emerald-100">
                <img src={logoUrl} alt="" className="h-4 w-auto" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
                <span className="font-medium">The Germany Study Abroad Specialist</span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-slate-900">
                Switch Your
                <span className="block text-emerald-600">
                  University in Berlin
                </span>
                <span className="block text-3xl sm:text-4xl lg:text-5xl mt-2 font-bold text-slate-500">
                  Hassle Free
                </span>
              </h2>

              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Expert guidance for transferring between private and public universities in Berlin. 
                We handle everything from documentation to enrollments.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <button
                  onClick={scrollToForm}
                  className="group px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
                  data-testid="hero-cta-btn"
                >
                  Get Free Consultation
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={handleWhatsAppClick}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
                  data-testid="hero-whatsapp-btn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp Now
                </button>
              </div>

              {/* Trust Badges - VisaXpert Branding */}
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">4000+</p>
                    <p className="text-xs text-slate-500">Success Stories</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">14+</p>
                    <p className="text-xs text-slate-500">Years of Experience</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">ICEF</p>
                    <p className="text-xs text-slate-500">Certified Agency</p>
                  </div>
                </div>
              </div>

              {/* Trust Points */}
              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>Free Consultation</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>Berlin Based</span>
                </div>
              </div>
            </div>

            {/* Right - Form */}
            <div ref={formRef} className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto order-1 lg:order-2">
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 relative overflow-hidden border border-slate-100">
                {/* Form decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full"></div>
                
                {showSuccess ? (
                  <SuccessMessage onReset={() => setShowSuccess(false)} />
                ) : (
                  <>
                    <div className="text-center mb-6 relative">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-3">
                        <Sparkles className="w-3 h-3" />
                        Free Consultation - Limited Slots
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">Get in touch</h3>
                      <p className="text-slate-500 text-sm mt-1">Get expert advice in 30 minutes</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 relative">
                      {/* Name */}
                      <FormInput
                        icon={User}
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Full Name *"
                        testId="form-name"
                      />

                      {/* Email */}
                      <FormInput
                        icon={Mail}
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Email Address *"
                        testId="form-email"
                      />

                      {/* Phone with country code */}
                      <div className="flex gap-2">
                        <div className="relative">
                          <select
                            name="country_code"
                            value={formData.country_code}
                            onChange={handleInputChange}
                            data-testid="form-country-code"
                            className="h-full pl-3 pr-7 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white text-slate-700 text-sm font-medium appearance-none cursor-pointer"
                          >
                            {COUNTRY_CODES.map((c, i) => (
                              <option key={`${c.code}-${i}`} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="flex-1">
                          <FormInput
                            icon={Phone}
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Phone number *"
                            testId="form-phone"
                          />
                        </div>
                      </div>

                      {/* Current University (optional) */}
                      <FormInput
                        icon={School}
                        type="text"
                        name="current_university"
                        value={formData.current_university}
                        onChange={handleInputChange}
                        placeholder="Current University / College (optional)"
                        testId="form-university"
                      />

                      {/* Transfer Type */}
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <select
                          name="transfer_type"
                          value={formData.transfer_type}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white text-slate-600 appearance-none cursor-pointer"
                          data-testid="form-transfer-type"
                        >
                          <option value="">What are you looking for? *</option>
                          {transferTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
                        data-testid="form-submit"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit
                            <ArrowRight size={20} />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> 100% Free
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 30 Min Session
                      </span>
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> No Obligation
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 text-center leading-relaxed" data-testid="uc-form-consent">
                      By submitting, you consent to be contacted by VisaXpert via phone, SMS, email or WhatsApp. See our{" "}
                      <a href="/berlin/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline" data-testid="uc-form-privacy-link">Privacy Policy</a>{" "}
                      and{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline" data-testid="uc-form-terms-link">Terms</a>. VisaXpert does not guarantee admissions or visa approvals.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden lg:block">
            <ArrowDown className="w-6 h-6 text-slate-300" />
          </div>
        </div>
      </section>

      {/* German University Logos Section - Sliding */}
      <section className="py-12 bg-white border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Universities We Work With</p>
          </div>
          <div className="relative overflow-hidden">
            {(() => {
              const combined = partnerLogos.map((l) => ({
                name: l.name,
                logo: (l.logo_url || "").replace(/^\/assets\/uploads\//, "/api/uploads/"),
              }));
              if (combined.length === 0) return null;
              return (
                <div className="flex gap-12 md:gap-16 animate-scroll items-center">
                  {[...combined, ...combined].map((uni, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-[120px] md:w-[150px] h-[70px] md:h-[90px] flex items-center justify-center"
                      title={uni.name}
                    >
                      {imageErrors[index % combined.length] ? (
                        <span className="text-2xl font-bold text-emerald-600">{uni.name.charAt(0)}</span>
                      ) : (
                        <img
                          src={uni.logo}
                          alt={uni.name}
                          className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                          onError={() => handleImageError(index % combined.length)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We've simplified the university transfer process into 4 easy steps
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {processSteps.map((step, index) => (
                <div key={index} className="relative text-center group">
                  <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                    <step.icon className="w-7 h-7 text-white" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-emerald-600 rounded-full text-xs font-bold flex items-center justify-center shadow">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 lg:py-24 bg-slate-50" data-testid="unichange-video-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-4">
              Watch & Learn
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Know More About University Change
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Learn how we help students navigate the university transfer process in Germany
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-white">
              <video
                controls
                className="absolute inset-0 w-full h-full object-contain"
                data-testid="unichange-video"
                preload="metadata"
                poster="/assets/videos/university-change-thumbnail.png"
              >
                <source src="/assets/videos/berlin.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-4">
              Our Services
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Comprehensive Transfer Support
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Whatever your university transfer needs, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <ServiceCard key={index} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-4">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Common Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium text-slate-900">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Student Reviews from backend */}
      {reviews.length > 0 && (
        <section className="py-16 lg:py-20 bg-white" data-testid="unichange-reviews-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">Student Success Stories</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Real students who successfully transferred to their dream university with us</p>
            </div>
            <div className="relative overflow-hidden" data-testid="unichange-reviews-slider">
              <div className="flex gap-6 md:gap-8 animate-reviews-scroll w-max">
                {[...reviews, ...reviews].map((review, index) => (
                  <div
                    key={`${review.review_id || "r"}-${index}`}
                    className="flex-shrink-0 w-[320px] md:w-[380px] bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-all"
                    data-testid={`unichange-review-${index}`}
                  >
                    <div className="flex gap-1 mb-4">
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 mb-6 leading-relaxed">"{review.content}"</p>
                    <div className="flex items-center gap-3">
                      {review.image_url ? (
                        <img src={review.image_url.replace(/^\/assets\/uploads\//, "/api/uploads/")} alt={review.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{review.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">{review.name}</p>
                        <p className="text-sm text-slate-500">Studies in {review.country}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent"></div>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm mb-6">
            <img src={logoUrl} alt="" className="h-4 w-auto brightness-0 invert" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
            <span>Your Success Is Our Priority</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Switch to a Better University?
          </h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            Don't let the wrong university hold back your career. Book a free consultation and discover your options today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToForm}
              className="group px-10 py-5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              Get Free Consultation
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleWhatsAppClick}
              className="px-10 py-5 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <a href="/" className="flex items-center mb-4">
                <span className="text-2xl font-bold text-white">VisaXpert</span>
              </a>
              <p className="text-slate-400 text-sm">
                Expert guidance for university transfers in Berlin. Your trusted partner for a successful academic journey.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact Berlin Office</h4>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Belziger strasse 69-71, 10823, Berlin</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${BERLIN_PHONE.replace(/\s/g, "")}`} className="hover:text-white">
                    {BERLIN_PHONE}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Mon - Sat: 9:00 AM - 6:00 PM (CET)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Presence in India
              </h4>
              <div className="space-y-2 text-sm">
                <a href="tel:09888194266" className="block text-slate-400 hover:text-emerald-400 transition-colors">Ludhiana - 098881 94266</a>
                <a href="tel:08284837654" className="block text-slate-400 hover:text-emerald-400 transition-colors">Amritsar - 082848 37654</a>
                <a href="tel:08054778465" className="block text-slate-400 hover:text-emerald-400 transition-colors">Pathankot - 080547 78465</a>
                <a href="tel:09878866657" className="block text-slate-400 hover:text-emerald-400 transition-colors">Jammu - 098788 66657</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <a href="/" className="block text-slate-400 hover:text-white transition-colors">Study Abroad Services</a>
                <a href="/university-change" className="block text-slate-400 hover:text-white transition-colors">University Change</a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400 space-y-3">
            <p>© {new Date().getFullYear()} VisaXpert International. All rights reserved.</p>
            <p className="text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed">
              VisaXpert UG (haftungsbeschränkt), Belziger Straße 69-71, 10823 Berlin, Germany &middot; Amtsgericht Charlottenburg HRB 287955 B. VisaXpert is a private overseas-education consultancy and is not affiliated with any government body, embassy, consulate, or university. We do not guarantee visa approvals or admissions. Any discounts, scholarships or fee waivers mentioned are indicative offers from participating universities, subject to their own evaluation and approval. University logos are property of their respective owners.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
              <a href="/impressum" className="hover:text-white underline" data-testid="uc-footer-impressum-link">Impressum</a>
              <span className="text-slate-700">|</span>
              <a href="/berlin/privacy-policy" className="hover:text-white underline" data-testid="uc-footer-privacy-link">Datenschutz / Privacy Policy</a>
              <span className="text-slate-700">|</span>
              <a href="/terms" className="hover:text-white underline" data-testid="uc-footer-terms-link">Terms of Service</a>
              <span className="text-slate-700">|</span>
              <a href="mailto:info@visaxpertinternational.co.in" className="hover:text-white underline">info@visaxpertinternational.co.in</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50 group"
        data-testid="floating-whatsapp"
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute right-full mr-3 px-3 py-1 bg-slate-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Chat with us
        </span>
      </button>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:hidden z-40 shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={handleCallClick}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-900 flex items-center justify-center gap-2 text-sm"
          >
            <Phone size={18} />
            Call
          </button>
          <button
            onClick={scrollToForm}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
          >
            Enquire Now
          </button>
        </div>
      </div>

    </div>
  );
}

// Sub-components

function FormInput({ icon: Icon, type, name, value, onChange, placeholder, testId }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        data-testid={testId}
      />
    </div>
  );
}

function SuccessMessage({ onReset }) {
  return (
    <div className="text-center py-8" data-testid="uc-success-message">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h3>
      <p className="text-slate-600 mb-6">
        We&rsquo;ve received your details. Our Berlin team will reach out to you shortly.
      </p>
      <p className="text-base font-semibold text-emerald-700 mb-6" data-testid="uc-success-tagline">
        Looking forward to meet you.<br />
        <span className="text-slate-700 font-bold">— Team VisaXpert</span>
      </p>
      <button
        onClick={onReset}
        className="text-blue-600 hover:text-blue-700 font-medium"
      >
        Submit Another Enquiry
      </button>
    </div>
  );
}

function ServiceCard({ service }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
    red: "from-red-500 to-red-600 shadow-red-500/25",
    teal: "from-teal-500 to-teal-600 shadow-teal-500/25",
  };

  return (
    <div className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-slate-200">
      <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[service.color]} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
        <service.icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{service.title}</h3>
      <p className="text-slate-600 text-sm mb-4">{service.description}</p>
      <ul className="space-y-2">
        {service.benefits.map((benefit, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TestimonialCard({ testimonial, isActive }) {
  return (
    <div className={`bg-slate-50 p-6 rounded-2xl transition-all ${isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
      <div className="flex gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-slate-700 mb-4 text-sm leading-relaxed">"{testimonial.text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {testimonial.image}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{testimonial.name}</p>
          <p className="text-xs text-slate-500">{testimonial.university}</p>
        </div>
      </div>
    </div>
  );
}
