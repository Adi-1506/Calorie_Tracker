import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

// Service-role client: bypasses RLS. Server only, never pass user input into
// its filters without validating ownership first (security items 3 and 28).
export function createAdminClient() {
  return createClient(publicEnv().supabaseUrl, serverEnv().supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
