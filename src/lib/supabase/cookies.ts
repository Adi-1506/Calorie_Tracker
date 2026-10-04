import type { CookieOptions } from "@supabase/ssr";

// Auth cookies are HttpOnly so page scripts can never read the session
// (security item 9). All auth calls therefore run on the server.
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} satisfies CookieOptions;

export function hardenCookie(options: CookieOptions = {}): CookieOptions {
  return { ...options, ...AUTH_COOKIE_OPTIONS };
}
