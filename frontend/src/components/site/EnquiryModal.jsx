import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";
import { COUNTRIES } from "../../data/countries";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const OTHER = "Other";
const COUNTRY_OPTIONS = [...COUNTRIES.map((c) => c.name), OTHER];

const EnquiryContext = createContext({ openEnquiry: () => {} });
export const useEnquiry = () => useContext(EnquiryContext);

export function EnquiryProvider({ children }) {
  const [state, setState] = useState(null);
  const openEnquiry = useCallback((opts = {}) => setState({ country: opts.country || "Germany", origin: opts.origin || "popup" }), []);
  return (
    <EnquiryContext.Provider value={{ openEnquiry }}>
      {children}
      {state && <EnquiryModal initial={state} onClose={() => setState(null)} />}
    </EnquiryContext.Provider>
  );
}

function EnquiryModal({ initial, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", country: initial.country, otherCountry: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isOther = form.country === OTHER;

  const submit = async (e) => {
    e.preventDefault();
    const country = isOther ? form.otherCountry.trim() : form.country;
    if (!form.name.trim() || !form.phone.trim() || !country) {
      toast.error("Please fill in your name, number and country");
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/webhook/lead`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        country,
        source: "website",
        platform: "visaxpert.in",
        campaign: `popup_${initial.origin}`,
        extra_data: { interested_country: country, channel: `popup_${initial.origin}`, other_country: isOther },
      });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong, please call us instead.");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" data-testid="enquiry-modal">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 vx-modal-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close" data-testid="enquiry-modal-close">
          <X size={18} />
        </button>
        {done ? (
          <div className="py-8 text-center" data-testid="enquiry-modal-success">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={26} className="text-emerald-600" /></div>
            <p className="mt-4 text-xl font-semibold text-slate-900">Thank you, {form.name.split(" ")[0]}!</p>
            <p className="text-sm text-slate-500 mt-1">A VisaXpert counsellor will call you shortly for your free 30-minute consultation.</p>
            <button onClick={onClose} className="mt-6 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold" data-testid="enquiry-modal-done">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-orange-600">Free 30-minute consultation</p>
              <h3 className="mt-2 text-2xl font-display text-slate-900">Book your call</h3>
              <p className="text-sm text-slate-500 mt-1">Share three quick details — we'll call you back.</p>
            </div>
            <ModalField label="Full name">
              <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Aman Singh" className="vx-modal-input" data-testid="enquiry-name" />
            </ModalField>
            <ModalField label="Phone number">
              <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91" className="vx-modal-input" data-testid="enquiry-phone" />
            </ModalField>
            <ModalField label="Country you're interested in">
              <select value={form.country} onChange={(e) => update("country", e.target.value)} className="vx-modal-input" data-testid="enquiry-country">
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </ModalField>
            {isOther && (
              <ModalField label="Which country?">
                <input value={form.otherCountry} onChange={(e) => update("otherCountry", e.target.value)} placeholder="Type the country name" className="vx-modal-input" data-testid="enquiry-other-country" autoFocus />
              </ModalField>
            )}
            <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 transition-transform disabled:opacity-60" data-testid="enquiry-submit">
              {sending ? "Sending…" : <>Book my free call <ArrowRight size={16} /></>}
            </button>
          </form>
        )}
      </div>
      <style>{`
        .vx-modal-input { width:100%; padding:.7rem .9rem; border-radius:12px; border:1.5px solid #E2E8F0; background:#FAFAFA; font-size:.9rem; outline:none; transition:border-color .15s, box-shadow .15s; }
        .vx-modal-input:focus { border-color:#1D4ED8; background:#fff; box-shadow:0 0 0 4px rgba(29,78,216,.10); }
        .vx-modal-in { animation: vxModalIn .35s cubic-bezier(.16,1,.3,1) both; }
        @keyframes vxModalIn { from { opacity:0; transform: translateY(16px) scale(.98);} to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
