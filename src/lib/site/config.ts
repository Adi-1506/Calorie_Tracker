// Site-wide facts for the marketing pages, metadata and structured data.
// Optional business details come from env vars so nothing is invented: pages
// and JSON-LD only show an address, phone or email once the owner sets them.

export const SITE = {
  name: "Kalo",
  tagline: "Everything on your plate, counted.",
  description: "Track calories, macros and nutrients for any food, from home-cooked dishes to packaged snacks. Free, private and works on any device.",
  responsePromise: "We reply to every message within 24 hours.",
} as const;

export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || undefined,
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || undefined,
  hours: process.env.NEXT_PUBLIC_BUSINESS_HOURS || undefined,
  // "lat,lng", used for the map and LocalBusiness geo coordinates.
  geo: parseGeo(process.env.NEXT_PUBLIC_BUSINESS_GEO),
};

function parseGeo(value: string | undefined) {
  const m = value?.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/refunds", label: "Refund Policy" },
  { href: "/support", label: "Support resources" },
] as const;

/** The five FAQs from the spec: accuracy, pricing, privacy, offline use, devices. */
export const FAQS = [
  {
    q: "How accurate are the calorie numbers?",
    a: "Packaged foods come from Open Food Facts and USDA FoodData Central, and our own catalogue is marked verified or user-submitted. Home-cooked dishes vary with recipes and portions, so treat every number as a good estimate. Weighing your food or building it as a recipe gives the closest figures.",
  },
  {
    q: "Is Kalo free?",
    a: "Yes. Logging, barcode scanning, recipes, progress tracking and exports are free with no limit on how much you log. A paid plan may come later for extras, but basic tracking will stay free.",
  },
  {
    q: "What happens to my data?",
    a: "Your food logs and body data are private to your account. Weight and measurements are encrypted before they're stored, progress photos are private, and we never sell your data. You can download everything or delete your account at any time.",
  },
  {
    q: "Does it work offline?",
    a: "Kalo needs a connection today. Offline logging that syncs when you're back online is on the way as part of the installable app.",
  },
  {
    q: "Which devices can I use?",
    a: "Any phone, tablet or computer with a modern browser: Android, iPhone, Windows, Mac or Linux. Your log syncs across all of them because it's tied to your account.",
  },
] as const;
