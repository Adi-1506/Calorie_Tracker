// Only redirect to known in-app paths after login (security item 25).
const ALLOWED_PREFIXES = ["/app"];
export const DEFAULT_AFTER_LOGIN = "/app";

export function safeRedirectPath(next: unknown): string {
  if (typeof next !== "string" || next.length > 512) return DEFAULT_AFTER_LOGIN;
  // Must be a plain absolute path: no scheme, no protocol-relative "//", no backslashes.
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next)) return DEFAULT_AFTER_LOGIN;

  let url: URL;
  try {
    url = new URL(next, "http://localhost");
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (url.origin !== "http://localhost") return DEFAULT_AFTER_LOGIN;

  const allowed = ALLOWED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
  return allowed ? `${url.pathname}${url.search}` : DEFAULT_AFTER_LOGIN;
}
