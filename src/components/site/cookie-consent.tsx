"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserOptsOut, consentCookie, readConsent, type Consent } from "@/lib/site/consent";

const OPEN_EVENT = "kalo:cookie-settings";
const CHANGE_EVENT = "kalo:consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

let gaLoaded = false;

/** Loads GA4 once, only after consent. Created from our own (nonced) code, so the CSP allows it via 'strict-dynamic'. */
function loadAnalytics(id: string) {
  if (gaLoaded || browserOptsOut(navigator)) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/** Bottom banner asking before any analytics cookie is set. Mounted once in the root layout. */
export function CookieConsent({ gaId }: { gaId?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = readConsent(document.cookie);
    // Nothing to ask about without analytics configured, and DNT/GPC already said no.
    const needsAsking = Boolean(gaId) && !browserOptsOut(navigator);
    // Reading the cookie has to wait for the browser, so this runs after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === null && needsAsking) setOpen(true);
    if (stored === "granted" && gaId) loadAnalytics(gaId);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [gaId]);

  useEffect(() => {
    document.documentElement.dataset.cookieBanner = open ? "open" : "closed";
  }, [open]);

  function choose(value: Consent) {
    document.cookie = consentCookie(value, location.protocol === "https:");
    setOpen(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    if (value === "granted" && gaId) loadAnalytics(gaId);
    // Withdrawing consent after GA loaded: reload so the script is gone.
    if (value === "denied" && gaLoaded) location.reload();
  }

  if (!open) return null;
  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-surface p-4 shadow-plate sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-2xl sm:border-2"
    >
      <p className="text-sm">
        We use essential cookies to keep you signed in. With your OK, we&apos;d also use Google Analytics to see which pages help people. See
        our{" "}
        <Link href="/cookies" className="link">
          Cookie Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => choose("denied")} className="btn btn-sm flex-1">
          Essential only
        </button>
        <button type="button" onClick={() => choose("granted")} className="btn btn-primary btn-sm flex-1">
          Allow analytics
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="text-left hover:underline">
      Cookie settings
    </button>
  );
}
