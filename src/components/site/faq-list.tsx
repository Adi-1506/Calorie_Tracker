import { JsonLd } from "./json-ld";

/** FAQ accordion (native details/summary, so it works without JavaScript) plus FAQPage JSON-LD. */
export function FaqList({ items, withSchema = true }: { items: readonly { q: string; a: string }[]; withSchema?: boolean }) {
  return (
    <>
      <div className="card rows px-5">
        {items.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden="true" className="shrink-0 text-xl transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      {withSchema && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }}
        />
      )}
    </>
  );
}
