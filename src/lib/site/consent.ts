// Cookie consent (security item 38, spec section 2). The choice lives in a
// first-party cookie so it survives reloads; analytics only load on "granted",
// and never when the browser sends Do Not Track or Global Privacy Control.

export const CONSENT_COOKIE = "kalo_consent";
export type Consent = "granted" | "denied";

export function readConsent(cookie: string): Consent | null {
  const value = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  return value === "granted" || value === "denied" ? value : null;
}

export function consentCookie(value: Consent, secure: boolean) {
  return `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function browserOptsOut(nav: { doNotTrack?: string | null; globalPrivacyControl?: boolean }) {
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}
