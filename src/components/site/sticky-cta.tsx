import Link from "next/link";

/**
 * Fixed "Start tracking free" bar on small screens. The marketing layout pads
 * the page so it never covers content, and it hides while the cookie banner
 * is open (see globals.css) so it never covers that either.
 */
export function StickyCta() {
  return (
    <div className="sticky-cta fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-surface p-3 sm:hidden">
      <Link href="/signup" className="btn btn-primary w-full min-h-12 text-base">
        Start tracking free
      </Link>
    </div>
  );
}
