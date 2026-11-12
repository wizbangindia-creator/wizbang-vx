// Categorised FAQ content. Edit freely — no backend required.

export const FAQ_CATEGORIES = [
  {
    key: "about",
    title: "About VisaXpert",
    icon: "info",
    items: [
      {
        q: "Who is VisaXpert and how long have you been operating?",
        a: "VisaXpert is an ICEF-certified study-abroad consultancy founded by Mr. Sunil Arora in 2012. Over 14 years we've placed 4000+ students across 9 countries from our offices in Ludhiana, Amritsar, Jammu, Pathankot and Berlin.",
      },
      {
        q: "What makes VisaXpert different from other consultants?",
        a: "Outcome-first counselling, a dedicated Berlin office for on-ground student support, ICEF certification, and a 14-year track-record. We measure ourselves by visa approvals — not the number of applications filed.",
      },
      {
        q: "Is the first consultation really free?",
        a: "Yes. The first 30-minute consultation is free of cost — whether you walk in, call, or video-meet. No obligation to enroll.",
      },
      {
        q: "Do you work with Indian students only?",
        a: "Primarily yes, but our Berlin team also supports international students already studying in Europe with university change and post-arrival services.",
      },
    ],
  },
  {
    key: "germany",
    title: "Germany",
    icon: "flag",
    items: [
      {
        q: "Is IELTS mandatory for Germany?",
        a: "Most English-taught programs require IELTS 6.5 (or equivalent). A few universities accept Medium-of-Instruction letters. German-taught programs need TestDaF or DSH.",
      },
      {
        q: "How much blocked account is needed?",
        a: "€11,208 per year (2024 figure) is the standard requirement. We help you open the account with our preferred banking partners.",
      },
      {
        q: "Can my spouse join me in Germany?",
        a: "Yes — spouse dependent visas are allowed once you're enrolled. VisaXpert handles the full family-reunification process.",
      },
      {
        q: "How long is the post-study work visa in Germany?",
        a: "18 months to find a job related to your degree. After landing a job, you can convert to an EU Blue Card / Aufenthaltserlaubnis.",
      },
      {
        q: "Can I change universities after landing in Germany?",
        a: "Yes — and our Berlin office specialises in exactly this. See our /university-change page for details.",
      },
    ],
  },
  {
    key: "canada",
    title: "Canada",
    icon: "flag",
    items: [
      {
        q: "What's the difference between SDS and Non-SDS?",
        a: "SDS (Student Direct Stream) is the fast 4–6 week visa route requiring an upfront tuition payment + GIC + IELTS 6.0. Non-SDS takes longer but has more flexible requirements.",
      },
      {
        q: "Is the GIC mandatory?",
        a: "For SDS, yes — CAD 20,635. For Non-SDS, you can substitute bank statements showing equivalent funds.",
      },
      {
        q: "How does Canadian PR work after graduation?",
        a: "After a 2-year program you get a Post-Graduation Work Permit. With 1 year of Canadian work experience you become eligible for Express Entry / CEC / PNP — the main PR routes.",
      },
      {
        q: "Can my spouse work in Canada while I study?",
        a: "Yes — your spouse can apply for an Open Work Permit valid for the same duration as your study permit.",
      },
    ],
  },
  {
    key: "australia",
    title: "Australia",
    icon: "flag",
    items: [
      {
        q: "What is the GTE statement?",
        a: "Genuine Temporary Entrant — a personal statement explaining why you want to study in Australia and intend to return. It's a critical, high-rejection-rate document. VisaXpert specialises in drafting these.",
      },
      {
        q: "How much funds do I need to show?",
        a: "AUD 24,505 / year for living expenses plus tuition + travel. Detailed checklist provided at consultation.",
      },
      {
        q: "Is part-time work allowed?",
        a: "Yes — 48 hours per fortnight during semesters and unlimited during scheduled holidays.",
      },
    ],
  },
  {
    key: "visa",
    title: "Visa & Documentation",
    icon: "shield",
    items: [
      {
        q: "Do I need a separate visa interview for every country?",
        a: "Germany, the USA, UK and some others require an in-person interview. Canada SDS, Australia, Ireland and several EU countries are paper-based / biometrics-only.",
      },
      {
        q: "What documents do I need before applying for a visa?",
        a: "Passport, academic transcripts, IELTS, financial proof, bank statements, sponsor affidavit, university letter (LOA/CoE), photos. VisaXpert provides country-specific checklists.",
      },
      {
        q: "How long does a visa take to process?",
        a: "It varies — Canada SDS: 4–6 weeks · Germany: 6–10 weeks · Australia: 4–8 weeks · Ireland: 4–6 weeks · Netherlands: 2–4 weeks · Sweden: 4–8 weeks.",
      },
      {
        q: "What if my visa is rejected?",
        a: "Most rejections are document-related. Our team analyses the refusal letter, addresses the issue, and re-files. We have a 90%+ success rate on reapplications.",
      },
    ],
  },
  {
    key: "process",
    title: "The VisaXpert Process",
    icon: "users",
    items: [
      {
        q: "How do I get started?",
        a: "Three ways — (1) submit the form on the homepage, (2) call +91 98759 85641, or (3) walk into any branch. We respond within one working day.",
      },
      {
        q: "When should I begin the process?",
        a: "Ideally 8–12 months before your target intake. Some applications open even earlier — start as soon as you've picked a country.",
      },
      {
        q: "What's your fee structure?",
        a: "Transparent and country-specific. Initial consultation is free. Service fees are shared in writing once we've finalised your country and course plan.",
      },
      {
        q: "Do you offer EMI on the service fee?",
        a: "Yes — talk to your counsellor about the EMI plans we have with NBFC partners.",
      },
    ],
  },
];

// Flat list (useful for the home page snippet + JSON-LD).
export const FLAT_FAQS = FAQ_CATEGORIES.flatMap((c) => c.items);
