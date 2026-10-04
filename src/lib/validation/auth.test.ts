import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "./auth";

const validSignup = {
  email: "  Person@Example.COM ",
  password: "a long passphrase",
  ageConfirmed: "on",
  consent: "on",
};

describe("auth validation (items 8, 12, 14, 23)", () => {
  it("normalises email and accepts a valid signup", () => {
    const result = signupSchema.parse(validSignup);
    expect(result.email).toBe("person@example.com");
  });

  it("drops fields that aren't on the allow-list (no mass assignment)", () => {
    const result = signupSchema.parse({ ...validSignup, role: "admin", is_premium: "true" });
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("is_premium");
  });

  it("requires 12+ character passwords", () => {
    expect(signupSchema.safeParse({ ...validSignup, password: "short pass" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...validSignup, password: "x".repeat(129) }).success).toBe(false);
  });

  it("requires age confirmation and consent", () => {
    expect(signupSchema.safeParse({ ...validSignup, ageConfirmed: undefined }).success).toBe(false);
    expect(signupSchema.safeParse({ ...validSignup, consent: undefined }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(signupSchema.safeParse({ ...validSignup, website: "http://spam" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x", website: "spam" }).success).toBe(false);
  });

  it("rejects malformed and oversized emails", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: `${"a".repeat(250)}@b.co` }).success).toBe(false);
  });

  it("requires matching passwords on reset", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "a long passphrase", confirmPassword: "different phrase" }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ password: "a long passphrase", confirmPassword: "a long passphrase" }).success,
    ).toBe(true);
  });
});
