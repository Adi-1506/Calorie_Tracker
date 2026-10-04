import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/security/password";

// Shared by the forms (client) and the Server Actions (server) — security item 14.
// Each schema lists exactly the fields it accepts; anything else is dropped (item 8).

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`);

// Hidden field real people never fill in (security item 12).
const honeypot = z.string().max(0).optional().or(z.literal(""));
const turnstileToken = z.string().max(4096).optional();
const checkbox = z.literal("on", { error: "This is required" });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
  next: z.string().max(512).optional(),
  website: honeypot,
  "cf-turnstile-response": turnstileToken,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  ageConfirmed: checkbox,
  consent: checkbox,
  website: honeypot,
  "cf-turnstile-response": turnstileToken,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  website: honeypot,
  "cf-turnstile-response": turnstileToken,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().max(PASSWORD_MAX),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type FieldErrors = Partial<Record<string, string[]>>;

export type FormState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: FieldErrors }
  | { status: "success"; message: string };

export const initialFormState: FormState = { status: "idle" };
