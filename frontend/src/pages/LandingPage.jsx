import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  GraduationCap,
  FileText,
  Plane,
  Building2,
  Users,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  Star,
  Clock,
  Shield,
  Award,
  X,
  MessageCircle,
  PhoneCall,
  Globe,
} from "lucide-react";
import Home from "lucide-react/dist/esm/icons/house.js";
import Play from "lucide-react/dist/esm/icons/play.js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Track events in Google Tag Manager
const trackEvent = (eventName, eventData = {}) => {
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  }
  console.log('Event tracked:', eventName, eventData);
};

// Track Google Ads Conversion
const trackGoogleAdsConversion = () => {
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17858205001/fkGaCMm0joocEMmqusNC'
    });
    console.log('Google Ads conversion tracked');
  }
};

// Logo URL
const DEFAULT_LOGO = "/assets/visaxpert-logo.png";

// Image URLs
const IMAGES = {
  canada: "https://images.unsplash.com/photo-1614828397879-14bb3db6843f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHw0fHx0b3JvbnRvJTIwc2t5bGluZSUyMGNuJTIwdG93ZXIlMjBjYW5hZGF8ZW58MHx8fHwxNzczNDcwMTcyfDA&ixlib=rb-4.1.0&q=85",
  australia: "https://images.unsplash.com/photo-1627817972085-fb1697d97134?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwyfHxzeWRuZXklMjBvcGVyYSUyMGhvdXNlJTIwYXVzdHJhbGlhfGVufDB8fHx8MTc3MzQ3MDE3M3ww&ixlib=rb-4.1.0&q=85",
  uk: "https://images.unsplash.com/photo-1658518345595-461f00f31659?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxsb25kb24lMjBiaWclMjBiZW4lMjB1ayUyMGNpdHl8ZW58MHx8fHwxNzczNDcwMTczfDA&ixlib=rb-4.1.0&q=85",
  usa: "https://images.unsplash.com/photo-1577185705906-b0063887174e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxuZXclMjB5b3JrJTIwY2l0eSUyMHN0YXR1ZSUyMG9mJTIwbGliZXJ0eSUyMHVzYXxlbnwwfHx8fDE3NzM0NzAxNzV8MA&ixlib=rb-4.1.0&q=85",
  germany: "https://images.unsplash.com/photo-1659413084271-ca1345764e15?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwyfHxiZXJsaW4lMjBicmFuZGVuYnVyZyUyMGdhdGUlMjBnZXJtYW55fGVufDB8fHx8MTc3MzQ3MDE3Nnww&ixlib=rb-4.1.0&q=85",
  spain: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800",
  france: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",
  italy: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
  uae: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
  office: "/assets/office.jpg",
};

const WHATSAPP_NUMBER = "918264812231";

const countries = [
  "Canada", "Germany", "UK", "Rest of Europe", "Others"
];

const services = [
  {
    icon: GraduationCap,
    title: "Course Selection",
    description: "Expert guidance to choose the right course that matches your career goals.",
  },
  {
    icon: Building2,
    title: "University Shortlisting",
    description: "Personalized university recommendations based on your profile and preferences.",
  },
  {
    icon: FileText,
    title: "Documentation",
    description: "Complete assistance with all your application documents and paperwork.",
  },
  {
    icon: Plane,
    title: "Visa Processing",
    description: "Professional visa application support with high success rate.",
  },
  {
    icon: Users,
    title: "Post-Arrival Services",
    description: "Continued support even after you land - from airport pickup to settling in.",
  },
];

const testimonials = [];

// Dynamic reviews will be loaded from API

const branches = [
  { 
    city: "Ludhiana", 
    address: "LGF, SCO-17, Model Town Extension Market, Near Krishna Mandir Rd, Ludhiana, Punjab 141002",
    phone: "098881 94266"
  },
  { 
    city: "Amritsar", 
    address: "LGF, SCO-21, Block-B, District Shopping Complex, Ranjit Avenue, Amritsar, Punjab 143001",
    phone: "082848 37654"
  },
  { 
    city: "Pathankot", 
    address: "Dhangu Rd, opp. Hotel Venice Lane, Jodhamal Colony, Pathankot, Punjab 145001",
    phone: "080547 78465"
  },
  { 
    city: "Jammu", 
    address: "83-B/B, adjoining R K Chouhan Jewellers, Gandhi Nagar, Jammu, J&K 180004",
    phone: "098788 66657"
  },
  { 
    city: "Berlin", 
    address: "Belziger strasse 69-71, 10823, Berlin, Germany",
    phone: "+49 1784555932"
  },
];

