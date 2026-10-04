"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/(auth)/actions";
import { PASSWORD_MIN } from "@/lib/security/password";
import { initialFormState, signupSchema } from "@/lib/validation/auth";
import { Checkbox, errorsFor, Field, FormMessage, Honeypot, SubmitButton, useClientValidation } from "./form-parts";
import { Turnstile } from "./turnstile";

export function SignupForm({ siteKey, nonce }: { siteKey?: string; nonce?: string }) {
  const [state, action] = useActionState(signup, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(signupSchema);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <FormMessage state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" errors={errorsFor("email", state, clientErrors)} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters. A short phrase is easier to remember.`}
        errors={errorsFor("password", state, clientErrors)}
      />
      <Checkbox name="ageConfirmed" errors={errorsFor("ageConfirmed", state, clientErrors)}>
        I confirm I am at least 13 years old.
      </Checkbox>
      <Checkbox name="consent" errors={errorsFor("consent", state, clientErrors)}>
        I agree to the{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        , and I consent to my health data (such as weight and food logs) being stored to provide the service.
      </Checkbox>
      <Honeypot />
      <Turnstile siteKey={siteKey} nonce={nonce} />
      <SubmitButton>Create free account</SubmitButton>
    </form>
  );
}
