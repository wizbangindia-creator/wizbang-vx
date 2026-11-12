import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Quote, ArrowLeft } from "lucide-react";

import PageShell from "../components/site/PageShell";
import Seo from "../components/site/Seo";
import VxStyleTag from "../components/site/VxStyle";
import { useTestimonials, StudentCard, imgSrc } from "../components/site/StudentSlider";

export default function StudentStoriesPage() {
  const { id } = useParams();
  const items = useTestimonials();
  const active = id && items ? items.find((s) => s.profile_id === id) : null;
  const others = (items || []).filter((s) => s.profile_id !== id);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  return (
    <PageShell>
      <Seo title={active ? `${active.name} · ${active.country} · VisaXpert Student Story` : "Student Stories · VisaXpert"} description="Real VisaXpert students share their study-abroad journeys." path={id ? `/student-stories/${id}` : "/student-stories"} />
      <VxStyleTag />
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 vx-grid-bg pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20">
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5">
            <Link to="/" className="hover:text-blue-700">Home</Link><ChevronRight size={12} />
            <Link to="/student-stories" className="hover:text-blue-700">Student stories</Link>
            {active && <><ChevronRight size={12} /><span className="text-slate-700 font-medium">{active.name}</span></>}
          </nav>

          {active ? (
            <div className="grid lg:grid-cols-12 gap-10 items-center" data-testid="student-story-detail">
              <div className="lg:col-span-5">
                <div className="rounded-[32px] overflow-hidden shadow-2xl aspect-[4/5] bg-slate-100">
                  <img src={imgSrc(active.image_url)} alt={active.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="lg:col-span-7">
                <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider">Now studying in {active.country}</span>
                <h1 className="mt-5 text-5xl lg:text-7xl font-display text-slate-900 leading-[1.02]" data-testid="student-story-name">{active.name}</h1>
                <Quote size={36} className="mt-8 text-blue-200" />
                <p className="mt-3 text-xl lg:text-2xl text-slate-700 leading-relaxed whitespace-pre-line" data-testid="student-story-review">{active.review}</p>
                <Link to="/student-stories" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={15} /> All student stories</Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wider font-semibold text-blue-700">Student testimonials</p>
              <h1 className="mt-4 text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] font-display text-slate-900">
                Their journeys.<br /><span className="italic text-slate-500">In their words.</span>
              </h1>
              {items && id && !active && <p className="mt-4 text-slate-500">That story isn't available — here are all our students.</p>}
            </>
          )}
        </div>
      </section>

      <section className="pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {active && others.length > 0 && <p className="text-xs uppercase tracking-wider font-semibold text-blue-700 mb-6">More student stories</p>}
          {items && items.length === 0 && <p className="text-slate-500" data-testid="student-stories-empty">Student stories are coming soon.</p>}
          <div className="flex flex-wrap gap-5" data-testid="student-stories-grid">
            {(active ? others : items || []).map((s) => <StudentCard key={s.profile_id} s={s} />)}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
