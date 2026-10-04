import { getNonce } from "@/lib/nonce";

/**
 * Structured data for search engines. JSON is escaped so a "<" in any value
 * can't close the script tag early.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const nonce = await getNonce();
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // JSON-LD must be raw text (React would HTML-escape children); the value is our own data with "<" escaped above.
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />;
}
