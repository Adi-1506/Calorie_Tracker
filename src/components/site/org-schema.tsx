import { CONTACT, SITE, siteUrl } from "@/lib/site/config";
import { JsonLd } from "./json-ld";

/**
 * Organization JSON-LD, upgraded to LocalBusiness only when a real address is
 * configured. Nothing (address, phone, hours, geo) is made up.
 */
export function OrgSchema({ rating }: { rating?: { average: number; count: number } | null }) {
  const local = Boolean(CONTACT.address);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": local ? "LocalBusiness" : "Organization",
    name: SITE.name,
    url: siteUrl(),
    logo: `${siteUrl()}/icon.svg`,
    description: SITE.description,
  };
  if (CONTACT.email) data.email = CONTACT.email;
  if (CONTACT.phone) data.telephone = CONTACT.phone;
  if (CONTACT.address) data.address = CONTACT.address;
  if (CONTACT.hours) data.openingHours = CONTACT.hours;
  if (CONTACT.geo) data.geo = { "@type": "GeoCoordinates", latitude: CONTACT.geo.lat, longitude: CONTACT.geo.lng };
  // Only from real, published reviews.
  if (rating && rating.count > 0) {
    data.aggregateRating = { "@type": "AggregateRating", ratingValue: rating.average.toFixed(1), reviewCount: rating.count, bestRating: 5, worstRating: 1 };
  }
  return <JsonLd data={data} />;
}
