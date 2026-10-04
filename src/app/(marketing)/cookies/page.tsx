import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/site/cookie-consent";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy | Kalo",
  description: "The few cookies Kalo uses: essential sign-in cookies, your cookie choice, and Google Analytics only if you allow it.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage href="/cookies" title="Cookie Policy" updated="2026-10-04">
      <p>Cookies are small files a website stores in your browser. Kalo uses as few as possible.</p>

      <h2>Essential cookies (always on)</h2>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Lasts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase sign-in cookies (names start with <code>sb-</code>)</td>
            <td>Keep you signed in securely. HttpOnly, so page scripts can&apos;t read them.</td>
            <td>Until you log out or the session expires</td>
          </tr>
          <tr>
            <td>
              <code>kalo_consent</code>
            </td>
            <td>Remembers whether you allowed analytics, so we don&apos;t ask on every page.</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>Cloudflare Turnstile</td>
            <td>Bot check on sign-up, login and contact forms. Cloudflare may set its own cookies while the check runs.</td>
            <td>Short-lived</td>
          </tr>
        </tbody>
      </table>

      <h2>Analytics cookies (only if you allow them)</h2>
      <p>
        If you choose &quot;Allow analytics&quot;, we load Google Analytics 4, which sets cookies whose names start with <code>_ga</code> for up
        to 2 years. They help us see which pages are useful and whether sign-up works. We ask Google to anonymise IP addresses and never send
        health data or your email. If your browser sends a Do Not Track or Global Privacy Control signal, we treat that as &quot;no&quot; and
        don&apos;t ask.
      </p>

      <h2>Changing your mind</h2>
      <p>
        You can change your choice at any time: <CookieSettingsButton />. You can also delete cookies in your browser settings.
      </p>
    </LegalPage>
  );
}
