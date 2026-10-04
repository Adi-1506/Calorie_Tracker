import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { decryptWith, encryptWith, parseKey } = await import("./health-crypto");

const key = randomBytes(32);

describe("health data encryption", () => {
  it("round-trips a value", () => {
    const payload = encryptWith(key, "72.4", "user-a");
    expect(payload).not.toContain("72.4");
    expect(decryptWith(key, payload, "user-a")).toBe("72.4");
  });

  it("uses a fresh IV every time", () => {
    expect(encryptWith(key, "72.4", "user-a")).not.toBe(encryptWith(key, "72.4", "user-a"));
  });

  it("refuses a ciphertext moved to another user", () => {
    const payload = encryptWith(key, "72.4", "user-a");
    expect(() => decryptWith(key, payload, "user-b")).toThrow();
  });

  it("detects tampering", () => {
    const [v, iv, tag, ct] = encryptWith(key, "72.4", "user-a").split(".");
    const flipped = Buffer.from(ct, "base64url");
    flipped[0] ^= 1;
    expect(() => decryptWith(key, [v, iv, tag, flipped.toString("base64url")].join("."), "user-a")).toThrow();
  });

  it("rejects the wrong key", () => {
    const payload = encryptWith(key, "72.4", "user-a");
    expect(() => decryptWith(randomBytes(32), payload, "user-a")).toThrow();
  });

  it("validates key length", () => {
    expect(() => parseKey(undefined)).toThrow();
    expect(() => parseKey(randomBytes(16).toString("base64"))).toThrow();
    expect(parseKey(key.toString("base64"))).toHaveLength(32);
  });
});
