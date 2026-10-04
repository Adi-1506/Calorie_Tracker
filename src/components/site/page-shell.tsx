import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/** Standard marketing page: breadcrumbs, a heading with the main CTA, then content. */
export function PageShell({
  crumbs,
  title,
  intro,
  children,
  cta = true,
}: {
  crumbs: Crumb[];
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  cta?: boolean;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={crumbs} />
        <h1 className="font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
        {intro && <div className="max-w-2xl text-lg text-muted">{intro}</div>}
        {cta && (
          <div>
            <a href="/signup" className="btn btn-primary min-h-12 px-5 text-base">
              Start tracking free
            </a>
          </div>
        )}
      </div>
      {children}
    </main>
  );
}
