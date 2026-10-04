import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { POSTS } from "@/lib/site/blog";

export const metadata: Metadata = {
  title: "Blog: practical calorie and nutrition tips | Kalo",
  description: "Plain-language guides to calorie targets, logging home-cooked meals and making sense of your weight trend.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "Kalo blog", url: "/blog" },
};

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function BlogPage() {
  return (
    <PageShell crumbs={[{ href: "/blog", label: "Blog" }]} title="The Kalo blog" intro="Short, practical guides. No fad diets." cta={false}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {POSTS.map((p) => (
          <li key={p.slug} className="card flex flex-col gap-2 p-5">
            <p className="text-xs text-muted">
              <time dateTime={p.published}>{dateFmt.format(new Date(p.published))}</time> · {p.readMinutes} min read
            </p>
            <h2 className="font-display text-xl font-bold leading-snug">
              <Link href={`/blog/${p.slug}`} className="hover:underline">
                {p.title}
              </Link>
            </h2>
            <p className="text-sm text-muted">{p.description}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
