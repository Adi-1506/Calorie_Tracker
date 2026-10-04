import type { Metadata } from "next";
import { disableTotp, logoutEverywhere } from "@/app/(auth)/actions";
import { withdrawAiConsent } from "@/app/app/ai/actions";
import { setHideNumbers } from "@/app/app/settings/actions";
import Link from "next/link";
import { DeleteAccountForm } from "@/components/app/delete-account-form";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { EnrollTotp } from "@/components/auth/mfa-forms";
import { getProfile } from "@/lib/data/profile";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings | Kalo", robots: { index: false } };

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.auth.mfa.listFactors();
  const totp = data?.totp.find((f) => f.status === "verified");
  const turnedOff = (await searchParams).mfa === "off";
  const profile = await getProfile(supabase, user.id);
  const hide = profile?.hide_numbers ?? false;

  return (
    <>
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Signed in as {user.email}</p>
      </div>

      <section aria-labelledby="install-heading" className="card flex flex-col gap-3 p-5 sm:p-6">
        <h2 id="install-heading" className="font-display text-xl font-bold">
          Install the app
        </h2>
        <p className="text-sm">
          Add Kalo to your home screen for one-tap logging. It opens like an app, and you can quick-add food and water without a connection.
        </p>
        <InstallPrompt />
      </section>

      <section aria-labelledby="mfa-heading" className="card flex flex-col gap-4 p-5 sm:p-6">
        <h2 id="mfa-heading" className="font-display text-xl font-bold">
          Two-factor login
        </h2>
        <p className="text-sm">After your password, we&apos;ll also ask for a code from an authenticator app on your phone, so a stolen password alone can&apos;t get in.</p>
        {turnedOff && <p className="notice notice-warn">Two-factor login is off.</p>}
        {totp ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge bg-leaf text-surface">On</span>
            <span className="text-sm text-muted">Added {new Date(totp.created_at).toLocaleDateString("en-GB")}</span>
            <form action={disableTotp} className="ml-auto">
              <button className="btn btn-sm">Turn off</button>
            </form>
          </div>
        ) : (
          <EnrollTotp />
        )}
      </section>

      <section aria-labelledby="ai-heading" className="card flex flex-col gap-3 p-5 sm:p-6">
        <h2 id="ai-heading" className="font-display text-xl font-bold">
          AI features
        </h2>
        <p className="text-sm">
          Meal photos and the coach send your photos and messages to Google&apos;s Gemini AI, which may use them to improve its products.
          We never send your name or email.
        </p>
        {profile?.ai_consent_at ? (
          <form action={withdrawAiConsent} className="flex flex-wrap items-center gap-3">
            <span className="badge bg-leaf text-surface">Allowed</span>
            <button className="btn btn-sm">Turn off AI features</button>
          </form>
        ) : (
          <p className="text-sm text-muted">Off. You&apos;ll be asked before you first use meal photos or the coach.</p>
        )}
      </section>

      <section aria-labelledby="numbers-heading" className="card flex flex-col gap-3 p-5 sm:p-6">
        <h2 id="numbers-heading" className="font-display text-xl font-bold">
          Hide numbers
        </h2>
        <p className="text-sm">
          If counting feels stressful, hide calorie and weight numbers. You can keep logging, and the rings still fill up.
        </p>
        <form action={setHideNumbers} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="hide" value={hide ? "0" : "1"} />
          <span className={`badge ${hide ? "bg-leaf text-surface" : ""}`}>{hide ? "Numbers hidden" : "Numbers shown"}</span>
          <button className="btn btn-sm">{hide ? "Show numbers" : "Hide numbers"}</button>
        </form>
      </section>

      <section aria-labelledby="sessions-heading" className="card flex flex-col gap-3 p-5 sm:p-6">
        <h2 id="sessions-heading" className="font-display text-xl font-bold">
          Devices
        </h2>
        <p className="text-sm">Lost a phone or used a shared computer? Log out everywhere, including this device.</p>
        <form action={logoutEverywhere}>
          <button className="btn btn-sm">Log out on all devices</button>
        </form>
      </section>

      <section aria-labelledby="data-heading" className="card flex flex-col gap-3 p-5 sm:p-6">
        <h2 id="data-heading" className="font-display text-xl font-bold">
          Your data
        </h2>
        <p className="text-sm">
          Download everything you&apos;ve logged as CSV or PDF from{" "}
          <Link href="/app/progress#export" className="link">
            Progress
          </Link>
          . Read how we handle it in our{" "}
          <Link href="/privacy" className="link">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="delete-heading" className="card flex flex-col gap-3 border-chili p-5 sm:p-6">
        <h2 id="delete-heading" className="font-display text-xl font-bold">
          Delete account
        </h2>
        <p className="text-sm">
          This permanently deletes your account, food log, weights, measurements, photos, recipes and reviews straight away. Download your data
          first if you want to keep it.
        </p>
        <DeleteAccountForm />
      </section>
    </>
  );
}
