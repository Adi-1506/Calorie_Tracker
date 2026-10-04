import { OG_SIZE, ogImage } from "@/lib/site/og";

export const alt = "Kalo: everything on your plate, counted.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Free calorie tracker", title: "Everything on your plate, counted.", subtitle: "Calories, macros and nutrients for any food, from any kitchen." });
}
