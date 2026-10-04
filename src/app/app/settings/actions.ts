"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";

/** Hide-numbers mode (security item 49): hides calories and weights across the app. */
export async function setHideNumbers(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const hide = formData.get("hide") === "1";
  await supabase.from("profiles").update({ hide_numbers: hide }).eq("id", user.id);
  refresh();
}
