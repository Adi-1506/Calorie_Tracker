import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Support resources: eating and mental health | Kalo",
  description: "If food, weight or tracking feels hard, you're not alone. Where to find free, confidential help, and how to use Kalo more gently.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <PageShell
      crumbs={[{ href: "/support", label: "Support resources" }]}
      title="If tracking feels hard"
      intro="Counting food helps many people, but it isn't right for everyone. If it's making you anxious, guilty or obsessive, it's okay to stop and talk to someone."
      cta={false}
    >
      <div className="prose-kalo">
        <h2>Free, confidential help</h2>
        <ul>
          <li>
            <strong>India:</strong> Tele-MANAS, the government&apos;s 24/7 mental health helpline. Call <a href="tel:14416">14416</a> (free, many
            languages).
          </li>
          <li>
            <strong>United States:</strong> call or text <a href="tel:988">988</a>, the Suicide &amp; Crisis Lifeline, any time.
          </li>
          <li>
            <strong>United Kingdom:</strong> Beat, the eating disorder charity, at{" "}
            <a href="https://www.beateatingdisorders.org.uk" target="_blank" rel="noopener noreferrer">
              beateatingdisorders.org.uk
            </a>
            .
          </li>
          <li>
            <strong>Anywhere else:</strong> find a free helpline in your country at{" "}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
              findahelpline.com
            </a>
            .
          </li>
        </ul>
        <p>
          <strong>If you or someone else is in immediate danger, call your local emergency number.</strong>
        </p>

        <h2>Using Kalo more gently</h2>
        <ul>
          <li>
            Turn on <strong>Hide numbers</strong> in Settings. You can keep logging without seeing calories or weights.
          </li>
          <li>Skip weigh-ins. Nothing in Kalo requires them.</li>
          <li>Take a break. Your data stays put, and streaks are just for fun.</li>
          <li>Talk to a doctor or registered dietitian about what&apos;s right for you.</li>
        </ul>

        <h2>A note on our design</h2>
        <p>
          Kalo never sets targets below safe minimums, never suggests a calorie deficit or fasting to anyone under 18, and our badges reward
          consistency, not eating less. If something in the app felt harmful, please <Link href="/contact">tell us</Link>.
        </p>
      </div>
    </PageShell>
  );
}
