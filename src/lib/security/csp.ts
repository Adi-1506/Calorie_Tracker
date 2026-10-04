// Content Security Policy with a per-request nonce (security items 18 and 38).
// Scripts must carry the nonce; 'strict-dynamic' lets those scripts load their
// own dependencies. Inline styles stay allowed because React style attributes
// and the Turnstile widget rely on them; inline scripts do not.
export function buildCsp(nonce: string, { isDev = false, supabaseUrl = "" } = {}) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(supabaseUrl ? [supabaseUrl] : [])],
    "frame-src": ["https://challenges.cloudflare.com"],
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
