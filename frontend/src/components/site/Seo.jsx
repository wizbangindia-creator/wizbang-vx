import React from "react";
import { Helmet } from "react-helmet-async";

const SITE = {
  name: "VisaXpert",
  legal: "VisaXpert Visa & Immigration Services",
  origin: "https://visaxpert.in", // replace with the real production domain when deployed
  phone: "+91 9875985641",
  founder: "Sunil Arora",
};

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE.legal,
  alternateName: SITE.name,
  url: SITE.origin,
  logo: `${SITE.origin}/assets/visaxpert-logo.png`,
  founder: { "@type": "Person", name: SITE.founder },
  foundingDate: "2012",
  description:
    "VisaXpert is an ICEF-certified study abroad consultancy with 14+ years of experience, 4000+ visas approved and offices across Punjab, Jammu and Berlin.",
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: SITE.phone,
      contactType: "customer support",
      areaServed: ["IN", "DE", "AE", "SG", "CA", "AU", "IE", "FI", "DK"],
      availableLanguage: ["en", "hi", "pa"],
    },
  ],
  sameAs: [
    "https://www.facebook.com/visaxpert",
    "https://www.instagram.com/visaxpert",
    "https://www.linkedin.com/company/visaxpert",
    "https://www.youtube.com/@visaxpert",
  ],
};

// Branch addresses are placeholders (real postal address can be filled in later
// from the dashboard). Each branch is published as a LocalBusiness so Google
// can render the branch on Maps / knowledge panel.
const BRANCH_LD = ["Ludhiana", "Amritsar", "Jammu", "Pathankot", "Berlin"].map(
  (city) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE.name} – ${city}`,
    image: `${SITE.origin}/assets/visaxpert-logo.png`,
    parentOrganization: { "@type": "Organization", name: SITE.legal },
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressCountry: city === "Berlin" ? "DE" : "IN",
    },
    url: `${SITE.origin}/`,
  })
);

/**
 * Site-wide SEO helper. Drop it once at the top of any page component:
 *   <Seo title="..." description="..." path="/canonical-path" />
 * Falls back to the global VisaXpert metadata when fields are omitted.
 */
export default function Seo({
  title = "VisaXpert | Study Abroad Specialists Since 2012",
  description = "ICEF-certified study abroad consultancy. 4000+ visas approved, 14+ years of experience. Germany, Canada, Australia, Ireland, Netherlands, Sweden, Dubai, Finland & Denmark — free consultation.",
  path = "/",
  ogImage = "/assets/og-image.jpg",
  jsonLd,
}) {
  const url = `${SITE.origin}${path}`;
  const absoluteOg = ogImage.startsWith("http") ? ogImage : `${SITE.origin}${ogImage}`;

  // Use page-specific JSON-LD if supplied; otherwise inject the org + branches
  // (only on the homepage to avoid duplicate-entity warnings).
  const ldBlocks = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : path === "/"
    ? [ORGANIZATION_LD, ...BRANCH_LD]
    : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteOg} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOg} />

      {ldBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

export { SITE };
