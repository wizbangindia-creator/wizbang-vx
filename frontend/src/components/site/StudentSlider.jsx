import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowRight, Quote } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const imgSrc = (url) => (url?.startsWith("/api/") ? `${process.env.REACT_APP_BACKEND_URL}${url}` : url);

export function useTestimonials() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    axios.get(`${API}/profiles/testimonials`).then((r) => setItems(r.data.items)).catch(() => setItems([]));
  }, []);
  return items;
}

export function StudentCard({ s }) {
  return (
    <div className="w-[290px] shrink-0 rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col" data-testid={`student-card-${s.profile_id}`}>
      <div className="relative h-56 bg-slate-100">
        <img src={imgSrc(s.image_url)} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
        <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-bold text-blue-700">{s.country}</span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="font-display text-2xl text-slate-900">{s.name}</p>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1">"{s.review}"</p>
        <Link to={`/student-stories/${s.profile_id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:gap-2 transition-all" data-testid={`student-view-${s.profile_id}`}>
          View story <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function StudentSlider() {
  const items = useTestimonials();
  if (!items || items.length === 0) return null;
  const loop = items.length > 3 ? [...items, ...items] : items;

  return (
    <section id="stories" className="py-20 lg:py-28 bg-white overflow-hidden" data-testid="student-slider">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider"><Quote size={12} /> Real students</p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-display text-slate-900 leading-[1.05]">
            Real students. Real photos.<br /><span className="italic text-slate-500">Real visas.</span>
          </h2>
        </div>
        <Link to="/student-stories" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 w-fit" data-testid="student-slider-all">
          See all stories <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-12 vx-marquee-wrap">
        <div className={`flex gap-5 px-4 ${items.length > 3 ? "vx-marquee" : "justify-center flex-wrap"}`} style={{ "--vx-dur": `${items.length * 6}s` }}>
          {loop.map((s, i) => <StudentCard key={`${s.profile_id}-${i}`} s={s} />)}
        </div>
      </div>
      <style>{`
        .vx-marquee { width: max-content; animation: vxMarquee var(--vx-dur) linear infinite; }
        .vx-marquee-wrap:hover .vx-marquee { animation-play-state: paused; }
        @keyframes vxMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </section>
  );
}
