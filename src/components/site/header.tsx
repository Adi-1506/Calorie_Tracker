import Link from "next/link";
import { NAV } from "@/lib/site/config";

export function SiteHeader() {
  return (
    <header className="border-b-2 border-ink bg-ground">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
          Kalo<span className="text-turmeric">.</span>
        </Link>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold hover:bg-well">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="btn btn-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Start tracking free
          </Link>
        </div>
      </div>
    </header>
  );
}
