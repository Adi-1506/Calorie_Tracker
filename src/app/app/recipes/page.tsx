import type { Metadata } from "next";
import Link from "next/link";
import { ImportRecipeForm } from "@/components/app/recipe-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Recipes | Calorie Tracker", robots: { index: false } };

export default async function RecipesPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("recipes").select("id, name, servings").order("updated_at", { ascending: false }).limit(100);
  const recipes = data ?? [];
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your recipes</h1>
        <Link href="/app/recipes/new" className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
          New recipe
        </Link>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Build a dish from its ingredients once, then log a serving in one tap. Works for any cuisine.
      </p>
      <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <ImportRecipeForm />
      </section>
      {recipes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm dark:border-neutral-700">
          No recipes yet. Try your usual sambar, a smoothie, or a family pasta bake.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link href={`/app/recipes/${r.id}`} className="flex justify-between gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <span className="font-medium">{r.name}</span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {Number(r.servings)} {Number(r.servings) === 1 ? "serving" : "servings"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
