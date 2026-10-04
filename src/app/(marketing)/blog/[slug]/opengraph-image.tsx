import { getPost, POSTS } from "@/lib/site/blog";
import { OG_SIZE, ogImage } from "@/lib/site/og";

export const alt = "Kalo blog post";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return ogImage({ eyebrow: "Kalo blog", title: post?.title ?? "Kalo blog", subtitle: post ? `${post.readMinutes} min read` : undefined });
}
