import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaLoginForm } from "@/components/auth/mfa-forms";
import { needsSecondFactor } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Two-factor check | Calorie Tracker", robots: { index: false } };

export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await needsSecondFactor(supabase))) redirect(next);

  return (
    <>
      <h1 className="mb-1 font-display text-[1.75rem] font-bold tracking-tight">Two-factor check</h1>
      <p className="mb-6 text-sm text-muted">Enter the code from your authenticator app to finish logging in.</p>
      <MfaLoginForm next={next} />
    </>
  );
}
