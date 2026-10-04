import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./site-url";

describe("normalizeSiteUrl", () => {
  it("adds https:// when missing", () => {
    expect(normalizeSiteUrl("kalo-app.vercel.app")).toBe("https://kalo-app.vercel.app");
  });
  it("keeps an existing scheme and drops trailing slashes", () => {
    expect(normalizeSiteUrl("https://kalo-app.vercel.app/")).toBe("https://kalo-app.vercel.app");
    expect(normalizeSiteUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });
  it("treats blank as unset", () => {
    expect(normalizeSiteUrl("  ")).toBeUndefined();
    expect(normalizeSiteUrl(undefined)).toBeUndefined();
  });
});
