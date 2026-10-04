import Link from "next/link";
import { siteUrl } from "@/lib/site/config";
import { JsonLd } from "./json-ld";

export type Crumb = { href: string; label: string };

/** Visible breadcrumbs plus matching BreadcrumbList JSON-LD. Home is added automatically. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ href: "/", label: "Home" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === all.length - 1 ? (
                <span aria-current="page" className="font-medium text-ink">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-ink hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: `${siteUrl()}${c.href === "/" ? "" : c.href}`,
          })),
        }}
      />
    </>
  );
}
