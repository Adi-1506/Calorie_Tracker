import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/site/faq-list";
import { PageShell } from "@/components/site/page-shell";
import { FAQS } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Pricing: free calorie tracking | Kalo",
  description: "Kalo is free: unlimited food logging, barcode scanning, recipes, progress and exports. No card needed. An optional paid plan may come later.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Kalo pricing", url: "/pricing" },
};

const FREE = [
  "Unlimited food logging",
  "Barcode scanner",
  "Recipes and recipe import",
  "Custom foods",
  "Calorie, macro and water targets",
  "Weight, measurements and private photos",
  "Fasting timer, streaks and badges",
  "Meal photos and AI coach (daily limits)",
  "CSV and PDF export",
];

export default function PricingPage() {
  return (
    <PageShell crumbs={[{ href: "/pricing", label: "Pricing" }]} title="Free. Really." intro="No trial, no card, no limit on how much you log." cta={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="free-plan" className="card flex flex-col gap-4 p-6">
          <div>
            <h2 id="free-plan" className="font-display text-2xl font-extrabold">
              Free
            </h2>
            <p className="mt-1 font-mono text-3xl font-semibold">
              ₹0 <span className="text-base font-normal text-muted">forever</span>
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden="true" className="text-leaf">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="btn btn-primary mt-auto min-h-12 text-base">
            Start tracking free
          </Link>
        </section>
        <section aria-labelledby="premium-plan" className="card-flat flex flex-col gap-3 p-6">
          <h2 id="premium-plan" className="font-display text-2xl font-extrabold">
            Premium
          </h2>
          <p className="text-muted">Not available yet.</p>
          <p className="text-sm">
            We may add an optional paid plan later for extras like higher AI limits. Basic logging and barcode scanning will always stay free, and
            we&apos;ll never move features you already use behind a paywall.
          </p>
          <p className="text-sm">
            See our{" "}
            <Link href="/refunds" className="link">
              Refund Policy
            </Link>{" "}
            for how paid plans would work.
          </p>
        </section>
      </div>
      <section aria-labelledby="pricing-faq" className="flex flex-col gap-4">
        <h2 id="pricing-faq" className="font-display text-2xl font-extrabold tracking-tight">
          Common questions
        </h2>
        <FaqList items={FAQS.filter((f) => /free|data/i.test(f.q))} withSchema={false} />
      </section>
    </PageShell>
  );
}
