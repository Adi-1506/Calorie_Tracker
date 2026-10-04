"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { forgotPasswordSchema, initialFormState } from "@/lib/validation/auth";
import { errorsFor, Field, FormMessage, Honeypot, SubmitButton, useClientValidation } from "./form-parts";
import { Turnstile } from "./turnstile";

export function ForgotPasswordForm({ siteKey, nonce }: { siteKey?: string; nonce?: string }) {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(forgotPasswordSchema);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <FormMessage state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" errors={errorsFor("email", state, clientErrors)} />
      <Honeypot />
      <Turnstile siteKey={siteKey} nonce={nonce} />
      <SubmitButton>Send reset link</SubmitButton>
    </form>
  );
}
