import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIX = "/app";
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

function isProtected(pathname: string) {
  return pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`);
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname, search } = request.nextUrl;
  // Without Supabase configured (e.g. a fresh local checkout) the marketing
  // pages still work; protected pages redirect to /login.
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { response, user } = supabaseConfigured
    ? await updateSession(request, requestHeaders)
    : { response: NextResponse.next({ request: { headers: requestHeaders } }), user: null };

  let result: NextResponse = response;
  if (isProtected(pathname) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    result = NextResponse.redirect(login);
    // Keep any refreshed/cleared auth cookies on the redirect.
    for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
  }

  result.headers.set("Content-Security-Policy", csp);
  // Personal pages must never be cached by browsers or CDNs (security item 41).
  if (isProtected(pathname) || AUTH_PAGES.includes(pathname) || pathname.startsWith("/auth/")) {
    result.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return result;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
