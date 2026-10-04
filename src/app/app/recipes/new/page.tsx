import type { Metadata } from "next";
import { NewRecipeForm } from "@/components/app/recipe-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New recipe | Calorie Tracker", robots: { index: false } };

export default async function NewRecipePage() {
  await requireUser();
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-6 font-display text-[1.75rem] font-bold tracking-tight">New recipe</h1>
      <div className="card p-5 sm:p-6">
        <NewRecipeForm />
      </div>
    </div>
  );
}
