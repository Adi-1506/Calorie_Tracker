import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Page not found | Kalo",
  description: "We couldn't find that page. Search for a food, or head to one of Kalo's popular pages.",
  robots: { index: false },
};

const POPULAR = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact us" },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">404</p>
          <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">This plate is empty.</h1>
          <p className="max-w-xl text-lg">The page you were looking for isn&apos;t here. It may have moved, or the link may have a typo.</p>
        </div>

        <form action="/app/log" method="get" role="search" className="card flex flex-col gap-3 p-5 sm:p-6">
          <label htmlFor="nf-q" className="font-semibold">
            Looking for a food?
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="nf-q" name="q" type="search" className="input flex-1" placeholder="Try dosa, oats, or chicken biryani" maxLength={100} />
            <button className="btn btn-primary">Search foods</button>
          </div>
          <p className="text-xs text-muted">You&apos;ll be asked to log in or sign up first.</p>
        </form>

        <nav aria-labelledby="nf-popular" className="flex flex-col gap-3">
          <h2 id="nf-popular" className="font-display text-xl font-bold">
            Popular pages
          </h2>
          <ul className="flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="btn btn-sm">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
