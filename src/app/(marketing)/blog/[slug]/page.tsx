import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLd } from "@/components/site/json-ld";
import { getPost, POSTS } from "@/lib/site/blog";
import { siteUrl } from "@/lib/site/config";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} | Kalo`.length <= 60 ? `${post.title} | Kalo` : post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, url: `/blog/${post.slug}`, publishedTime: post.published },
  };
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const others = POSTS.filter((p) => p.slug !== post.slug);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs items={[{ href: "/blog", label: "Blog" }, { href: `/blog/${post.slug}`, label: post.title }]} />
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="max-w-3xl font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{post.title}</h1>
          <p className="text-sm text-muted">
            By the Kalo team · <time dateTime={post.published}>{dateFmt.format(new Date(post.published))}</time> · {post.readMinutes} min read
          </p>
          <div>
            <Link href="/signup" className="btn btn-primary min-h-12 px-5 text-base">
              Start tracking free
            </Link>
          </div>
        </header>
        <div className="prose-kalo">{post.body}</div>
      </article>
      {others.length > 0 && (
        <aside aria-labelledby="more-heading" className="flex flex-col gap-3">
          <h2 id="more-heading" className="font-display text-xl font-bold">
            Keep reading
          </h2>
          <ul className="flex flex-col gap-2">
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="link">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.published,
          author: { "@type": "Organization", name: "Kalo" },
          publisher: { "@type": "Organization", name: "Kalo" },
          mainEntityOfPage: `${siteUrl()}/blog/${post.slug}`,
        }}
      />
    </main>
  );
}
