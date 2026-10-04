"use client";

import Script from "next/script";

// Cloudflare Turnstile bot check (security item 12). It adds a hidden
// "cf-turnstile-response" field to the surrounding form. Renders nothing when
// no site key is configured (local development).
export function Turnstile({ siteKey, nonce }: { siteKey?: string; nonce?: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        nonce={nonce}
      />
      <div className="cf-turnstile min-h-[65px]" data-sitekey={siteKey} data-theme="auto" />
    </>
  );
}
