import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getNonce, turnstileSiteKey } from "@/lib/nonce";

export const metadata: Metadata = {
  title: "Reset your password | Kalo",
  description: "Get a link to reset your Kalo password.",
  robots: { index: false },
};

export default async function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-[1.75rem] font-bold tracking-tight">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">
        Enter your email and we&apos;ll send you a link.{" "}
        <Link href="/login" className="link">
          Back to log in
        </Link>
      </p>
      <ForgotPasswordForm siteKey={turnstileSiteKey} nonce={await getNonce()} />
    </>
  );
}