const MAIN_PHONE = "9875985641";

// All Partner Universities (combined)
const allPartnerUniversities = [
  // Canada
  { name: "Alexander College", logo: "/assets/universities/canada/alexander.png" },
  { name: "Study in Niagara", logo: "/assets/universities/canada/niagara.png" },
  { name: "University Canada West", logo: "/assets/universities/canada/ucw.png" },
  { name: "Acsenda School of Management", logo: "/assets/universities/canada/acsenda.png" },
  { name: "Fleming College Toronto", logo: "/assets/universities/canada/fleming.png" },
  { name: "Trebas Institute", logo: "/assets/universities/canada/trebas.png" },
  { name: "St. Clair College", logo: "/assets/universities/canada/stclair.png" },
  { name: "Capilano University", logo: "/assets/universities/canada/capilano.png" },
  { name: "Seneca Polytechnic", logo: "/assets/universities/canada/seneca.png" },
  { name: "Conestoga College", logo: "/assets/universities/canada/conestoga.png" },
  // UK
  { name: "Birmingham City University", logo: "/assets/universities/uk/birmingham.jpg" },
  { name: "The University of Law", logo: "/assets/universities/uk/law.jpg" },
  { name: "Bath Spa University", logo: "/assets/universities/uk/bathspa.jpg" },
  // Denmark
  { name: "Niels Brock", logo: "/assets/universities/denmark/niels-brock.png" },
  { name: "International Business Academy", logo: "/assets/universities/denmark/iba.png" },
  // Germany
  { name: "Technical University of Munich", logo: "/assets/universities/germany/tum.jpg" },
  { name: "SRH Hochschule Berlin", logo: "/assets/universities/germany/srh.jpg" },
  { name: "University of Europe", logo: "/assets/universities/germany/ue.jpg" },
  { name: "GISMA Business School", logo: "/assets/universities/germany/gisma.jpg" },
  { name: "IUBH Internationale Hochschule", logo: "/assets/universities/germany/iubh.jpg" },
  { name: "Berlin School of Business & Innovation", logo: "/assets/universities/germany/bsbi.jpg" },
  { name: "EU Business School", logo: "/assets/universities/germany/eu-business.jpg" },
  { name: "Arden University", logo: "/assets/universities/germany/arden.jpg" },
  { name: "Global University Systems", logo: "/assets/universities/germany/gus.jpg" },
];

// India Branches
const indiaBranches = [
  { 
    city: "Ludhiana", 
    address: "LGF, SCO-17, Model Town Extension Market, Near Krishna Mandir Rd, Ludhiana, Punjab 141002",
    phone: "098881 94266"
  },
  { 
    city: "Amritsar", 
    address: "LGF, SCO-21, Block-B, District Shopping Complex, Ranjit Avenue, Amritsar, Punjab 143001",
    phone: "082848 37654"
  },
  { 
    city: "Pathankot", 
    address: "Dhangu Rd, opp. Hotel Venice Lane, Jodhamal Colony, Pathankot, Punjab 145001",
    phone: "080547 78465"
  },
  { 
    city: "Jammu", 
    address: "83-B/B, adjoining R K Chouhan Jewellers, Gandhi Nagar, Jammu, J&K 180004",
    phone: "098788 66657"
  },
];

// International Branches
const internationalBranches = [
  { 
    city: "Berlin", 
    address: "Belziger strasse 69-71, 10823, Berlin, Germany",
    phone: "+49 1784555932"
  },
];

