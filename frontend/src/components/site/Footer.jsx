import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";
import { COUNTRIES } from "../../data/countries";
import { BRANCHES } from "../../data/branches";

const LOGO = "/assets/visaxpert-logo.png";
const PHONE_DISPLAY = "+91 98759 85641";
const PHONE_DIAL = "+919875985641";
const EMAIL = "info@visaxpertinternational.co.in";

const BRANCHES_LIST = BRANCHES;
const COUNTRIES_LIST = COUNTRIES;

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 space-y-5">
            <div className="inline-flex items-center bg-white rounded-xl px-3 py-2 shadow">
              <img src={LOGO} alt="VisaXpert" className="h-10 w-auto" />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              VisaXpert is an ICEF‑certified study abroad consultancy since 2012.
              Over 4,000 students have started their international careers with us across 9 countries.
            </p>
            <div className="space-y-2 text-sm">
              <a href={`tel:${PHONE_DIAL}`} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Phone size={15} className="text-blue-400" /> {PHONE_DISPLAY}
              </a>
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Mail size={15} className="text-blue-400" /> {EMAIL}
              </a>
              <p className="flex items-center gap-2 text-slate-400">
                <MapPin size={15} className="text-blue-400" /> 5 branches · Punjab · Jammu · Berlin
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              {[
                { Icon: Facebook,  href: "https://facebook.com/visaxpert"  },
                { Icon: Instagram, href: "https://instagram.com/visaxpert" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 grid place-items-center rounded-full bg-slate-800 hover:bg-blue-600 transition-colors"
                  aria-label="Social"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">Countries</p>
            <ul className="space-y-2 text-sm">
              {COUNTRIES_LIST.map((c) => (
                <li key={c.slug}>
                  <Link to={`/countries/${c.slug}`} className="text-slate-400 hover:text-white transition-colors">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Branches */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">Branches</p>
            <ul className="space-y-2 text-sm">
              {BRANCHES_LIST.map((b) => (
                <li key={b.slug}>
                  <Link to={`/branches/${b.slug}`} className="text-slate-400 hover:text-white transition-colors">VisaXpert · {b.city}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">Help</p>
            <ul className="space-y-2 text-sm" data-testid="footer-help-links">
              <li><Link to="/faq" className="text-slate-400 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-white transition-colors">Contact us</Link></li>
              <li><Link to="/privacy-policy" className="text-slate-400 hover:text-white transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Terms of service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VisaXpert Visa &amp; Immigration Services. All rights reserved.</p>
          <p>ICEF Certified · 14+ years</p>
        </div>
      </div>
    </footer>
  );
}
