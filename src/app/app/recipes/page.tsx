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
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Your recipes</h1>
        <Link href="/app/recipes/new" className="btn btn-primary">
          New recipe
        </Link>
      </div>
      <p className="text-sm text-muted">
        Build a dish from its ingredients once, then log a serving in one tap. Works for any cuisine.
      </p>
      <section className="card p-4 sm:p-5">
        <ImportRecipeForm />
      </section>
      {recipes.length === 0 ? (
        <p className="rounded-[20px] border-2 border-dashed border-ink p-6 text-center text-sm">
          No recipes yet. Try your usual sambar, a smoothie, or a family pasta bake.
        </p>
      ) : (
        <ul className="card rows overflow-hidden">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link href={`/app/recipes/${r.id}`} className="flex justify-between gap-3 px-4 py-3.5 hover:bg-well">
                <span className="font-medium">{r.name}</span>
                <span className="text-sm text-muted">
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
