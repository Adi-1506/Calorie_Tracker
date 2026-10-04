import { describe, expect, it, vi } from "vitest";
import { isPwnedPassword, sha1Hex } from "./password";

async function hibpResponse(phrase: string, count: number) {
  const suffix = (await sha1Hex(phrase)).slice(5);
  return `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${suffix}:${count}\r\nFFFFF00000000000000000000000000000:0`;
}

describe("isPwnedPassword (item 23)", () => {
  it("sends only the 5-character hash prefix", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    await isPwnedPassword("correct horse battery staple", fetchMock as unknown as typeof fetch);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
  });

  it("hashes the same way as HIBP", async () => {
    const fetchMock = vi.fn(async () => new Response(""));
    await isPwnedPassword("password123456", fetchMock as unknown as typeof fetch);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/\/range\/98A16$/);
  });

  it("detects a breached password", async () => {
    const fetchMock = vi.fn(async () => new Response(await hibpResponse("password123456", 1234)));
    expect(await isPwnedPassword("password123456", fetchMock as unknown as typeof fetch)).toBe(true);
  });

  it("ignores padding entries with a zero count", async () => {
    const fetchMock = vi.fn(async () => new Response(await hibpResponse("unique-phrase-for-test", 0)));
    expect(await isPwnedPassword("unique-phrase-for-test", fetchMock as unknown as typeof fetch)).toBe(false);
  });

  it("fails open when the API is unreachable", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(await isPwnedPassword("anything-at-all-123", fetchMock as unknown as typeof fetch)).toBe(false);
  });
});
