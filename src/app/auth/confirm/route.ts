import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/security/redirect";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery", "email_change", "invite", "magiclink"];
const ALLOWED_NEXT = new Set(["/reset-password"]);

function otpType(value: string | null): EmailOtpType {
  return OTP_TYPES.find((t) => t === value) ?? "email";
}

// Handles links from Supabase emails (confirm signup, reset password, change
// email). Supabase validates the token: it must exist, match the type, be
// unexpired and unused (security items 10 and 26). Email templates are in
// supabase/templates/.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const nextParam = searchParams.get("next");
  const next = nextParam && ALLOWED_NEXT.has(nextParam) ? nextParam : safeRedirectPath(nextParam);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: otpType(searchParams.get("type")),
    token_hash: searchParams.get("token_hash") ?? "",
  });

  const destination = error ? "/login?error=link" : next;
  return NextResponse.redirect(new URL(destination, request.url));
}
