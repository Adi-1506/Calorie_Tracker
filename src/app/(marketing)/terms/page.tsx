import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/site/legal-page";
import { CONTACT, SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Terms & Conditions | Kalo",
  description: "The rules for using Kalo: your account, acceptable use, health disclaimers, reviews, AI features and how either of us can end the agreement.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage href="/terms" title="Terms & Conditions" updated="2026-10-04">
      <p>
        These terms are the agreement between you and {SITE.name} when you use our website and app. By creating an account you agree to them,
        along with our <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>1. Not medical advice</h2>
      <p>
        Kalo gives estimates for general wellness. Calorie and nutrient figures, targets, AI suggestions and coach replies can be wrong and are
        not medical, nutritional or psychological advice. Talk to a doctor or registered dietitian before changing your diet if you have a
        medical condition, are pregnant or breastfeeding, take medication, or have a history of disordered eating. If you&apos;re struggling, see
        our <Link href="/support">support resources</Link>.
      </p>

      <h2>2. Who can use Kalo</h2>
      <p>
        You must be at least 13. If you&apos;re under 18, use Kalo with a parent or guardian&apos;s involvement; we don&apos;t offer weight-loss
        targets or fasting to under-18s. You must give accurate information when you sign up.
      </p>

      <h2>3. Your account</h2>
      <p>
        Keep your password safe and turn on two-factor login if you can. You&apos;re responsible for activity on your account. Tell us straight
        away if you think someone else has accessed it.
      </p>

      <h2>4. Acceptable use</h2>
      <p>Don&apos;t:</p>
      <ul>
        <li>break the law or anyone&apos;s rights using Kalo;</li>
        <li>try to access other people&apos;s data, probe or overload our systems, or get around rate limits, bot checks or AI limits;</li>
        <li>scrape the service, or resell or copy it;</li>
        <li>upload anything illegal, harmful, or that you don&apos;t have the right to share;</li>
        <li>post fake, paid-for or misleading reviews.</li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        You own what you log and upload. You give us permission to store and process it only to run Kalo for you. Custom foods you create stay
        private to your account. If you write a review, you let us show it publicly on Kalo after moderation; you can delete it at any time.
      </p>

      <h2>6. AI features</h2>
      <p>
        Meal photos and the coach are optional and use a third-party AI provider, as explained in the Privacy Policy. AI answers can be wrong:
        always check the foods and portions before you log them. We set daily limits so the service stays available for everyone.
      </p>

      <h2>7. Third-party food data</h2>
      <p>
        Some food information comes from Open Food Facts (available under the Open Database License) and USDA FoodData Central. We don&apos;t
        guarantee its accuracy.
      </p>

      <h2>8. Price</h2>
      <p>
        Kalo is currently free. If we add a paid plan, we&apos;ll show the price and terms before you buy, and our{" "}
        <Link href="/refunds">Refund Policy</Link> will apply.
      </p>

      <h2>9. Changes and availability</h2>
      <p>
        We may change or stop features. We try to keep Kalo running but can&apos;t promise it will always be available or error-free. If we make
        important changes to these terms, we&apos;ll tell you in the app before they apply.
      </p>

      <h2>10. Ending the agreement</h2>
      <p>
        You can stop using Kalo and delete your account in Settings at any time. We may suspend or close accounts that break these terms or put
        others at risk, and will tell you why unless the law or safety prevents it.
      </p>

      <h2>11. Liability</h2>
      <p>
        To the extent the law allows, Kalo is provided &quot;as is&quot; and we are not liable for indirect losses or for decisions you make
        based on estimates in the app. Nothing in these terms limits rights you have under consumer law that can&apos;t be excluded.
      </p>

      <h2>12. Law</h2>
      <p>
        These terms are governed by the laws of India, and the courts of India have jurisdiction, without taking away any protection the law of
        the country where you live gives you.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these terms? <ContactLine email={CONTACT.email} />.
      </p>
    </LegalPage>
  );
}
