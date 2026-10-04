import Link from "next/link";

// Placeholder until the marketing site lands in step 4.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Calorie Tracker</h1>
      <p className="text-lg opacity-80">
        Track calories, macros and nutrients for any food, from home-cooked dishes to packaged snacks.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Start tracking free
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 font-medium hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
