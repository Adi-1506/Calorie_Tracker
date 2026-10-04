import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Features: barcode scanner, recipes, AI meal photos | Kalo",
  description: "Everything Kalo does: food search across global databases, barcode scanning, recipes, meal photos, adaptive targets, fasting timer and private progress.",
  alternates: { canonical: "/features" },
  openGraph: { title: "Kalo features", url: "/features" },
};

const GROUPS = [
  {
    title: "Logging",
    items: [
      ["Search any food", "Our catalogue, your own foods, Open Food Facts and USDA FoodData Central in one search. Entries are marked verified or user-submitted."],
      ["Barcode scanner", "Uses your phone camera. The video stays on your device; only the number is looked up."],
      ["Snap your meal", "AI lists the foods and portions in a photo and matches them to foods we know. You check every item before it's logged."],
      ["Quick add", "Just know the calories? Add them in two taps."],
      ["Recents, favourites and copy", "Re-log yesterday's breakfast or a whole day at once."],
    ],
  },
  {
    title: "Recipes and custom foods",
    items: [
      ["Recipe builder", "Add ingredients once and log servings whenever you cook it."],
      ["Recipe importer", "Paste a link from a recipe site and we pull in the ingredients for you to match."],
      ["Custom foods", "Add a dish from a label or your own measurements; it's private to you."],
    ],
  },
  {
    title: "Targets and coaching",
    items: [
      ["Personal targets", "Calories and macros from your height, weight, age, activity and goal, with safe minimums built in."],
      ["Weekly check-in", "After two weeks of logs, Kalo suggests a small adjustment from your real intake and weight trend. You decide whether to use it."],
      ["AI coach", "Ask what fits your remaining calories today, or for a high-protein snack idea."],
      ["Fasting timer", "Optional intermittent fasting timer for adults, with a history of past fasts."],
    ],
  },
  {
    title: "Progress and privacy",
    items: [
      ["Weight and measurements", "With a 7-day trend line, so one salty dinner doesn't look like a disaster."],
      ["Private progress photos", "Stored privately and only ever shown to you. Location data is stripped."],
      ["Streaks and badges", "Small nudges for consistency, never for eating less."],
      ["Export and delete", "Download your data as CSV or a PDF report, or delete your account, whenever you want."],
      ["Two-factor login", "Protect your account with an authenticator app."],
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <PageShell crumbs={[{ href: "/features", label: "Features" }]} title="Everything Kalo does" intro="Built for real meals: dal and rice, a burrito bowl, a protein bar, or grandma's recipe.">
      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`f-${g.title}`} className="flex flex-col gap-4">
          <h2 id={`f-${g.title}`} className="font-display text-2xl font-extrabold tracking-tight">
            {g.title}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {g.items.map(([title, text]) => (
              <li key={title} className="card p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-muted">
        Questions about accuracy or privacy? See the{" "}
        <Link href="/faq" className="link">
          FAQ
        </Link>{" "}
        or{" "}
        <Link href="/pricing" className="link">
          pricing
        </Link>
        .
      </p>
      <CtaBand />
    </PageShell>
  );
}
