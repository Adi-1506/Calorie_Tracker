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

export const metadata: Metadata = { title: "Recipe | Kalo", robots: { index: false } };

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
        <Link href="/app/recipes" className="text-sm link">
          ← All recipes
        </Link>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold tracking-tight">{recipe.name}</h1>
        <p className="text-sm text-muted">
          Makes {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
          {recipe.source_url && (
            <>
              {" · "}
              <a href={recipe.source_url} rel="noopener noreferrer nofollow" target="_blank" className="link">
                original recipe
              </a>
            </>
          )}
        </p>
      </div>

      <section aria-labelledby="per-serving" className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
        <h2 id="per-serving" className="eyebrow col-span-full">
          Per serving
        </h2>
        {[
          ["Calories", `${Math.round(ps.calories)} kcal`],
          ["Protein", `${ps.protein_g.toFixed(1)} g`],
          ["Carbs", `${ps.carbs_g.toFixed(1)} g`],
          ["Fat", `${ps.fat_g.toFixed(1)} g`],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="font-mono text-xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      {recipe.site_calories_per_serving && (
        <p className="-mt-3 text-xs text-muted">
          The original site says about {recipe.site_calories_per_serving} kcal per serving. Our number comes from the ingredients you add.
        </p>
      )}

      {recipe.imported_ingredients.length > 0 && (
        <section aria-labelledby="todo-heading" className="card-flat notice-warn p-4">
          <h2 id="todo-heading" className="font-semibold">
            From the original recipe: match these to foods
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recipe.imported_ingredients.map((line, index) => (
              <li key={`${index}-${line}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1">{line}</span>
                <a href={`/app/recipes/${recipe.id}?${new URLSearchParams({ q: ingredientSearchTerm(line) || line.slice(0, 60) })}#q`} className="link">
                  Find
                </a>
                <form action={dismissImportedLine}>
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <input type="hidden" name="index" value={index} />
                  <button className="btn btn-sm" aria-label={`Mark ${line} as done`}>
                    Done
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="log-heading" className="card p-4 sm:p-5">
        <h2 id="log-heading" className="mb-3 font-semibold">
          Log this recipe today
        </h2>
        <LogRecipeForm recipeId={recipe.id} date={today} defaultMeal="lunch" />
      </section>

      <section aria-labelledby="ing-heading" className="card p-4 sm:p-5">
        <h2 id="ing-heading" className="font-semibold">
          Ingredients ({Math.round(recipe.total.calories)} kcal in total)
        </h2>
        {recipe.ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Search below to add the first ingredient.</p>
        ) : (
          <ul className="mt-2 rows">
            {recipe.ingredients.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {i.food.name} · {i.grams} g
                </span>
                <span className="tabular-nums text-muted">
                  {Math.round((Number(i.food.calories) * i.grams) / 100)} kcal
                </span>
                <form action={removeIngredient}>
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <input type="hidden" name="ingredientId" value={i.id} />
                  <button aria-label={`Remove ${i.food.name}`} className="rounded px-2 py-1 text-muted hover:text-danger">
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
            className="input min-w-0 flex-1"
          />
          <button className="btn btn-ink">Search</button>
        </form>
        {results.length > 0 && (
          <ul className="mt-2 rows">
            {results.map((f) => (
              <AddIngredientRow key={f.id} recipeId={recipe.id} food={f} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          Missing something? <Link href="/app/foods/new" className="link">Create a custom food</Link>, then add it here.
        </p>
      </section>

      <form action={deleteRecipe}>
        <input type="hidden" name="recipeId" value={recipe.id} />
        <button className="link text-sm text-danger">Delete recipe</button>
      </form>
    </>
  );
}
