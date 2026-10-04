import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { checkUrl, isPublicIp, safeLookup, UnsafeUrlError } = await import("./safe-fetch");

describe("isPublicIp", () => {
  it("blocks private, loopback, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "64:ff9b::a00:1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "151.101.1.69", "2606:4700::1111"]) expect(isPublicIp(ip), ip).toBe(true);
  });
});

describe("checkUrl", () => {
  it("rejects dangerous URLs before any request", () => {
    for (const url of ["file:///etc/passwd", "ftp://x.com", "http://localhost/", "http://127.0.0.1/", "http://[::1]/", "http://user:pw@example.com", "http://example.com:6379/", "http://metadata.google.internal/", "http://169.254.169.254/latest", "not a url"]) {
      expect(() => checkUrl(url), url).toThrow(UnsafeUrlError);
    }
  });
  it("accepts normal recipe links", () => {
    expect(checkUrl("https://www.example.com/recipes/sambar").hostname).toBe("www.example.com");
  });
});

describe("safeLookup", () => {
  it("refuses hostnames that resolve to private addresses", async () => {
    const err = await new Promise<Error | null>((resolve) => safeLookup("localhost", {}, (e) => resolve(e)));
    expect(err).toBeInstanceOf(UnsafeUrlError);
  });
});
