import { describe, expect, it } from "vitest";
import { contactSchema } from "./contact";

const ok = { name: "Asha", email: "Asha@Example.com ", message: "How do I add a recipe?" };

describe("contactSchema", () => {
  it("accepts a normal message and normalises the email", () => {
    const r = contactSchema.safeParse(ok);
    expect(r.success && r.data.email).toBe("asha@example.com");
  });
  it("rejects short or huge messages and bad emails", () => {
    expect(contactSchema.safeParse({ ...ok, message: "hi" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, message: "a".repeat(5001) }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
  });
  it("rejects a filled honeypot", () => {
    expect(contactSchema.safeParse({ ...ok, website: "spam.example" }).success).toBe(false);
  });
});
