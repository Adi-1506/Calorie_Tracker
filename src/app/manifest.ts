import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: `${SITE.name}: calorie and nutrition tracker`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f7f3",
    theme_color: "#1a1714",
    categories: ["health", "fitness", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log food", url: "/app/log", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Today", url: "/app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
