"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/app", label: "Today" },
  { href: "/app/coach", label: "Coach" },
  { href: "/app/recipes", label: "Recipes" },
  { href: "/app/progress", label: "Progress" },
  { href: "/app/fasting", label: "Fasting" },
  { href: "/app/targets", label: "Targets" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-10 items-center rounded-full border-2 border-transparent px-3 text-sm font-semibold hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ground"
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
