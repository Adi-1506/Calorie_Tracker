import type { Metadata } from "next";
import Link from "next/link";

// Thank-you page after signup; also the analytics conversion page (section 2).
export const metadata: Metadata = {
  title: "Check your email | Kalo",
  description: "Confirm your email address to finish creating your account.",
  robots: { index: false },
};

export default function CheckEmailPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Thanks for signing up!</h1>
      <p>
        We&apos;ve sent you an email. Click the link in it to confirm your address, then you can start
        tracking.
      </p>
      <p className="text-sm text-muted">
        Didn&apos;t get it? Check your spam folder, or{" "}
        <Link href="/signup" className="link">
          try again
        </Link>
        .
      </p>
    </div>
  );
}
