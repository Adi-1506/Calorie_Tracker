import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList } from "@/components/site/faq-list";
import { OrgSchema } from "@/components/site/org-schema";
import { FAQS, SITE } from "@/lib/site/config";
import { getPublishedReviews } from "@/lib/site/reviews";

export const metadata: Metadata = {
  title: "Kalo: free calorie and macro tracker for any food",
  description: "Track calories, macros and nutrients for home-cooked dishes, restaurant meals and packaged food. Barcode scanner, recipes, meal photos. Free.",
  alternates: { canonical: "/" },
  openGraph: { title: "Kalo: free calorie and macro tracker for any food", url: "/" },
};

const FEATURES = [
  { title: "Any food, any cuisine", text: "Search Open Food Facts, USDA and our own catalogue, or add your own dish in seconds." },
  { title: "Barcode scanner", text: "Point your camera at a packet and the nutrition fills in." },
  { title: "Snap your meal", text: "Take a photo and AI suggests the foods and portions. You confirm before anything is logged." },
  { title: "Recipes that add up", text: "Build a recipe once or import it from a link, then log a serving whenever you cook it." },
  { title: "Targets that adapt", text: "Calorie and macro targets from your body and goal, with a weekly check-in based on your real trend." },
  { title: "Progress that stays private", text: "Weight, measurements and photos, encrypted and visible only to you. Export any time." },
];

const STEPS = [
  { n: "1", title: "Tell us about you", text: "Height, weight, activity and goal. We suggest targets; you can change them." },
  { n: "2", title: "Log what you eat", text: "Search, scan, snap or quick-add. Recent foods and favourites are one tap away." },
  { n: "3", title: "Watch the plate fill", text: "Rings for calories and macros, streaks for consistency, and trends over weeks." },
];

export default async function Home() {
  const { reviews, count, average } = await getPublishedReviews();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-16">
      <section className="flex flex-col gap-10 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-6">
          <h1 className="font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">{SITE.tagline}</h1>
          <p className="max-w-md text-lg text-muted">
            Track calories, macros and nutrients for any food, from home-cooked dishes to packaged snacks. Free, private and on every device.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary min-h-12 px-5 text-base">
              Start tracking free
            </Link>
            <Link href="/features" className="btn min-h-12 px-5 text-base">
              See how it works
            </Link>
          </div>
        </div>
        <svg viewBox="0 0 250 250" className="mx-auto w-56 shrink-0 sm:w-72" role="img" aria-label="A plate with a calorie ring three-quarters full">
          <circle cx="125" cy="125" r="116" className="fill-well stroke-ink" strokeWidth="2" />
          <circle cx="125" cy="125" r="100" fill="none" className="stroke-line" strokeWidth="16" />
          <circle cx="125" cy="125" r="100" fill="none" stroke="var(--turmeric)" strokeWidth="16" strokeLinecap="round" strokeDasharray="628" strokeDashoffset="190" transform="rotate(-90 125 125)" />
          <circle cx="125" cy="125" r="84" className="fill-surface stroke-ink" strokeWidth="2" />
          <circle cx="86" cy="104" r="17" className="stroke-ink" fill="var(--leaf)" strokeWidth="2" />
          <circle cx="125" cy="88" r="17" className="stroke-ink" fill="var(--carb)" strokeWidth="2" />
          <circle cx="164" cy="104" r="17" className="stroke-ink" fill="var(--chili)" strokeWidth="2" />
          <ellipse cx="125" cy="152" rx="44" ry="24" className="fill-well stroke-ink" strokeWidth="2" />
        </svg>
      </section>

      <section aria-labelledby="features-heading" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="features-heading" className="font-display text-3xl font-extrabold tracking-tight">
            Log it your way
          </h2>
          <Link href="/features" className="link text-sm font-semibold">
            All features
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="card p-5">
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-6">
        <h2 id="how-heading" className="font-display text-3xl font-extrabold tracking-tight">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-turmeric font-display text-lg font-extrabold text-on-turmeric">
                {s.n}
              </span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="reviews-heading" className="flex flex-col gap-6">
        <h2 id="reviews-heading" className="font-display text-3xl font-extrabold tracking-tight">
          What people say
        </h2>
        {count > 0 && average !== null ? (
          <>
            <p className="text-muted">
              Rated {average.toFixed(1)} out of 5 from {count} {count === 1 ? "review" : "reviews"} by people with Kalo accounts.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id} className="card p-5">
                  <p aria-label={`${r.rating} out of 5 stars`} className="text-turmeric">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  {r.title && <h3 className="mt-1 font-semibold">{r.title}</h3>}
                  <p className="mt-1 text-sm">{r.body}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="card-flat p-5 text-muted">
            No reviews yet. Reviews here come only from people with real Kalo accounts, so this stays empty until they write some.
          </p>
        )}
      </section>

      <section aria-labelledby="faq-heading" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="faq-heading" className="font-display text-3xl font-extrabold tracking-tight">
            Questions
          </h2>
          <Link href="/faq" className="link text-sm font-semibold">
            All questions
          </Link>
        </div>
        <FaqList items={FAQS} />
      </section>

      <CtaBand />
      <OrgSchema rating={average !== null ? { average, count } : null} />
    </main>
  );
}
