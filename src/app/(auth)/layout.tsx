import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-semibold tracking-tight">
          Calorie Tracker
        </Link>
        <div className="rounded-2xl border border-neutral-200 p-6 shadow-sm dark:border-neutral-800">{children}</div>
      </div>
    </main>
  );
}
