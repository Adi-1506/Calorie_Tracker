import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose a new password | Calorie Tracker",
  description: "Set a new password for your Calorie Tracker account.",
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
        <h1 className="text-2xl font-semibold">Link expired</h1>
        <p>This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Choose a new password</h1>
      <ResetPasswordForm />
    </>
  );
}
