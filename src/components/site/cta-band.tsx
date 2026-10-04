import Link from "next/link";

export function CtaBand({ title = "Start tracking today", text = "Free, private, and ready on any device in under a minute." }: { title?: string; text?: string }) {
  return (
    <section className="card flex flex-col items-start gap-4 bg-night p-6 text-on-night sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-1 text-night-muted">{text}</p>
      </div>
      <Link href="/signup" className="btn btn-primary min-h-12 shrink-0 px-5 text-base">
        Start tracking free
      </Link>
    </section>
  );
}
