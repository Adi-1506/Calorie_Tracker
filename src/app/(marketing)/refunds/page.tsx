import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/site/legal-page";
import { CONTACT } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Refund Policy | Kalo",
  description: "Kalo is free today. If a paid plan launches, this is how cancellations and refunds will work.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <LegalPage href="/refunds" title="Refund Policy" updated="2026-10-04">
      <p>
        Kalo is currently free, and nothing in the app can be bought, so there is nothing to refund today. If we launch a paid plan, these
        principles will apply, and we&apos;ll update this page with the details before anyone is charged:
      </p>
      <ul>
        <li>The price, billing period and renewal terms will be shown clearly before you pay.</li>
        <li>You&apos;ll be able to cancel at any time from your account, and keep paid features until the end of the period you paid for.</li>
        <li>If something we sold you doesn&apos;t work and we can&apos;t fix it, we&apos;ll refund you.</li>
        <li>Purchases made through an app store will follow that store&apos;s refund process.</li>
        <li>Your rights under consumer law always apply.</li>
      </ul>
      <p>
        Questions? <ContactLine email={CONTACT.email} />.
      </p>
    </LegalPage>
  );
}
