import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { getNonce, turnstileSiteKey } from "@/lib/nonce";

export const metadata: Metadata = {
  title: "Create your free account | Calorie Tracker",
  description: "Sign up free to track calories, macros and nutrients for any food.",
};

export default async function SignupPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-[1.75rem] font-bold tracking-tight">Start tracking free</h1>
      <p className="mb-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="link">
          Log in
        </Link>
      </p>
      <SignupForm siteKey={turnstileSiteKey} nonce={await getNonce()} />
    </>
  );
}
