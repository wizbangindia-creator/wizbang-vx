import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { COUNTRIES } from "../../data/countries";
import { useEnquiry } from "./EnquiryModal";

const LOGO = "/assets/visaxpert-logo.png";
const PHONE_DISPLAY = "+91 98759 85641";
const PHONE_DIAL = "+919875985641";

const NAV_LINKS = [
  { label: "Our Branches", to: "/branches" },
  { label: "About",    to: "/about" },
  { label: "Stories",  to: "/student-stories" },
  { label: "FAQ",      to: "/faq" },
  { label: "Contact",  to: "/contact" },
];

export default function Navbar() {
  const { openEnquiry } = useEnquiry();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setCountriesOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-[0_4px_24px_-12px_rgba(15,23,42,0.18)] border-b border-slate-100"
          : "bg-white/70 backdrop-blur"
      }`}
      data-testid="site-navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="navbar-logo">
            <img src={LOGO} alt="VisaXpert" className="h-9 lg:h-10 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-[15px] font-medium text-slate-700">
            <div
              className="relative"
              onMouseEnter={() => setCountriesOpen(true)}
              onMouseLeave={() => setCountriesOpen(false)}
            >
              <Link
                to="/countries"
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                data-testid="navbar-countries"
              >
                Countries <ChevronDown size={14} className={`transition-transform ${countriesOpen ? "rotate-180" : ""}`} />
              </Link>
              {countriesOpen && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-3 w-[460px] grid grid-cols-2 gap-1">
                    {COUNTRIES.map((c) => (
                      <Link
                        key={c.slug}
                        to={`/countries/${c.slug}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                        data-testid={`navbar-country-${c.slug}`}
                      >
                        <span className="text-lg leading-none">{c.flag}</span>
                        <div className="min-w-0">
                          <p className="text-slate-800 font-medium">{c.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{c.tagline}</p>
                        </div>
                      </Link>
                    ))}
                    <Link to="/countries" className="col-span-2 mt-1 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg py-2">
                      View all countries →
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
                    isActive && !l.to.includes("#") ? "text-blue-700 font-semibold" : ""
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${PHONE_DIAL}`}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors font-medium text-sm"
              data-testid="navbar-phone"
            >
              <Phone size={15} /> {PHONE_DISPLAY}
            </a>
            <button
              type="button"
              onClick={() => openEnquiry({ origin: "navbar" })}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-700 to-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all"
              data-testid="navbar-cta"
            >
              Book free call
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              aria-label="Toggle menu"
              data-testid="navbar-mobile-toggle"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md" data-testid="navbar-mobile-drawer">
          <div className="px-4 py-4 space-y-1">
            <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Countries</p>
            <div className="grid grid-cols-2 gap-1">
              {COUNTRIES.map((c) => (
                <Link key={c.slug} to={`/countries/${c.slug}`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-sm">
                  <span>{c.flag}</span> {c.name}
                </Link>
              ))}
            </div>
            <Link to="/countries" className="block text-center text-xs font-semibold text-blue-700 py-2">View all countries →</Link>
            <div className="h-px bg-slate-100 my-2" />
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="block px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700 text-sm">
                {l.label}
              </Link>
            ))}
            <a href={`tel:${PHONE_DIAL}`} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-blue-700 font-medium text-sm">
              <Phone size={15} /> {PHONE_DISPLAY}
            </a>
            <button type="button" onClick={() => { setOpen(false); openEnquiry({ origin: "navbar_mobile" }); }} className="block w-full text-center mt-2 px-4 py-3 rounded-full bg-gradient-to-r from-blue-700 to-blue-600 text-white font-semibold shadow-md" data-testid="navbar-mobile-cta">
              Book free call
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