const destinations = [
  { name: "Canada", image: IMAGES.canada },
  { name: "Germany", image: IMAGES.germany },
  { name: "USA", image: IMAGES.usa },
  { name: "Spain", image: IMAGES.spain },
  { name: "Ireland", image: "https://images.unsplash.com/photo-1765570486735-b4db24a4452b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwxfHxJcmVsYW5kJTIwRHVibGluJTIwY2l0eSUyMGxhbmRtYXJrfGVufDB8fHx8MTc3NjIyMTA3Mnww&ixlib=rb-4.1.0&q=85" },
  { name: "UK", image: IMAGES.uk },
  { name: "Luxembourg", image: "https://images.unsplash.com/photo-1588336899284-950764f07147?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxMdXhlbWJvdXJnJTIwY2l0eXxlbnwwfHx8fDE3NzYyMjEyNzN8MA&ixlib=rb-4.1.0&q=85" },
  { name: "Australia", image: IMAGES.australia },
  { name: "Finland", image: "https://images.unsplash.com/photo-1702592337244-33242fd6000a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxIZWxzaW5raSUyMEZpbmxhbmR8ZW58MHx8fHwxNzc2MjIxMjkxfDA&ixlib=rb-4.1.0&q=85" },
  { name: "Denmark", image: "https://images.unsplash.com/photo-1716991346937-aea4b58e4a4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwxfHxDb3BlbmhhZ2VuJTIwTnloYXZuJTIwRGVubWFyayUyMGNvbG9yZnVsfGVufDB8fHx8MTc3NjIyMTMyM3ww&ixlib=rb-4.1.0&q=85" },
];

