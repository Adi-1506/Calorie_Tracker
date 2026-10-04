import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getNonce, turnstileSiteKey } from "@/lib/nonce";

export const metadata: Metadata = {
  title: "Reset your password | Calorie Tracker",
  description: "Get a link to reset your Calorie Tracker password.",
  robots: { index: false },
};

export default async function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Reset your password</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        Enter your email and we&apos;ll send you a link.{" "}
        <Link href="/login" className="underline underline-offset-4">
          Back to log in
        </Link>
      </p>
      <ForgotPasswordForm siteKey={turnstileSiteKey} nonce={await getNonce()} />
    </>
  );
}
