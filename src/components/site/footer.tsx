import Link from "next/link";
import { CONTACT, LEGAL, NAV, SITE } from "@/lib/site/config";
import { CookieSettingsButton } from "./cookie-consent";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-night text-on-night">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="font-display text-2xl font-extrabold tracking-tight">
            Kalo<span className="text-turmeric">.</span>
          </p>
          <p className="text-sm text-night-muted">{SITE.tagline}</p>
          <p className="text-sm text-night-muted">{SITE.responsePromise}</p>
          {CONTACT.email && (
            <a href={`mailto:${CONTACT.email}`} className="text-sm underline underline-offset-4">
              {CONTACT.email}
            </a>
          )}
        </div>
        <nav aria-label="Site">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-night-muted">Kalo</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/signup" className="hover:underline">
                Start tracking free
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-night-muted">Legal and help</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton />
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto w-full max-w-5xl px-4 pb-28 text-xs text-night-muted sm:px-6 sm:pb-8">
        Kalo gives estimates for general wellness, not medical advice. Talk to a doctor or registered dietitian about medical conditions.
      </p>
    </footer>
  );
}
