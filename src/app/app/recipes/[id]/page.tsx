import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRecipe, dismissImportedLine, removeIngredient } from "@/app/app/actions";
import { AddIngredientRow, LogRecipeForm } from "@/components/app/recipe-forms";
import { requireUser } from "@/lib/auth";
import { getProfile, profileToday } from "@/lib/data/profile";
import { getRecipe } from "@/lib/data/recipes";
import { ingredientSearchTerm } from "@/lib/food/recipe-parse";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { searchQuerySchema } from "@/lib/validation/food";

export const metadata: Metadata = { title: "Recipe | Calorie Tracker", robots: { index: false } };

type FoodRow = { id: string; name: string; brand: string | null; calories: number };

export default async function RecipePage({ params, searchParams }: PageProps<"/app/recipes/[id]">) {
  const { user, supabase } = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const recipe = await getRecipe(supabase, id);
  if (!recipe) notFound();

  const profile = await getProfile(supabase, user.id);
  const today = profileToday(profile);
  const q = (await searchParams).q;
  const query = searchQuerySchema.safeParse(typeof q === "string" ? q : "");

  let results: (FoodRow & { servings: { id: string; label: string; grams: number }[] })[] = [];
  if (query.success && (await rateLimitUser("foodSearch", user.id))) {
    const { data } = await supabase.rpc("search_foods", { p_query: query.data, p_limit: 15 });
    const foods = (data ?? []) as FoodRow[];
    const { data: servings } = foods.length
      ? await supabase.from("food_servings").select("id, food_id, label, grams").in("food_id", foods.map((f) => f.id))
      : { data: [] };
    results = foods.map((f) => ({
      ...f,
      calories: Number(f.calories),
      servings: (servings ?? []).filter((s) => s.food_id === f.id).map((s) => ({ id: s.id, label: s.label, grams: Number(s.grams) })),
    }));
  }

  const ps = recipe.perServing;
  return (
    <>
      <div>
        <Link href="/app/recipes" className="text-sm underline underline-offset-4">
          ← All recipes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{recipe.name}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Makes {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
          {recipe.source_url && (
            <>
              {" · "}
              <a href={recipe.source_url} rel="noopener noreferrer nofollow" target="_blank" className="underline underline-offset-4">
                original recipe
              </a>
            </>
          )}
        </p>
      </div>

      <section aria-labelledby="per-serving" className="grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 p-4 sm:grid-cols-4 dark:border-neutral-800">
        <h2 id="per-serving" className="col-span-full text-sm font-semibold">
          Per serving
        </h2>
        {[
          ["Calories", `${Math.round(ps.calories)} kcal`],
          ["Protein", `${ps.protein_g.toFixed(1)} g`],
          ["Carbs", `${ps.carbs_g.toFixed(1)} g`],
          ["Fat", `${ps.fat_g.toFixed(1)} g`],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">{label}</div>
            <div className="text-lg font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      {recipe.site_calories_per_serving && (
        <p className="-mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          The original site says about {recipe.site_calories_per_serving} kcal per serving. Our number comes from the ingredients you add.
        </p>
      )}

      {recipe.imported_ingredients.length > 0 && (
        <section aria-labelledby="todo-heading" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h2 id="todo-heading" className="font-semibold">
            From the original recipe: match these to foods
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recipe.imported_ingredients.map((line, index) => (
              <li key={`${index}-${line}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1">{line}</span>
                <a href={`/app/recipes/${recipe.id}?${new URLSearchParams({ q: ingredientSearchTerm(line) || line.slice(0, 60) })}#q`} className="underline underline-offset-4">
                  Find
                </a>
                <form action={dismissImportedLine}>
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <input type="hidden" name="index" value={index} />
                  <button className="rounded px-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900" aria-label={`Mark ${line} as done`}>
                    Done
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="log-heading" className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 id="log-heading" className="mb-3 font-semibold">
          Log this recipe today
        </h2>
        <LogRecipeForm recipeId={recipe.id} date={today} defaultMeal="lunch" />
      </section>

      <section aria-labelledby="ing-heading" className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 id="ing-heading" className="font-semibold">
          Ingredients ({Math.round(recipe.total.calories)} kcal in total)
        </h2>
        {recipe.ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Search below to add the first ingredient.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
            {recipe.ingredients.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {i.food.name} · {i.grams} g
                </span>
                <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                  {Math.round((Number(i.food.calories) * i.grams) / 100)} kcal
                </span>
                <form action={removeIngredient}>
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <input type="hidden" name="ingredientId" value={i.id} />
                  <button aria-label={`Remove ${i.food.name}`} className="rounded px-2 py-1 text-neutral-500 hover:text-red-700">
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form role="search" action={`/app/recipes/${recipe.id}`} className="mt-4 flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search ingredients
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query.success ? query.data : ""}
            placeholder="Add an ingredient: rice, toor dal, olive oil…"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
          <button className="rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700">Search</button>
        </form>
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
            {results.map((f) => (
              <AddIngredientRow key={f.id} recipeId={recipe.id} food={f} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          Missing something? <Link href="/app/foods/new" className="underline underline-offset-4">Create a custom food</Link>, then add it here.
        </p>
      </section>

      <form action={deleteRecipe}>
        <input type="hidden" name="recipeId" value={recipe.id} />
        <button className="text-sm text-red-700 underline underline-offset-4 dark:text-red-400">Delete recipe</button>
      </form>
    </>
  );
}
