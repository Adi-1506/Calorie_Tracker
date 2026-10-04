import type { Metadata } from "next";
import Link from "next/link";
import { ClearOfflineData } from "@/components/pwa/clear-offline-data";

export const metadata: Metadata = {
  title: "Account deleted | Kalo",
  description: "Your Kalo account and data have been deleted.",
  robots: { index: false },
};

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 sm:py-24">
      <ClearOfflineData />
      <h1 className="font-display text-[2.25rem] font-extrabold leading-tight tracking-tight">Your account is deleted.</h1>
      <p>
        We&apos;ve removed your account, food log, weights, measurements, photos, recipes and reviews. Copies in our provider&apos;s encrypted
        backups disappear when those backups expire. Thanks for trying Kalo.
      </p>
      <p className="text-sm text-muted">
        Changed your mind? You&apos;re welcome back any time with a new account.{" "}
        <Link href="/contact" className="link">
          Tell us why you left
        </Link>{" "}
        if you&apos;d like to.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to the home page
      </Link>
    </main>
  );
}
