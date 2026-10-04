import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getNonce, turnstileSiteKey } from "@/lib/nonce";
import { safeRedirectPath } from "@/lib/security/redirect";

export const metadata: Metadata = {
  title: "Log in | Calorie Tracker",
  description: "Log in to track your meals, calories and nutrition.",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeRedirectPath(params.next) : undefined;
  const linkError = params.error === "link";

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Log in</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        New here?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Start tracking free
        </Link>
      </p>
      {linkError && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          That link is invalid or has expired. Please log in or request a new one.
        </p>
      )}
      <LoginForm next={next} siteKey={turnstileSiteKey} nonce={await getNonce()} />
    </>
  );
}
