import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList } from "@/components/site/faq-list";
import { PageShell } from "@/components/site/page-shell";
import { FAQS, SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "FAQ: accuracy, pricing, privacy and devices | Kalo",
  description: "Answers about how accurate Kalo's calorie numbers are, what's free, how your data is protected, offline use and which devices work.",
  alternates: { canonical: "/faq" },
  openGraph: { title: "Kalo FAQ", url: "/faq" },
};

export default function FaqPage() {
  return (
    <PageShell crumbs={[{ href: "/faq", label: "FAQ" }]} title="Frequently asked questions">
      <FaqList items={FAQS} />
      <p className="text-muted">
        Still wondering about something?{" "}
        <Link href="/contact" className="link">
          Send us a message
        </Link>
        . {SITE.responsePromise}
      </p>
      <CtaBand />
    </PageShell>
  );
}