// Thank You Modal Component
const ThankYouModal = ({ isOpen, onClose, studentName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          data-testid="thankyou-close"
        >
          <X size={24} />
        </button>
        
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-[#0F172A]">Thank You{studentName ? `, ${studentName}` : ''}!</h3>
          <p className="text-[#64748B] mt-2">Your enquiry has been submitted successfully. Our team will contact you shortly.</p>
        </div>
        
        {/* Call Now Section */}
        <div className="bg-[#2563EB]/5 rounded-xl p-4 mb-6">
          <p className="text-center text-[#0F172A] font-medium mb-3">Want to talk now? Call us directly!</p>
          <a
            href={`tel:${MAIN_PHONE}`}
            onClick={() => trackEvent('call_click', { location: 'thank_you_modal', phone: MAIN_PHONE })}
            className="flex items-center justify-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1D4ED8] transition-colors mx-auto w-fit"
          >
            <PhoneCall size={20} />
            Call Now: +91 {MAIN_PHONE}
          </a>
        </div>
        
        {/* Branch Addresses */}
        <div>
          <h4 className="text-lg font-semibold text-[#0F172A] mb-4 text-center">Visit Our Offices</h4>
          <div className="space-y-4">
            {branches.map((branch, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#2563EB]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-[#2563EB]" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-[#0F172A]">{branch.city}</h5>
                    <p className="text-sm text-[#64748B] mt-1">{branch.address}</p>
                    <a 
                      href={`tel:${branch.phone.replace(/\s/g, '')}`}
                      onClick={() => trackEvent('call_click', { location: 'thank_you_modal_branch', branch: branch.city, phone: branch.phone })}
                      className="inline-flex items-center gap-1 text-[#2563EB] text-sm font-medium mt-2 hover:underline"
                    >
                      <Phone size={14} />
                      {branch.phone}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* WhatsApp Option */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#64748B] mb-3">Or chat with us on WhatsApp</p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I just submitted an enquiry on your website. Please help me with study abroad guidance.")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('whatsapp_click', { location: 'thank_you_modal' })}
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full font-medium hover:bg-[#20BD5A] transition-colors"
          >
            <MessageCircle size={20} />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

// WhatsApp Button Component
const WhatsAppButton = () => {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'm interested in studying abroad. Please help me with the process.")}`;
  
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('whatsapp_click', { location: 'floating_button' })}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform group"
      data-testid="whatsapp-button"
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span className="absolute right-full mr-3 bg-white text-slate-700 text-sm font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Chat with us
      </span>
    </a>
  );
};

// Scroll CTA Bar Component
const ScrollCTABar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isDismissed) return;
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#0F172A] py-3 px-4 shadow-lg animate-fade-in-up">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
        <span className="font-bold text-sm md:text-base">Don't Miss This Chance! Start Your Study Abroad Journey Today</span>
        <div className="flex items-center gap-3">
          <a
            href="#enquiry-form"
            onClick={() => trackEvent('cta_click', { location: 'scroll_bar', action: 'apply_now' })}
            className="bg-[#2563EB] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
          >
            Apply Now
            <ArrowRight size={16} />
          </a>
          <a
            href={`tel:${MAIN_PHONE}`}
            onClick={() => trackEvent('call_click', { location: 'scroll_bar', phone: MAIN_PHONE })}
            className="bg-white text-[#0F172A] px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Phone size={16} />
            Call Now
          </a>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-4 text-[#0F172A]/60 hover:text-[#0F172A]"
          data-testid="scroll-cta-close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

// Privacy Policy Modal
const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 md:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          data-testid="privacy-close"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Privacy Policy & Disclaimer</h2>
        
        <div className="space-y-4 text-[#64748B]">
          <section>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">About VisaXpert</h3>
            <p>
              VisaXpert is a private organization dedicated to guiding and helping students apply for study visas to various countries. We are an independent consulting firm and are not affiliated with any government body or embassy.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Important Disclaimer</h3>
            <p>
              <strong>We do not guarantee visa approvals.</strong> Visa decisions are made solely by the respective embassy or consulate of the destination country. Our role is to provide expert guidance, proper documentation assistance, and professional support to improve your application quality.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Our Services</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Course and university selection guidance</li>
              <li>Documentation preparation and review</li>
              <li>Visa application assistance</li>
              <li>Interview preparation</li>
              <li>Post-arrival support services</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Data Privacy</h3>
            <p>
              Your personal information submitted through our forms is used solely for consultation purposes. We do not share your data with third parties without your consent. All information is stored securely and handled with confidentiality.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Contact</h3>
            <p>
              For any queries regarding our privacy practices or services, please contact us or visit any of our branch offices in Jammu, Amritsar, or Ludhiana.
            </p>
          </section>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 btn-primary"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

// Partner Universities Section with Auto-Scrolling Marquee
const PartnerUniversitiesSection = ({ extraLogos = [] }) => {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (index) => {
    setImageErrors(prev => ({
      ...prev,
      [index]: true
    }));
  };

  // Merge hardcoded universities with admin-uploaded partner logos
  const normalizedExtras = extraLogos.map((l) => ({
    name: l.name,
    logo: (l.logo_url || "").replace(/^\/assets\/uploads\//, "/api/uploads/"),
  }));
  const combinedUnis = [...allPartnerUniversities, ...normalizedExtras];

  return (
    <section className="py-16 md:py-24 bg-[#F8FAFC]" data-testid="partner-universities-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="section-title text-3xl sm:text-4xl lg:text-5xl mb-4">
            Our Partner Universities
          </h2>
          <p className="section-subtitle mx-auto">
            We have tie-ups with top universities across the globe
          </p>
        </div>
        
        {/* Auto-Scrolling Marquee */}
        <div className="relative overflow-hidden">
          <div className="flex gap-12 md:gap-16 animate-scroll items-center">
            {[...combinedUnis, ...combinedUnis].map((uni, index) => {
              const hasError = imageErrors[index % combinedUnis.length];
              return (
                <div
                  key={index}
                  className="flex-shrink-0 w-[120px] md:w-[150px] h-[70px] md:h-[90px] flex items-center justify-center"
                  data-testid={`partner-uni-${index}`}
                  title={uni.name}
                >
                  {hasError ? (
                    <span className="text-2xl md:text-3xl font-bold text-[#2563EB]">{uni.name.charAt(0)}</span>
                  ) : (
                    <img 
                      src={uni.logo} 
                      alt={uni.name}
                      className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                      onError={() => handleImageError(index % combinedUnis.length)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center mt-10">
          <p className="text-[#64748B]">And many more universities across 20+ countries</p>
        </div>
      </div>
    </section>
  );
};

export default function LandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    counselling_mode: "",
    preferred_branch: "",
    country_of_interest: "",
    other_country: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [reviews, setReviews] = useState([]);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [partnerLogos, setPartnerLogos] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API}/reviews?page=main`);
        if (response.data.reviews && response.data.reviews.length > 0) {
          setReviews(response.data.reviews);
        }
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      }
    };
    const fetchLogo = async () => {
      try {
        const res = await axios.get(`${API}/page-logos`);
        if (res.data?.main) setLogoUrl(res.data.main);
      } catch (e) {
        console.error("Failed to fetch logo:", e);
      }
    };
    const fetchPartnerLogos = async () => {
      try {
        const res = await axios.get(`${API}/partner-logos?page=main`);
        setPartnerLogos(res.data?.logos || []);
      } catch (e) {
        console.error("Failed to fetch partner logos:", e);
      }
    };
    fetchReviews();
    fetchLogo();
    fetchPartnerLogos();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = "Please enter your full name";
    }
    
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.phone || !/^(\d{10}|\d{12})$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10 or 12 digit phone number";
    }
    
    if (!formData.counselling_mode) {
      newErrors.counselling_mode = "Please choose your preferred counselling mode";
    }

    if (formData.counselling_mode === "offline" && !formData.preferred_branch) {
      newErrors.preferred_branch = "Please choose your nearest branch";
    }

    if (!formData.country_of_interest) {
      newErrors.country_of_interest = "Please select a country";
    }
    
    if (formData.country_of_interest === "Other" && !formData.other_country.trim()) {
      newErrors.other_country = "Please enter the country name";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        counselling_mode: formData.counselling_mode,
        preferred_branch: formData.counselling_mode === "offline" ? formData.preferred_branch : "",
        country_of_interest: formData.country_of_interest === "Other"
          ? formData.other_country
          : formData.country_of_interest
      };
      await axios.post(`${API}/enquiry`, submitData);
      
      // Track form submission in GTM
      trackEvent('form_submit', { 
        location: 'main_form', 
        country: submitData.country_of_interest,
        counselling_mode: submitData.counselling_mode,
        preferred_branch: submitData.preferred_branch
      });
      
      // Track Google Ads Conversion
      trackGoogleAdsConversion();
      
      setSubmittedName(formData.name.split(' ')[0]);
      setShowThankYou(true);
      setFormData({ name: "", email: "", phone: "", counselling_mode: "", preferred_branch: "", country_of_interest: "", other_country: "" });
      setErrors({});
    } catch (error) {
      let errorMessage = "Something went wrong. Please try again.";
      const detail = error.response?.data?.detail;
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        // FastAPI/Pydantic validation errors are an array of objects
        errorMessage = detail
          .map((d) => (typeof d === "string" ? d : d?.msg || "Invalid field"))
          .join(", ");
      } else if (detail && typeof detail === "object") {
        errorMessage = detail.msg || JSON.stringify(detail);
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 12);
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Thank You Modal */}
      <ThankYouModal 
        isOpen={showThankYou} 
        onClose={() => setShowThankYou(false)}
        studentName={submittedName}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* WhatsApp Button */}
      <WhatsAppButton />

      {/* Scroll CTA Bar */}
      <ScrollCTABar />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16 md:h-20">
            <a href="/" data-testid="logo-link">
              <img src={logoUrl} alt="VisaXpert" className="h-14 md:h-16 object-contain" onError={(e) => { e.target.src = DEFAULT_LOGO; }} />
            </a>
            <a
              href={`tel:${MAIN_PHONE}`}
              onClick={() => trackEvent('call_click', { location: 'header', phone: MAIN_PHONE })}
              className="flex items-center gap-2 text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors"
              data-testid="header-phone"
            >
              <Phone size={18} strokeWidth={2} />
              <span className="hidden sm:inline">{MAIN_PHONE}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="order-2 lg:order-1 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-[#FACC15]/20 text-[#0F172A] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Award size={16} className="text-[#EAB308]" />
                Trusted Since 2012
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] leading-tight mb-8">
                Your Journey to
                <span className="text-[#2563EB]"> Study Abroad</span>
                <br />Starts Here
              </h1>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 mb-10" data-testid="trust-badges">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-[#2563EB]/10 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#0F172A]">4000+</p>
                    <p className="text-xs text-[#64748B]">Success Stories</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-[#FACC15]/20 rounded-full flex items-center justify-center">
                    <Clock size={20} className="text-[#EAB308]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#0F172A]">14+</p>
                    <p className="text-xs text-[#64748B]">Years of Experience</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-[#22C55E]/10 rounded-full flex items-center justify-center">
                    <Award size={20} className="text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#0F172A]">ICEF</p>
                    <p className="text-xs text-[#64748B]">Certified Agency</p>
                  </div>
                </div>
              </div>
              
              <a
                href="#enquiry-form"
                className="inline-flex items-center gap-2 btn-primary"
                data-testid="cta-button"
              >
                Start Your Journey
                <ArrowRight size={20} />
              </a>
            </div>

            {/* Right - Form */}
            <div className="order-1 lg:order-2 animate-fade-in-up animation-delay-200" id="enquiry-form">
              <div className="form-card p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Unlock Your Complimentary Profile Assessment</h2>
                <p className="text-[#64748B] mb-6">Fill in your details and our experts will reach out to you</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className={`input-field ${errors.name ? "border-red-500" : ""}`}
                      data-testid="input-name"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className={`input-field ${errors.email ? "border-red-500" : ""}`}
                      data-testid="input-email"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 text-sm">
                        +91
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                        className={`input-field rounded-l-none ${errors.phone ? "border-red-500" : ""}`}
                        data-testid="input-phone"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Preferred Counselling Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="counselling_mode"
                      value={formData.counselling_mode}
                      onChange={handleInputChange}
                      className={`select-field ${errors.counselling_mode ? "border-red-500" : ""}`}
                      data-testid="select-counselling-mode"
                    >
                      <option value="">Choose your counselling mode</option>
                      <option value="online">Online (Google / Zoom)</option>
                      <option value="offline">Offline Branch Visit</option>
                    </select>
                    {errors.counselling_mode && (
                      <p className="text-red-500 text-sm mt-1">{errors.counselling_mode}</p>
                    )}
                  </div>

                  {formData.counselling_mode === "offline" && (
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Choose Your Nearest Branch <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="preferred_branch"
                        value={formData.preferred_branch}
                        onChange={handleInputChange}
                        className={`select-field ${errors.preferred_branch ? "border-red-500" : ""}`}
                        data-testid="select-preferred-branch"
                      >
                        <option value="">Select a branch</option>
                        <option value="Ludhiana">Ludhiana</option>
                        <option value="Amritsar">Amritsar</option>
                        <option value="Pathankot">Pathankot</option>
                        <option value="Jammu">Jammu</option>
                      </select>
                      {errors.preferred_branch && (
                        <p className="text-red-500 text-sm mt-1">{errors.preferred_branch}</p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Country of Interest <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="country_of_interest"
                      value={formData.country_of_interest}
                      onChange={handleInputChange}
                      className={`select-field ${errors.country_of_interest ? "border-red-500" : ""}`}
                      data-testid="select-country"
                    >
                      <option value="">Select a country</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {errors.country_of_interest && (
                      <p className="text-red-500 text-sm mt-1">{errors.country_of_interest}</p>
                    )}
                  </div>
                  
                  {formData.country_of_interest === "Other" && (
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Please specify country
                      </label>
                      <input
                        type="text"
                        name="other_country"
                        value={formData.other_country}
                        onChange={handleInputChange}
                        placeholder="Enter country name"
                        className={`input-field ${errors.other_country ? "border-red-500" : ""}`}
                        data-testid="input-other-country"
                      />
                      {errors.other_country && (
                        <p className="text-red-500 text-sm mt-1">{errors.other_country}</p>
                      )}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full btn-primary flex items-center justify-center gap-2 ${isSubmitting ? "opacity-70" : ""}`}
                    data-testid="submit-button"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Get Expert Guidance
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
                
                <p className="text-xs text-[#94A3B8] mt-4 text-center">
                  By submitting, you agree to receive communications from VisaXpert
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24 bg-white" id="services">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="section-title text-3xl sm:text-4xl lg:text-5xl mb-4">
              How We Help You Succeed
            </h2>
            <p className="section-subtitle mx-auto">
              Comprehensive support at every stage of your study abroad journey
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="feature-card group"
                data-testid={`service-card-${index}`}
              >
                <div className="w-14 h-14 bg-[#2563EB]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#2563EB] transition-colors">
                  <service.icon
                    size={28}
                    className="text-[#2563EB] group-hover:text-white transition-colors"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-3">
                  {service.title}
                </h3>
                <p className="text-[#64748B]">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#2563EB]"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 relative z-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            <div data-testid="stat-success-stories">
              <p className="text-5xl md:text-6xl font-extrabold mb-2">4000+</p>
              <p className="text-lg text-white/80">Success Stories</p>
            </div>
            <div data-testid="stat-years">
              <p className="text-5xl md:text-6xl font-extrabold mb-2">14+</p>
              <p className="text-lg text-white/80">Years of Experience</p>
            </div>
            <div data-testid="stat-countries">
              <p className="text-5xl md:text-6xl font-extrabold mb-2">ICEF</p>
              <p className="text-lg text-white/80">Certified Agency</p>
            </div>
            <div data-testid="stat-branches">
              <p className="text-5xl md:text-6xl font-extrabold mb-2">5</p>
              <p className="text-lg text-white/80">Branch Locations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="section-title text-3xl sm:text-4xl lg:text-5xl mb-4">
              Popular Study Destinations
            </h2>
            <p className="section-subtitle mx-auto">
              Explore opportunities in top countries for international education
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {destinations.map((dest, index) => (
              <div
                key={index}
                className="destination-card"
                data-testid={`destination-${dest.name.toLowerCase()}`}
              >
                <img src={dest.image} alt={dest.name} loading="lazy" />
                <span className="country-name">{dest.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Universities Section - Tabbed with Slider */}
      <PartnerUniversitiesSection extraLogos={partnerLogos} />

      {/* Founder Video Section */}
      <section className="py-16 md:py-24 bg-white" data-testid="founder-video-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="section-title text-3xl sm:text-4xl lg:text-5xl mb-4">
              A Message From Our CEO
            </h2>
            <p className="section-subtitle mx-auto">
              Hear directly from our CEO about our mission and commitment
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
              <video
                controls
                className="absolute inset-0 w-full h-full object-contain"
                data-testid="ceo-video"
                preload="metadata"
              >
                <source src="/assets/videos/mainpage.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 bg-[#F8FAFC] px-6 py-4 rounded-xl">
                <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#0F172A]">Mr. Sunil Arora</p>
                  <p className="text-sm text-[#64748B]">CEO, VisaXpert</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title text-3xl sm:text-4xl lg:text-5xl mb-6">
                Why Students Trust VisaXpert
              </h2>
              <p className="text-[#64748B] text-lg mb-8">
                With over 14 years of experience and 4000+ success stories, we've built a reputation for reliability and excellence in study abroad consulting.
              </p>
              
              <div className="space-y-4">
                {[
                  "Personalized counseling for every student",
                  "High visa approval success rate",
                  "End-to-end support from application to arrival",
                  "Dedicated post-arrival assistance",
                  "Transparent process with no hidden charges",
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#22C55E] flex-shrink-0" size={24} />
                    <span className="text-[#0F172A]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <img
                src={IMAGES.office}
                alt="VisaXpert Consultation"
                className="rounded-2xl shadow-2xl w-full object-cover"
                loading="lazy"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-xl hidden md:block">
                <div className="flex items-center gap-3">
                  <Shield className="text-[#2563EB]" size={40} />
                  <div>
                    <p className="font-bold text-[#0F172A]">Verified & Trusted</p>
                    <p className="text-sm text-[#64748B]">Professional Consultants</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="section-title text-3xl sm:text-4xl lg:text-5xl mb-4">
              What Our Students Say
            </h2>
            <p className="section-subtitle mx-auto">
              Real stories from students who achieved their dreams with us
            </p>
          </div>
          
          <div className="relative overflow-hidden" data-testid="main-reviews-slider">
            <div className="flex gap-6 md:gap-8 animate-reviews-scroll w-max">
              {[...reviews, ...reviews].map((review, index) => (
                <div
                  key={`${review.review_id || "r"}-${index}`}
                  className="testimonial-card flex-shrink-0 w-[320px] md:w-[380px]"
                  data-testid={`testimonial-${index}`}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <Star key={i} size={20} className="fill-[#FACC15] text-[#FACC15]" />
                    ))}
                  </div>
                  <p className="text-[#64748B] mb-6">"{review.content}"</p>
                  <div className="flex items-center gap-3">
                    {review.image_url ? (
                      <img src={review.image_url.replace(/^\/assets\/uploads\//, "/api/uploads/")} alt={review.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-[#2563EB]/10 rounded-full flex items-center justify-center">
                        <span className="text-[#2563EB] font-bold text-lg">
                          {review.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#0F172A]">{review.name}</p>
                      <p className="text-sm text-[#64748B]">Studies in {review.country}</p>
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

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Take the first step towards your international education. Our experts are here to guide you.
          </p>
          <a
            href="#enquiry-form"
            className="inline-flex items-center gap-2 btn-secondary"
            data-testid="footer-cta"
          >
            Get Free Consultation
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* About */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">About VisaXpert</h4>
              <p className="text-slate-400 mb-4 text-sm">
                VisaXpert is a private organization dedicated to guiding and helping students apply for study visas. We provide expert counseling and documentation support since 2012.
              </p>
              <p className="text-slate-500 text-xs">
                <strong>Disclaimer:</strong> We do not guarantee visa approvals. Visa decisions are made solely by embassies/consulates. We provide guidance to improve your application quality.
              </p>
            </div>
            
            {/* Branches in India */}
            <div data-testid="footer-india-branches">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-[#FACC15]" />
                Branches in India
              </h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                {indiaBranches.map((branch, index) => (
                  <li key={index}>
                    <span className="font-medium text-white">{branch.city}</span>
                    <p className="text-xs mt-1">{branch.address}</p>
                    <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="text-[#2563EB] text-xs hover:underline">{branch.phone}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* International Presence */}
            <div data-testid="footer-international-branches">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe size={18} className="text-[#22C55E]" />
                International Presence
              </h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                {internationalBranches.map((branch, index) => (
                  <li key={index}>
                    <span className="font-medium text-white">{branch.city}</span>
                    <p className="text-xs mt-1">{branch.address}</p>
                    <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="text-[#2563EB] text-xs hover:underline">{branch.phone}</a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400">
                  <span className="text-[#22C55E] font-medium">Now in Berlin!</span> Supporting students with university transfers and accommodation.
                </p>
              </div>
            </div>
            
            {/* Contact Us */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Contact Us</h4>
              <a
                href={`tel:${MAIN_PHONE}`}
                onClick={() => trackEvent('call_click', { location: 'footer', phone: MAIN_PHONE })}
                className="flex items-center gap-2 text-white font-semibold mb-4 text-lg"
              >
                <Phone size={20} className="text-[#2563EB]" />
                +91 {MAIN_PHONE}
              </a>
              <p className="text-slate-400 text-sm mb-4">Main Helpline</p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('whatsapp_click', { location: 'footer' })}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <MessageCircle size={20} className="text-[#25D366]" />
                Chat on WhatsApp
              </a>
              <p className="text-sm text-slate-500 mt-4">
                Available Mon-Sat, 10 AM - 7 PM
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} VisaXpert. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowPrivacy(true)}
                  className="text-slate-500 text-sm hover:text-white transition-colors"
                  data-testid="privacy-link"
                >
                  Privacy Policy
                </button>
                <span className="text-slate-700">|</span>
                <span className="text-slate-500 text-sm">The Study Abroad Specialist</span>
              </div>
            </div>
            <div className="text-center mt-6 pt-6 border-t border-slate-800">
              <p className="text-slate-500 text-sm">
                Designed & Developed by{' '}
                <a 
                  href="https://www.wizbang.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#2563EB] hover:text-[#60A5FA] font-medium transition-colors"
                >
                  Wizbang
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
