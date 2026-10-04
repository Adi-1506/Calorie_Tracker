/**
 * Normalises NEXT_PUBLIC_SITE_URL: adds https:// when the scheme is missing
 * (an easy slip when pasting a Vercel domain) and drops a trailing slash.
 */
export function normalizeSiteUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}
