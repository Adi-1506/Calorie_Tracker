// Content Security Policy with a per-request nonce (security items 18 and 38).
// Scripts must carry the nonce; 'strict-dynamic' lets those scripts load their
// own dependencies. Inline styles stay allowed because React style attributes
// and the Turnstile widget rely on them; inline scripts do not.
// Google Analytics hosts are added only when GA4 is configured; the script
// itself still loads only after cookie consent (src/components/site/cookie-consent.tsx).
const GA_CONNECT = ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"];
const GA_IMG = ["https://*.google-analytics.com", "https://*.googletagmanager.com"];

export function buildCsp(nonce: string, { isDev = false, supabaseUrl = "", analytics = false, map = false } = {}) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...(analytics ? GA_IMG : [])],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(supabaseUrl ? [supabaseUrl] : []), ...(analytics ? GA_CONNECT : [])],
    "frame-src": ["https://challenges.cloudflare.com", ...(map ? ["https://www.openstreetmap.org"] : [])],
    // The service worker and manifest are same-origin files. worker-src must be
    // explicit: otherwise it falls back to script-src, where 'strict-dynamic' ignores 'self'.
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function createNonce() {
  return btoa(crypto.randomUUID());
}
