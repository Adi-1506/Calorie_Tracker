import { z } from "zod";
import { emailSchema } from "./auth";

// Contact form (spec section 2). Same schema on the client and in the action (item 14).
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Use at most 100 characters"),
  email: emailSchema,
  message: z.string().trim().min(10, "Write at least 10 characters").max(5000, "Use at most 5,000 characters"),
  website: z.string().max(0).optional().or(z.literal("")),
  "cf-turnstile-response": z.string().max(4096).optional(),
});
