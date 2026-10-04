"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/(marketing)/contact/actions";
import { errorsFor, Field, FormMessage, Honeypot, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { Turnstile } from "@/components/auth/turnstile";
import { initialFormState } from "@/lib/validation/auth";
import { contactSchema } from "@/lib/validation/contact";

export function ContactForm({ siteKey, nonce }: { siteKey?: string; nonce?: string }) {
  const [state, action] = useActionState(sendContactMessage, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(contactSchema);
  const messageErrors = errorsFor("message", state, clientErrors);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <FormMessage state={state} />
      <Field name="name" label="Your name" autoComplete="name" errors={errorsFor("name", state, clientErrors)} />
      <Field name="email" label="Email" type="email" autoComplete="email" errors={errorsFor("email", state, clientErrors)} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-semibold">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          maxLength={5000}
          aria-invalid={messageErrors?.length ? true : undefined}
          aria-describedby={messageErrors?.length ? "message-error" : undefined}
          className="input resize-y"
        />
        {messageErrors?.length ? (
          <p id="message-error" className="text-sm text-danger">
            {messageErrors[0]}
          </p>
        ) : null}
      </div>
      <Honeypot />
      <Turnstile siteKey={siteKey} nonce={nonce} />
      <SubmitButton>Send message</SubmitButton>
    </form>
  );
}
