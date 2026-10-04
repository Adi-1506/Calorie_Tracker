import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from "./redirect";

describe("safeRedirectPath (item 25)", () => {
  it("keeps allow-listed in-app paths", () => {
    expect(safeRedirectPath("/app")).toBe("/app");
    expect(safeRedirectPath("/app/log?day=2026-10-04")).toBe("/app/log?day=2026-10-04");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/login",
    "/application",
    "/app/../admin",
    " /app",
    "",
    undefined,
    null,
    42,
  ])("rejects %s", (input) => {
    expect(safeRedirectPath(input)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("normalises traversal back into the allow-list check", () => {
    expect(safeRedirectPath("/app/../app/settings")).toBe("/app/settings");
  });
});
