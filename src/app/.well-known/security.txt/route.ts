import { CONTACT, siteUrl } from "@/lib/site/config";

// RFC 9116 security contact (security item 46).
export function GET() {
  const base = siteUrl();
  const expires = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1)).toISOString();
  const lines = [
    ...(CONTACT.email ? [`Contact: mailto:${CONTACT.email}`] : []),
    `Contact: ${base}/contact`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${base}/.well-known/security.txt`,
    `Policy: ${base}/privacy`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
