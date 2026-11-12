import React from "react";
import { Globe2, ArrowRight } from "lucide-react";
import { useEnquiry } from "./EnquiryModal";

export default function OtherCountryCard({ testId = "country-card-other" }) {
  const { openEnquiry } = useEnquiry();
  return (
    <button
      type="button"
      onClick={() => openEnquiry({ country: "Other", origin: "other_country_card" })}
      className="text-left p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white hover:-translate-y-1 hover:shadow-xl transition-transform duration-300"
      data-testid={testId}
    >
      <Globe2 size={34} className="mb-3 text-orange-300" />
      <h3 className="text-lg font-bold">Others</h3>
      <p className="text-xs uppercase tracking-wider font-bold text-orange-300 mt-1">Any other destination</p>
      <p className="text-sm text-slate-300 mt-3 leading-relaxed">Thinking of a country not listed here? Tell us and our counsellors will guide you.</p>
      <span className="inline-flex items-center gap-1 text-sm font-semibold mt-4">Ask us <ArrowRight size={13} /></span>
    </button>
  );
}
