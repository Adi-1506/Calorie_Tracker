import { describe, expect, it } from "vitest";
import { deleteAccountSchema } from "./account";

describe("deleteAccountSchema", () => {
  it("accepts a password and DELETE", () => {
    expect(deleteAccountSchema.safeParse({ password: "hunter2hunter2", confirm: " DELETE " }).success).toBe(true);
  });

  it("requires the exact word in capitals", () => {
    expect(deleteAccountSchema.safeParse({ password: "x", confirm: "delete" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: "x", confirm: "" }).success).toBe(false);
  });

  it("requires a password", () => {
    expect(deleteAccountSchema.safeParse({ password: "", confirm: "DELETE" }).success).toBe(false);
  });
});
