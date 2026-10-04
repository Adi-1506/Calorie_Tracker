import type { Metadata } from "next";
import { NewRecipeForm } from "@/components/app/recipe-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New recipe | Calorie Tracker", robots: { index: false } };

export default async function NewRecipePage() {
  await requireUser();
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">New recipe</h1>
      <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <NewRecipeForm />
      </div>
    </div>
  );
}
