import React from "react";

/**
 * Single source for typography + decoration helpers shared by all marketing
 * pages. Drop this once near the top of any page (under <PageShell>) to enable
 * the .font-display, .vx-gradient-text and .vx-grid-bg utilities.
 */
export default function VxStyleTag() {
  return (
    <style>{`
      :root {
        --vx-blue:   #0066B1;
        --vx-blue-2: #1E40AF;
        --vx-accent: #FF6B35;
      }
      html { scroll-behavior: smooth; }
      .font-display { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: -0.01em; }
      .font-body    { font-family: 'Manrope', system-ui, sans-serif; }
      /* Refined brand gradient — blue → teal → coral. Smooth, study-abroad
         friendly (avoids the muddy navy → orange transition that read poorly). */
      .vx-gradient-text {
        background: linear-gradient(95deg, #1E3A8A 0%, #0066B1 35%, #0EA5E9 65%, #F97316 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .vx-grid-bg {
        background-image:
          linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(ellipse 60% 60% at 50% 30%, #000 35%, transparent 80%);
      }
      /* Passport-stamp style concentric arcs for the hero background */
      .vx-passport-decor {
        background-image:
          radial-gradient(circle 320px at 80% 18%, rgba(255,107,53,0.10), transparent 60%),
          radial-gradient(circle 360px at 18% 70%, rgba(0,102,177,0.10), transparent 60%);
      }
      .vx-fade-up { animation: vxFadeUp .9s cubic-bezier(.16,1,.3,1) both; }
      @keyframes vxFadeUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: none;} }
    `}</style>
  );
}

/** Standard "eyebrow + headline + intro" section header used everywhere. */
export function SectionHeader({ eyebrow, title, intro, centered = false }) {
  return (
    <div className={`${centered ? "text-center mx-auto" : ""} max-w-3xl`}>
      {eyebrow && (
        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-4 text-4xl lg:text-5xl font-display text-slate-900 leading-[1.05]">{title}</h2>
      {intro && <p className="mt-5 text-slate-600 text-lg max-w-2xl leading-relaxed mx-auto">{intro}</p>}
    </div>
  );
}
