import Link from "next/link";

// Placeholder until the marketing site lands in step 4.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-20 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-6">
        <p className="font-display text-xl font-extrabold tracking-tight">
          Kalo<span className="text-turmeric">.</span>
        </p>
        <h1 className="font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          Everything on your plate, counted.
        </h1>
        <p className="max-w-md text-lg text-muted">
          Track calories, macros and nutrients for any food, from home-cooked dishes to packaged snacks.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn btn-primary min-h-12 px-5 text-base">
            Start tracking free
          </Link>
          <Link href="/login" className="btn min-h-12 px-5 text-base">
            Log in
          </Link>
        </div>
      </div>
      <svg viewBox="0 0 250 250" className="mx-auto w-56 shrink-0 sm:w-64" aria-hidden="true">
        <circle cx="125" cy="125" r="116" className="fill-well stroke-ink" strokeWidth="2" />
        <circle cx="125" cy="125" r="100" fill="none" className="stroke-line" strokeWidth="16" />
        <circle cx="125" cy="125" r="100" fill="none" stroke="var(--turmeric)" strokeWidth="16" strokeLinecap="round" strokeDasharray="628" strokeDashoffset="190" transform="rotate(-90 125 125)" />
        <circle cx="125" cy="125" r="84" className="fill-surface stroke-ink" strokeWidth="2" />
        <circle cx="86" cy="104" r="17" className="stroke-ink" fill="var(--leaf)" strokeWidth="2" />
        <circle cx="125" cy="88" r="17" className="stroke-ink" fill="var(--carb)" strokeWidth="2" />
        <circle cx="164" cy="104" r="17" className="stroke-ink" fill="var(--chili)" strokeWidth="2" />
        <ellipse cx="125" cy="152" rx="44" ry="24" className="fill-well stroke-ink" strokeWidth="2" />
      </svg>
    </main>
  );
}
