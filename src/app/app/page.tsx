import type { Metadata } from "next";
import { logout, logoutEverywhere } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard | Calorie Tracker",
  robots: { index: false },
};

// Placeholder dashboard; the real one arrives with core tracking (step 3).
export default async function DashboardPage() {
  const { user } = await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Welcome!</h1>
      <p>
        You&apos;re signed in as <strong>{user.email}</strong>. Food logging is coming in the next step.
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={logout}>
          <button className="rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700">Log out</button>
        </form>
        <form action={logoutEverywhere}>
          <button className="rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700">
            Log out on all devices
          </button>
        </form>
      </div>
    </main>
  );
}
