import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose a new password | Kalo",
  description: "Set a new password for your Kalo account.",
  robots: { index: false },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Link expired</h1>
        <p>This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="link">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 font-display text-[1.75rem] font-bold tracking-tight">Choose a new password</h1>
      <ResetPasswordForm />
    </>
  );
}
