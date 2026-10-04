import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center font-display text-2xl font-extrabold tracking-tight">
          Calorie Tracker<span className="text-turmeric">.</span>
        </Link>
        <div className="card p-5 sm:p-7">{children}</div>
      </div>
    </main>
  );
}
