"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/app/settings/actions";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { deleteAccountSchema } from "@/lib/validation/account";
import { initialFormState } from "@/lib/validation/auth";

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(deleteAccount, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(deleteAccountSchema);

  if (!open) {
    return (
      <button type="button" className="btn btn-sm self-start border-chili text-chili" onClick={() => setOpen(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field name="password" label="Your password" type="password" autoComplete="current-password" errors={errorsFor("password", state, clientErrors)} />
      <Field
        name="confirm"
        label="Type DELETE to confirm"
        autoComplete="off"
        hint="This can't be undone."
        errors={errorsFor("confirm", state, clientErrors)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn-danger">Delete everything</SubmitButton>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
