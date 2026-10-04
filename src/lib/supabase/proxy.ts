import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS, hardenCookie } from "./cookies";

// Refreshes the session cookie on every request and returns the user (if any).
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  const env = publicEnv();
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, hardenCookie(options));
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getUser() validates the token with Supabase Auth; never trust the cookie alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
