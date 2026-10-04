"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/(auth)/actions";
import { initialFormState, loginSchema } from "@/lib/validation/auth";
import { errorsFor, Field, FormMessage, Honeypot, SubmitButton, useClientValidation } from "./form-parts";
import { Turnstile } from "./turnstile";

export function LoginForm({ next, siteKey, nonce }: { next?: string; siteKey?: string; nonce?: string }) {
  const [state, action] = useActionState(login, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(loginSchema);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <FormMessage state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" errors={errorsFor("email", state, clientErrors)} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        errors={errorsFor("password", state, clientErrors)}
      />
      <div className="-mt-2 text-right text-sm">
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot password?
        </Link>
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      <Honeypot />
      <Turnstile siteKey={siteKey} nonce={nonce} />
      <SubmitButton>Log in</SubmitButton>
    </form>
  );
}
