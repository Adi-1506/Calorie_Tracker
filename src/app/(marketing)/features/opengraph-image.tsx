import { OG_SIZE, ogImage } from "@/lib/site/og";

export const alt = "Kalo features: search, scan, snap or cook it yourself.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Features", title: "Search, scan, snap, or cook it yourself.", subtitle: "Barcode scanner, recipes, meal photos and targets that adapt." });
}
