import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { MotionProvider } from "@/components/app/motion-provider";
import { getNonce } from "@/lib/nonce";

const NAV = [
  { href: "/app", label: "Today" },
  { href: "/app/log", label: "Add food" },
  { href: "/app/targets", label: "Targets" },
] as const;

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <MotionProvider nonce={await getNonce()}>
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav aria-label="Main" className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-1 px-4 py-3 text-sm">
          <Link href="/app" className="mr-auto whitespace-nowrap text-base font-semibold tracking-tight">
            Calorie Tracker
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-2 py-2 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:px-3 dark:hover:bg-neutral-900"
            >
              {item.label}
            </Link>
          ))}
          <form action={logout}>
            <button className="whitespace-nowrap rounded-lg px-2 py-2 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:px-3 dark:hover:bg-neutral-900">
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">{children}</main>
    </MotionProvider>
  );
}
