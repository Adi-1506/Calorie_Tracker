import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "./csp";

describe("buildCsp (items 18, 38, 41)", () => {
  const csp = buildCsp("abc123", { supabaseUrl: "https://example.supabase.co" });

  it("requires the nonce for scripts and never allows inline or eval scripts in production", () => {
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("blocks framing, plugins and foreign form targets", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows the Supabase API for fetches", () => {
    expect(csp).toContain("connect-src 'self' https://example.supabase.co");
  });

  it("only allows eval in development", () => {
    expect(buildCsp("n", { isDev: true })).toContain("'unsafe-eval'");
  });

  it("creates a different nonce every time", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
