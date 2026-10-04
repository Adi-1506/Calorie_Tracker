"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(auth)/actions";
import { PASSWORD_MIN } from "@/lib/security/password";
import { initialFormState, resetPasswordSchema } from "@/lib/validation/auth";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "./form-parts";

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(resetPasswordSchema);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters.`}
        errors={errorsFor("password", state, clientErrors)}
      />
      <Field
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        errors={errorsFor("confirmPassword", state, clientErrors)}
      />
      <SubmitButton>Save new password</SubmitButton>
    </form>
  );
}
