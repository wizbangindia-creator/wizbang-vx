import React, { useState } from "react";
import axios from "axios";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COUNTRY_OPTIONS = [
  "Germany", "Canada", "Australia", "Ireland", "Netherlands", "Sweden",
  "Dubai (UAE)", "Finland", "Denmark", "Not decided",
];

/**
 * Reusable lead form used across country / branch / contact pages.
 * `defaultCountry` pre-selects a country when used inside a country page.
 * `source` and `campaign` get sent as lead metadata so the dashboard can
 * tell where each lead originated.
 */
export default function LeadForm({
  defaultCountry = "Germany",
  source = "website",
  campaign = "website_form",
  compact = false,
  title = "Talk to a real counsellor today.",
  sub = "Drop your details — we'll call you within a working day.",
  cta = "Get my free consultation",
  testId = "lead-form",
  hideEyebrow = false,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    country: defaultCountry,
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please share at least your name and phone number");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/webhook/lead`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        source,
        platform: "visaxpert.in",
        campaign,
        country: form.country,
        extra_data: { interested_country: form.country, form_origin: campaign },
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
    <div className="relative" data-testid={testId}>
      <div className="absolute -inset-2 bg-gradient-to-br from-blue-100 via-white to-orange-100 rounded-[28px] blur-xl opacity-70 pointer-events-none" />
      <form
        onSubmit={submit}
        className={`relative bg-white border border-slate-100 rounded-3xl shadow-[0_30px_80px_-30px_rgba(15,23,42,.25)] ${compact ? "p-6" : "p-7 lg:p-8"} space-y-4`}
      >
        {!hideEyebrow && (
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
              <Sparkles size={11} /> Free consultation
            </p>
            <h3 className="mt-3 text-2xl font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{sub}</p>
          </div>
        )}

        {done ? (
          <div className="py-10 text-center" data-testid={`${testId}-success`}>
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
                className="lf-input"
                data-testid={`${testId}-name`}
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
                  className="lf-input"
                  data-testid={`${testId}-phone`}
                  required
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@email.com"
                  className="lf-input"
                  data-testid={`${testId}-email`}
                />
              </Field>
            </div>
            <Field label="Country you're interested in">
              <select
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className="lf-input"
                data-testid={`${testId}-country`}
              >
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-60"
              data-testid={`${testId}-submit`}
            >
              {submitting ? "Sending…" : (<>{cta} <ArrowRight size={16} /></>)}
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              By submitting, you agree to receive a callback. No spam, ever.
            </p>
          </>
        )}
      </form>
      <style>{`
        .lf-input {
          width: 100%; padding: 0.7rem 0.9rem; border-radius: 12px;
          border: 1.5px solid #E2E8F0; background: #FAFAFA;
          font-size: 0.9rem; outline: none;
          transition: border-color .15s, background-color .15s, box-shadow .15s;
        }
        .lf-input:focus {
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
