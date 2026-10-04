import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { PageShell } from "@/components/site/page-shell";
import { getNonce, turnstileSiteKey } from "@/lib/nonce";
import { CONTACT, SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Contact Kalo: questions, feedback and support",
  description: "Questions, feedback or a food we're missing? Send Kalo a message. We reply to every message within 24 hours.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact Kalo", url: "/contact" },
};

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export default async function ContactPage() {
  const geo = CONTACT.geo;
  return (
    <PageShell crumbs={[{ href: "/contact", label: "Contact" }]} title="Get in touch" intro={SITE.responsePromise} cta={false}>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="form-heading" className="card p-5 sm:p-6">
          <h2 id="form-heading" className="sr-only">
            Send a message
          </h2>
          <ContactForm siteKey={turnstileSiteKey} nonce={await getNonce()} />
        </section>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="reach-heading" className="card-flat flex flex-col gap-2 p-5 text-sm">
            <h2 id="reach-heading" className="font-display text-lg font-bold">
              Other ways to reach us
            </h2>
            {CONTACT.email && (
              <p>
                Email:{" "}
                <a href={`mailto:${CONTACT.email}`} className="link">
                  {CONTACT.email}
                </a>
              </p>
            )}
            {CONTACT.phone && (
              <p>
                Phone:{" "}
                <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`} className="link">
                  {CONTACT.phone}
                </a>
              </p>
            )}
            {CONTACT.hours && <p>Hours: {CONTACT.hours}</p>}
            <p className="text-muted">{SITE.responsePromise}</p>
          </section>

          {CONTACT.address && (
            <section aria-labelledby="office-heading" className="card-flat flex flex-col gap-3 p-5 text-sm">
              <h2 id="office-heading" className="font-display text-lg font-bold">
                Office
              </h2>
              <address className="not-italic">{CONTACT.address}</address>
              {geo && (
                <iframe
                  title={`Map showing ${CONTACT.address}`}
                  className="aspect-[4/3] w-full rounded-xl border-2 border-ink"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lng - 0.01},${geo.lat - 0.006},${geo.lng + 0.01},${geo.lat + 0.006}&layer=mapnik&marker=${geo.lat},${geo.lng}`}
                />
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(geo ? `${geo.lat},${geo.lng}` : CONTACT.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm self-start"
              >
                Get directions<span className="sr-only"> (opens Google Maps)</span>
              </a>
            </section>
          )}

          <section aria-labelledby="near-heading" className="card-flat flex flex-col gap-3 p-5 text-sm">
            <h2 id="near-heading" className="font-display text-lg font-bold">
              Find help near you
            </h2>
            <p className="text-muted">Opens a map search around your location. We don&apos;t see what you search.</p>
            <a href={maps("registered dietitian near me")} target="_blank" rel="noopener noreferrer" className="btn btn-sm self-start">
              Find a nearby dietitian<span className="sr-only"> (opens Google Maps)</span>
            </a>
            <a href={maps("healthy food store near me")} target="_blank" rel="noopener noreferrer" className="btn btn-sm self-start">
              Find a healthy food store<span className="sr-only"> (opens Google Maps)</span>
            </a>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
