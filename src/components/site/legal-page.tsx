import type { ReactNode } from "react";
import { PageShell } from "./page-shell";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function LegalPage({ href, title, updated, children }: { href: string; title: string; updated: string; children: ReactNode }) {
  return (
    <PageShell crumbs={[{ href, label: title }]} title={title} intro={<>Last updated <time dateTime={updated}>{dateFmt.format(new Date(updated))}</time></>} cta={false}>
      <div className="prose-kalo">{children}</div>
    </PageShell>
  );
}

/** "email us at x" when an address is configured, otherwise the contact form. */
export function ContactLine({ email }: { email?: string }) {
  return email ? (
    <>
      email us at <a href={`mailto:${email}`}>{email}</a> or use our <a href="/contact">contact form</a>
    </>
  ) : (
    <>
      use our <a href="/contact">contact form</a>
    </>
  );
}
