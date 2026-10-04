import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";

// Fetching user-supplied URLs (recipe import) without SSRF (security item 26):
//   * http(s) only, default ports only, no credentials in the URL
//   * every address a hostname resolves to must be public; the check runs in
//     the socket's own DNS lookup, so a DNS-rebinding answer can't slip past
//   * redirects are followed by hand (max 3) and each hop is checked again
//   * 5 s timeout, 2 MB body limit, HTML only

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

export class UnsafeUrlError extends Error {}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const n = ipv4ToInt(ip);
    return !V4_BLOCKS.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    if (lower === "::" || lower === "::1") return false;
    if (/^f[cd]/.test(lower)) return false; // unique local fc00::/7
    if (/^fe[89ab]/.test(lower)) return false; // link-local fe80::/10
    if (/^ff/.test(lower)) return false; // multicast
    if (lower.startsWith("64:ff9b:")) return false; // NAT64 can reach IPv4 internals
    if (lower.startsWith("2001:db8")) return false; // documentation
    return true;
  }
  return false;
}

/** Validates the URL shape before any network activity. */
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That isn't a valid link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UnsafeUrlError("Only http and https links work.");
  if (url.username || url.password) throw new UnsafeUrlError("Links with a username or password aren't allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Links with unusual ports aren't allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicIp(host)) throw new UnsafeUrlError("That address isn't allowed.");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("That address isn't allowed.");
  }
  return url;
}

/** DNS lookup used by the socket itself: refuses if any resolved address is private. */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as unknown as LookupAddress[];
    if (!list.length || list.some((a) => !isPublicIp(a.address))) {
      return callback(new UnsafeUrlError("That address isn't allowed."), "", 0);
    }
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function requestOnce(url: URL): Promise<{ status: number; location?: string; contentType: string; body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": "CalorieTracker/0.1 recipe importer", Accept: "text/html,application/xhtml+xml" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType, body: "" });
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy(new UnsafeUrlError("That page is too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new UnsafeUrlError("That site took too long to answer.")));
    req.on("error", reject);
    req.end();
  });
}

/** Fetches an HTML page from a user-supplied URL with SSRF protections. */
export async function safeFetchHtml(raw: string): Promise<{ url: string; html: string }> {
  let url = checkUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(url);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new UnsafeUrlError("That link redirects nowhere.");
      url = checkUrl(new URL(res.location, url).toString());
      continue;
    }
    if (res.status !== 200) throw new UnsafeUrlError("That page couldn't be loaded.");
    if (!/text\/html|application\/xhtml\+xml/i.test(res.contentType)) throw new UnsafeUrlError("That link isn't a web page.");
    return { url: url.toString(), html: res.body };
  }
  throw new UnsafeUrlError("That link redirects too many times.");
}
