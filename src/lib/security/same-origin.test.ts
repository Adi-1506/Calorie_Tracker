import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const h = (init: Record<string, string>) => new Headers(init);

describe("isSameOrigin", () => {
  it("accepts a matching origin", () => {
    expect(isSameOrigin(h({ origin: "https://example.com", host: "example.com" }))).toBe(true);
    expect(isSameOrigin(h({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("prefers the forwarded host behind a proxy", () => {
    expect(isSameOrigin(h({ origin: "https://app.example.com", host: "internal:8080", "x-forwarded-host": "app.example.com" }))).toBe(true);
  });
  it("rejects other or missing origins", () => {
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "example.com" }))).toBe(false);
    expect(isSameOrigin(h({ host: "example.com" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "null", host: "example.com" }))).toBe(false);
  });
});
