import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/config";

// Marketing pages are crawlable; the app, API and auth flows are not (spec section 2).
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api", "/auth", "/login", "/signup", "/forgot-password", "/reset-password", "/thank-you", "/account-deleted"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
