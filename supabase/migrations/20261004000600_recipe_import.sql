-- Step 3b: recipe import. Ingredient lines from an imported page are kept on
-- the recipe as a to-do list until the user matches them to foods.
alter table public.recipes
  add column imported_ingredients text[] not null default '{}'
    check (cardinality(imported_ingredients) <= 60),
  add column site_calories_per_serving integer
    check (site_calories_per_serving between 1 and 10000);

grant update (imported_ingredients) on public.recipes to authenticated;
