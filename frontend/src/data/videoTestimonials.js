// Hard-coded video testimonials.
//
// Each entry pairs a student with a country-themed colour story (flag tones)
// plus a passport-stamp-style motif. The actual video URL points at a real
// .mp4 — swap these with the real student testimonials when they're ready.

export const VIDEO_TESTIMONIALS = [
  {
    name: "Aman Singh",
    country: "Germany",
    flag: "🇩🇪",
    course: "M.Sc. Computer Science",
    school: "TU Munich",
    quote: "The Berlin office made my university transfer feel effortless.",
    // Subtle country palette: black -> red -> gold (Germany flag inspired)
    gradient: "from-slate-900 via-rose-700 to-amber-500",
    cardTint:  "bg-[#0f0d10]",
    accent:    "text-amber-300",
    decor:     "✈️",
    video: "/assets/videos/berlin.mp4",
  },
  {
    name: "Riya Kapoor",
    country: "Canada",
    flag: "🇨🇦",
    course: "PG Diploma · Business Analytics",
    school: "Conestoga College",
    quote: "SDS visa in 18 days. The documentation team is genuinely next-level.",
    // Canada: red + white + maple
    gradient: "from-rose-700 via-red-600 to-rose-400",
    cardTint:  "bg-[#1a0a0e]",
    accent:    "text-rose-200",
    decor:     "🍁",
    video: "/assets/videos/mainpage.mp4",
  },
  {
    name: "Karan Mehra",
    country: "Ireland",
    flag: "🇮🇪",
    course: "M.Sc. Data Analytics",
    school: "Trinity College Dublin",
    quote: "Honest counselling — they actually told me what wasn't right for me.",
    // Ireland: green to amber
    gradient: "from-emerald-800 via-emerald-600 to-amber-400",
    cardTint:  "bg-[#08130d]",
    accent:    "text-emerald-200",
    decor:     "🎓",
    video: "/assets/videos/germanyfair.mp4",
  },
  {
    name: "Simran Kaur",
    country: "Australia",
    flag: "🇦🇺",
    course: "Master of IT",
    school: "University of Melbourne",
    quote: "My GTE statement was the strongest part of my visa file.",
    // Australia: navy + warm gold
    gradient: "from-blue-900 via-indigo-700 to-yellow-400",
    cardTint:  "bg-[#08101d]",
    accent:    "text-amber-200",
    decor:     "🛫",
    video: "/assets/videos/berlin.mp4",
  },
];
