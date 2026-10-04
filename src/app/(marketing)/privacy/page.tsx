import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/site/legal-page";
import { CONTACT, SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Privacy Policy | Kalo",
  description: "What Kalo collects, why, who processes it (including Google's Gemini AI), how long we keep it, and how to export or delete your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage href="/privacy" title="Privacy Policy" updated="2026-10-04">
      <p>
        This policy explains what personal data {SITE.name} (&quot;we&quot;, &quot;us&quot;) collects when you use the website and app, why we
        collect it, who we share it with, and the choices you have. We wrote it to be read, not skimmed past. If anything is unclear,{" "}
        <ContactLine email={CONTACT.email} />.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>We collect what we need to run a calorie tracker: your account, your profile and what you log.</li>
        <li>Weight and body measurements are encrypted before they are stored. Progress photos are private to you.</li>
        <li>We never sell your data and don&apos;t show ads.</li>
        <li>
          Meal photos and coach messages are sent to Google&apos;s Gemini AI only if you agree, and Google may use them to improve its products.
        </li>
        <li>Analytics cookies are only used if you allow them.</li>
        <li>You can download your data or delete your account whenever you like.</li>
      </ul>

      <h2>What we collect</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email address and password (stored only as a secure hash by our authentication provider)</td>
            <td>To create and protect your account and send account emails such as confirmations and password resets.</td>
          </tr>
          <tr>
            <td>Profile: display name, date of birth, sex, height, activity level, goal, diet type, allergies, time zone</td>
            <td>To calculate your calorie and macro targets and show your day in your time zone.</td>
          </tr>
          <tr>
            <td>Health data: food and water logs, weight, body measurements, fasting sessions, progress photos</td>
            <td>To provide the tracker. This is sensitive data and we only collect it with your explicit consent at signup.</td>
          </tr>
          <tr>
            <td>Custom foods, recipes, favourites, badges and streaks</td>
            <td>To make logging faster and show your progress.</td>
          </tr>
          <tr>
            <td>Meal photos and AI coach messages</td>
            <td>To recognise foods and answer your questions, only after you agree in the AI pop-up (see below).</td>
          </tr>
          <tr>
            <td>Reviews you choose to write</td>
            <td>To show real reviews from real users after moderation.</td>
          </tr>
          <tr>
            <td>Contact form messages (name, email, message)</td>
            <td>To reply to you.</td>
          </tr>
          <tr>
            <td>Security data: a salted, one-way hash of your IP address, sign-in events, two-factor events</td>
            <td>To stop abuse such as password guessing and spam, and to investigate security problems. These logs contain no health data.</td>
          </tr>
          <tr>
            <td>Analytics (only with your consent): pages visited, device type, approximate location, and events such as &quot;signed up&quot;</td>
            <td>To understand which pages help people. We never send health data or your email to analytics.</td>
          </tr>
        </tbody>
      </table>

      <h2>Legal basis and consent</h2>
      <p>
        We process your account and logging data to provide the service you signed up for. We process health data on the basis of the explicit
        consent you give at signup, and AI features and analytics only on the basis of the separate consent you give for each. You can withdraw
        consent at any time: turn off AI features in Settings, change cookie choices from the link in the footer, or delete your account.
        Withdrawing doesn&apos;t affect processing that already happened.
      </p>

      <h2>AI features (Google Gemini)</h2>
      <p>
        Meal-photo recognition and the AI coach use Google&apos;s Gemini API. Before you first use either, we ask for your permission. If you
        agree:
      </p>
      <ul>
        <li>The photo you take, or the messages you type, are sent to Google along with a short summary of your day (targets, totals and the names of foods you logged).</li>
        <li>We never send your name, email address, date of birth or account ID. Email addresses and phone numbers you type into the coach are removed before sending.</li>
        <li>Photos are shrunk and re-encoded first, which removes location and camera details. We don&apos;t store meal photos, and coach chats are not saved.</li>
        <li>
          We currently use Gemini&apos;s free tier, under which <strong>Google may use this data to improve its products</strong>, and people at
          Google may review it. Don&apos;t include anything in photos or messages you wouldn&apos;t want Google to see.
        </li>
      </ul>
      <p>You can turn AI features off in Settings at any time; the AI features then stop working until you agree again.</p>

      <h2>Who we share data with</h2>
      <p>We use these service providers to run Kalo. They process data on our behalf and only for these purposes:</p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in and private file storage. Our project is hosted in Mumbai, India.</li>
        <li><strong>Vercel</strong>: website hosting.</li>
        <li><strong>Google</strong>: Gemini AI (only with your AI consent) and Google Analytics (only with your cookie consent).</li>
        <li><strong>Cloudflare</strong>: Turnstile, which checks that sign-ups, logins and contact messages come from people rather than bots.</li>
        <li>
          <strong>Open Food Facts and USDA FoodData Central</strong>: when you search for a food or scan a barcode, the search words or barcode
          number are sent to these public databases. No account details are sent.
        </li>
      </ul>
      <p>
        Some providers may process data outside your country. Where they do, we rely on their contractual safeguards. We will share data with
        authorities only if the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and everything you log: until you delete it or delete your account.</li>
        <li>Contact messages: as long as needed to handle your request.</li>
        <li>Security logs: kept after account deletion so we can investigate abuse. They contain a hashed IP address and no health data.</li>
        <li>Deleted data can remain in our provider&apos;s encrypted backups until those backups expire.</li>
      </ul>

      <h2>Your rights and choices</h2>
      <p>Depending on where you live (for example under India&apos;s DPDP Act or the EU and UK GDPR), you have the right to:</p>
      <ul>
        <li><strong>Access and download</strong> your data: Progress page, Export (CSV or PDF).</li>
        <li><strong>Correct</strong> it: edit your profile, targets and entries in the app.</li>
        <li><strong>Delete</strong> it: delete individual entries, or delete your whole account in Settings.</li>
        <li><strong>Withdraw consent</strong> for AI features (Settings) or analytics (Cookie settings in the footer).</li>
        <li><strong>Complain</strong> to your data protection authority if you think we got something wrong, though we&apos;d appreciate the chance to fix it first.</li>
      </ul>
      <p>
        For anything else, <ContactLine email={CONTACT.email} />. {SITE.responsePromise}
      </p>

      <h2>Security</h2>
      <p>
        We use encryption in transit, encryption of weight and measurements at rest, row-level access rules so you can only ever reach your own
        data, optional two-factor login, rate limits and bot checks. No system is perfectly secure, but we take it seriously, and we&apos;ll tell
        you and the authorities as the law requires if a breach affects your data.
      </p>

      <h2>Children</h2>
      <p>
        Kalo is for people aged 13 and over. Users under 18 should use it with a parent or guardian&apos;s involvement, and we never suggest
        weight-loss targets or fasting to them.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&apos;ll update the date above and tell you in the app before the change applies.</p>
    </LegalPage>
  );
}
