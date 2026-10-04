import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { MotionProvider } from "@/components/app/motion-provider";
import { NavLinks } from "@/components/app/nav-links";
import { getNonce } from "@/lib/nonce";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <MotionProvider nonce={await getNonce()}>
      <header className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/app" className="font-display text-[1.375rem] font-extrabold tracking-tight">
            Calorie Tracker<span className="text-turmeric">.</span>
          </Link>
          <Link href="/app/log" className="btn btn-primary">
            + Log food
          </Link>
        </div>
        <nav aria-label="Main" className="mt-3 flex flex-wrap items-center gap-1">
          <NavLinks />
          <form action={logout} className="ml-auto">
            <button className="flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-muted hover:text-ink">Log out</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-12 sm:px-6">{children}</main>
    </MotionProvider>
  );
}
