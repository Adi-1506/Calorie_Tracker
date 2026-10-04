import { describe, expect, it } from "vitest";
import { browserOptsOut, consentCookie, readConsent } from "./consent";

describe("cookie consent", () => {
  it("reads the stored choice", () => {
    expect(readConsent("a=1; kalo_consent=granted; b=2")).toBe("granted");
    expect(readConsent("kalo_consent=denied")).toBe("denied");
  });
  it("ignores missing or tampered values", () => {
    expect(readConsent("")).toBeNull();
    expect(readConsent("kalo_consent=yes")).toBeNull();
    expect(readConsent("xkalo_consent=granted")).toBeNull();
  });
  it("writes a year-long, SameSite cookie, Secure on https", () => {
    expect(consentCookie("granted", true)).toBe("kalo_consent=granted; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
    expect(consentCookie("denied", false)).not.toContain("Secure");
  });
  it("respects Do Not Track and Global Privacy Control", () => {
    expect(browserOptsOut({ doNotTrack: "1" })).toBe(true);
    expect(browserOptsOut({ globalPrivacyControl: true })).toBe(true);
    expect(browserOptsOut({ doNotTrack: "0" })).toBe(false);
  });
});
