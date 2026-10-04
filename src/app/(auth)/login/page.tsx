import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getNonce, turnstileSiteKey } from "@/lib/nonce";
import { safeRedirectPath } from "@/lib/security/redirect";

export const metadata: Metadata = {
  title: "Log in | Kalo",
  description: "Log in to track your meals, calories and nutrition.",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeRedirectPath(params.next) : undefined;
  const linkError = params.error === "link";

  return (
    <>
      <h1 className="mb-1 font-display text-[1.75rem] font-bold tracking-tight">Log in</h1>
      <p className="mb-6 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="link">
          Start tracking free
        </Link>
      </p>
      {linkError && (
        <p role="alert" className="mb-4 notice notice-warn">
          That link is invalid or has expired. Please log in or request a new one.
        </p>
      )}
      <LoginForm next={next} siteKey={turnstileSiteKey} nonce={await getNonce()} />
    </>
  );
}
