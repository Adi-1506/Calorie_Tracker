import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/site/blog";
import { LEGAL, siteUrl } from "@/lib/site/config";

const UPDATED = "2026-10-04";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: { path: string; priority: number; freq: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/features", priority: 0.9, freq: "monthly" },
    { path: "/pricing", priority: 0.8, freq: "monthly" },
    { path: "/blog", priority: 0.7, freq: "weekly" },
    { path: "/faq", priority: 0.6, freq: "monthly" },
    { path: "/contact", priority: 0.6, freq: "yearly" },
    ...LEGAL.map((l) => ({ path: l.href, priority: 0.3, freq: "yearly" as const })),
  ];
  return [
    ...pages.map((p) => ({ url: `${base}${p.path}`, lastModified: UPDATED, changeFrequency: p.freq, priority: p.priority })),
    ...POSTS.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.published, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
