import { OG_SIZE, ogImage } from "@/lib/site/og";

export const alt = "Kalo pricing: free, no trial and no card.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Pricing", title: "Free. No trial, no card.", subtitle: "Unlimited logging, barcode scanning, recipes and exports." });
}
