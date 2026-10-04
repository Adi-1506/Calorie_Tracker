import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseEnv } from "./env-parse";

describe("parseEnv", () => {
  const schema = z.object({ key: z.string().min(1), salt: z.string().min(16) });
  const names = { key: "SUPABASE_SERVICE_ROLE_KEY", salt: "IP_HASH_SALT" };

  it("names missing variables without printing values", () => {
    expect(() => parseEnv(schema, { key: undefined, salt: "short-secret" }, names)).toThrow(
      /Missing or invalid environment variables: SUPABASE_SERVICE_ROLE_KEY, IP_HASH_SALT\. Copy \.env\.example to \.env\.local/,
    );
    try {
      parseEnv(schema, { key: undefined, salt: "short-secret" }, names);
    } catch (e) {
      expect(String(e)).not.toContain("short-secret");
    }
  });

  it("returns parsed values when valid", () => {
    expect(parseEnv(schema, { key: "k", salt: "x".repeat(16) }, names)).toEqual({ key: "k", salt: "x".repeat(16) });
  });
});
