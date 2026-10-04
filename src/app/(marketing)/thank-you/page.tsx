import type { Metadata } from "next";
import Link from "next/link";
import { TrackEvent } from "@/components/site/track-event";
import { SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Thank you | Kalo",
  description: "Thanks for getting in touch with Kalo.",
  robots: { index: false },
};

export default async function ThankYouPage({ searchParams }: PageProps<"/thank-you">) {
  const from = (await searchParams).from;
  const contact = from === "contact";
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-5 px-4 py-16 sm:px-6">
      <p className="eyebrow">Thank you</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{contact ? "Message received." : "You're all set."}</h1>
      <p className="text-lg text-muted">{contact ? SITE.responsePromise : "Thanks for choosing Kalo."}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className="btn btn-primary min-h-12 px-5 text-base">
          Start tracking free
        </Link>
        <Link href="/blog" className="btn min-h-12 px-5 text-base">
          Read the blog
        </Link>
      </div>
      {contact && <TrackEvent event="generate_lead" />}
    </main>
  );
}
