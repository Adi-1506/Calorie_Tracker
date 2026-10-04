import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS, hardenCookie } from "./cookies";

// Supabase client acting as the signed-in user, so Row Level Security applies.
export async function createClient() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, hardenCookie(options));
          }
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
