-- Step 3a: food logging.
--   * profiles.timezone so "today" matches the user's day, not the server's.
--   * Trigram search over the food catalogue and the user's own foods.
--   * A starter catalogue: everyday foods from around the world plus common
--     Indian dishes from many regions (with local names and portion sizes).
--     Values are per 100 g, typical reference values; anything can still be
--     found through Open Food Facts / USDA or added as a custom food.

alter table public.profiles
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64);
grant update (timezone) on public.profiles to authenticated;

create extension if not exists pg_trgm with schema extensions;

create index foods_name_trgm_idx on public.foods using gin (name extensions.gin_trgm_ops);
create index foods_name_local_trgm_idx on public.foods using gin (name_local extensions.gin_trgm_ops);

-- Runs with the caller's rights, so RLS decides which foods are visible:
-- the shared catalogue plus the caller's own custom foods.
create or replace function public.search_foods(p_query text, p_limit integer default 20)
returns setof public.foods
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      btrim(p_query) as raw,
      '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select f.*
  from public.foods f, q
  where char_length(q.raw) between 1 and 100
    and (f.name ilike q.pattern or f.name_local ilike q.pattern or f.brand ilike q.pattern)
  order by
    (f.owner_id is not null) desc,
    (f.name ilike q.raw || '%') desc,
    extensions.similarity(f.name, q.raw) desc,
    f.name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.search_foods(text, integer) from public, anon;
grant execute on function public.search_foods(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Starter catalogue
-- ---------------------------------------------------------------------------
insert into public.foods (external_id, source, name, name_local, region, calories, protein_g, carbs_g, fat_g, fiber_g)
values
  ('sys-egg-boiled', 'system', 'Egg, whole, boiled', null, null, 155, 12.6, 1.1, 10.6, 0),
  ('sys-egg-white', 'system', 'Egg white', null, null, 52, 10.9, 0.7, 0.2, 0),
  ('sys-rice-white', 'system', 'White rice, cooked', null, null, 130, 2.7, 28.2, 0.3, 0.4),
  ('sys-rice-brown', 'system', 'Brown rice, cooked', null, null, 123, 2.7, 25.6, 1.0, 1.6),
  ('sys-oats', 'system', 'Oats, rolled, dry', null, null, 379, 13.2, 67.7, 6.5, 10.1),
  ('sys-bread-wheat', 'system', 'Whole wheat bread', null, null, 252, 12.4, 42.7, 3.5, 6.0),
  ('sys-bread-white', 'system', 'White bread', null, null, 266, 8.9, 49.4, 3.3, 2.7),
  ('sys-pasta', 'system', 'Pasta, cooked', null, null, 158, 5.8, 30.9, 0.9, 1.8),
  ('sys-tortilla-corn', 'system', 'Corn tortilla', null, null, 218, 5.7, 44.6, 2.9, 6.3),
  ('sys-potato-boiled', 'system', 'Potato, boiled', null, null, 87, 1.9, 20.1, 0.1, 1.8),
  ('sys-sweet-potato', 'system', 'Sweet potato, baked', null, null, 90, 2.0, 20.7, 0.2, 3.3),
  ('sys-fries', 'system', 'French fries', null, null, 312, 3.4, 41.4, 14.7, 3.8),
  ('sys-pizza-cheese', 'system', 'Cheese pizza', null, null, 266, 11.4, 33.3, 9.7, 2.3),
  ('sys-banana', 'system', 'Banana', null, null, 89, 1.1, 22.8, 0.3, 2.6),
  ('sys-apple', 'system', 'Apple', null, null, 52, 0.3, 13.8, 0.2, 2.4),
  ('sys-orange', 'system', 'Orange', null, null, 47, 0.9, 11.8, 0.1, 2.4),
  ('sys-mango', 'system', 'Mango', null, null, 60, 0.8, 15.0, 0.4, 1.6),
  ('sys-avocado', 'system', 'Avocado', null, null, 160, 2.0, 8.5, 14.7, 6.7),
  ('sys-broccoli', 'system', 'Broccoli, cooked', null, null, 35, 2.4, 7.2, 0.4, 3.3),
  ('sys-chicken-breast', 'system', 'Chicken breast, cooked', null, null, 165, 31.0, 0, 3.6, 0),
  ('sys-salmon', 'system', 'Salmon, cooked', null, null, 206, 22.1, 0, 12.4, 0),
  ('sys-tuna-can', 'system', 'Tuna, canned in water', null, null, 116, 25.5, 0, 0.8, 0),
  ('sys-tofu', 'system', 'Tofu, firm', null, null, 144, 17.3, 2.8, 8.7, 2.3),
  ('sys-lentils', 'system', 'Lentils, cooked', null, null, 116, 9.0, 20.1, 0.4, 7.9),
  ('sys-chickpeas', 'system', 'Chickpeas, cooked', null, null, 164, 8.9, 27.4, 2.6, 7.6),
  ('sys-black-beans', 'system', 'Black beans, cooked', null, null, 132, 8.9, 23.7, 0.5, 8.7),
  ('sys-milk-whole', 'system', 'Milk, whole', null, null, 61, 3.2, 4.8, 3.3, 0),
  ('sys-milk-low-fat', 'system', 'Milk, low fat (1%)', null, null, 42, 3.4, 5.0, 1.0, 0),
  ('sys-greek-yogurt', 'system', 'Greek yogurt, plain, nonfat', null, null, 59, 10.2, 3.6, 0.4, 0),
  ('sys-cheddar', 'system', 'Cheddar cheese', null, null, 403, 24.9, 1.3, 33.1, 0),
  ('sys-butter', 'system', 'Butter', null, null, 717, 0.9, 0.1, 81.1, 0),
  ('sys-olive-oil', 'system', 'Olive oil', null, null, 884, 0, 0, 100, 0),
  ('sys-peanut-butter', 'system', 'Peanut butter', null, null, 588, 25.1, 20.0, 50.4, 6.0),
  ('sys-almonds', 'system', 'Almonds', null, null, 579, 21.2, 21.6, 49.9, 12.5),
  ('sys-sugar', 'system', 'Sugar', null, null, 387, 0, 100, 0, 0),
  ('sys-honey', 'system', 'Honey', null, null, 304, 0.3, 82.4, 0, 0.2),
  ('sys-coffee-black', 'system', 'Coffee, black', null, null, 1, 0.1, 0, 0, 0),
  ('sys-cola', 'system', 'Cola', null, null, 42, 0, 10.6, 0, 0),
  ('in-idli', 'indian_seed', 'Idli', null, 'south_india', 132, 4.5, 27.0, 0.4, 1.5),
  ('in-dosa-plain', 'indian_seed', 'Dosa, plain', null, 'south_india', 168, 3.9, 29.0, 3.7, 1.0),
  ('in-masala-dosa', 'indian_seed', 'Masala dosa', null, 'south_india', 170, 3.9, 25.0, 6.5, 1.8),
  ('in-medu-vada', 'indian_seed', 'Medu vada', null, 'south_india', 300, 9.0, 27.0, 17.0, 3.0),
  ('in-sambar', 'indian_seed', 'Sambar', null, 'south_india', 65, 3.0, 9.0, 2.0, 2.5),
  ('in-rasam', 'indian_seed', 'Rasam', null, 'tamil_nadu', 35, 1.5, 5.0, 1.0, 0.8),
  ('in-coconut-chutney', 'indian_seed', 'Coconut chutney', null, 'south_india', 220, 3.0, 9.0, 20.0, 5.0),
  ('in-upma', 'indian_seed', 'Upma', null, 'south_india', 140, 3.5, 20.0, 5.0, 1.5),
  ('in-pongal', 'indian_seed', 'Ven pongal', 'பொங்கல்', 'tamil_nadu', 150, 4.0, 20.0, 6.0, 1.2),
  ('in-poha', 'indian_seed', 'Poha', null, 'maharashtra', 150, 3.0, 25.0, 4.0, 1.5),
  ('in-chapati', 'indian_seed', 'Chapati / roti', null, 'north_india', 297, 9.0, 46.0, 8.5, 4.9),
  ('in-paratha', 'indian_seed', 'Paratha, plain', null, 'north_india', 326, 6.4, 45.0, 13.5, 4.0),
  ('in-aloo-paratha', 'indian_seed', 'Aloo paratha', null, 'punjab', 260, 5.5, 34.0, 11.5, 3.0),
  ('in-dal-tadka', 'indian_seed', 'Dal tadka (toor dal)', null, 'north_india', 110, 6.0, 15.0, 3.0, 3.0),
  ('in-rajma', 'indian_seed', 'Rajma curry', null, 'punjab', 130, 5.5, 15.0, 5.0, 5.0),
  ('in-chole', 'indian_seed', 'Chole (chickpea curry)', null, 'punjab', 150, 6.5, 18.0, 6.0, 6.0),
  ('in-khichdi', 'indian_seed', 'Khichdi', null, 'north_india', 120, 4.5, 20.0, 2.5, 2.0),
  ('in-paneer', 'indian_seed', 'Paneer', null, 'north_india', 265, 18.3, 1.2, 20.8, 0),
  ('in-palak-paneer', 'indian_seed', 'Palak paneer', null, 'punjab', 150, 7.0, 6.0, 11.0, 2.0),
  ('in-paneer-butter-masala', 'indian_seed', 'Paneer butter masala', null, 'punjab', 220, 8.0, 8.0, 17.0, 1.5),
  ('in-butter-chicken', 'indian_seed', 'Butter chicken', null, 'punjab', 175, 13.0, 6.0, 11.0, 1.0),
  ('in-chicken-biryani', 'indian_seed', 'Chicken biryani', null, 'hyderabad', 165, 9.0, 20.0, 5.5, 1.0),
  ('in-veg-biryani', 'indian_seed', 'Vegetable biryani', null, 'hyderabad', 150, 3.5, 23.0, 5.0, 2.0),
  ('in-egg-curry', 'indian_seed', 'Egg curry', null, null, 150, 8.0, 5.0, 11.0, 1.0),
  ('in-curd', 'indian_seed', 'Curd / dahi', null, null, 60, 3.1, 4.7, 3.3, 0),
  ('in-samosa', 'indian_seed', 'Samosa', null, 'north_india', 290, 5.0, 30.0, 17.0, 2.5),
  ('in-vada-pav', 'indian_seed', 'Vada pav', null, 'maharashtra', 210, 5.0, 30.0, 8.0, 2.0),
  ('in-pav-bhaji', 'indian_seed', 'Pav bhaji (bhaji only)', null, 'maharashtra', 120, 2.5, 13.0, 6.5, 3.0),
  ('in-dhokla', 'indian_seed', 'Dhokla', null, 'gujarat', 160, 6.0, 24.0, 4.5, 1.5),
  ('in-momos-veg', 'indian_seed', 'Veg momos, steamed', null, 'north_east', 140, 4.5, 22.0, 3.5, 1.5),
  ('in-gulab-jamun', 'indian_seed', 'Gulab jamun', null, null, 375, 5.0, 55.0, 15.0, 0.5),
  ('in-masala-chai', 'indian_seed', 'Masala chai (milk and sugar)', null, null, 55, 1.8, 7.5, 2.0, 0),
  ('in-filter-coffee', 'indian_seed', 'Filter coffee (milk and sugar)', null, 'south_india', 60, 2.0, 8.0, 2.0, 0),
  ('in-lassi-sweet', 'indian_seed', 'Lassi, sweet', null, 'punjab', 90, 3.0, 14.0, 2.5, 0),
  ('in-matta-rice', 'indian_seed', 'Kerala matta rice, cooked', 'കുത്തരി ചോറ്', 'kerala', 120, 2.5, 26.0, 0.5, 1.6),
  ('in-appam', 'indian_seed', 'Appam', 'അപ്പം', 'kerala', 190, 3.0, 36.0, 3.5, 1.0),
  ('in-puttu', 'indian_seed', 'Puttu', 'പുട്ട്', 'kerala', 180, 3.5, 36.0, 2.5, 2.0),
  ('in-kadala-curry', 'indian_seed', 'Kadala curry', 'കടല കറി', 'kerala', 140, 6.5, 14.0, 6.5, 6.0),
  ('in-avial', 'indian_seed', 'Avial', 'അവിയൽ', 'kerala', 110, 2.5, 8.0, 7.5, 3.0),
  ('in-kerala-fish-curry', 'indian_seed', 'Kerala fish curry', 'മീൻ കറി', 'kerala', 120, 12.0, 3.0, 6.5, 0.5),
  ('in-fish-fry', 'indian_seed', 'Fish fry, Kerala style', 'മീൻ വറുത്തത്', 'kerala', 220, 20.0, 5.0, 13.5, 0.5),
  ('in-banana-chips', 'indian_seed', 'Banana chips', 'ഉപ്പേരി', 'kerala', 520, 2.3, 56.0, 31.0, 4.0)
on conflict (source, external_id) where external_id is not null do nothing;

insert into public.food_servings (food_id, label, grams)
select f.id, s.label, s.grams
from (values
  ('sys-egg-boiled', '1 large egg', 50),
  ('sys-egg-white', '1 large egg white', 33),
  ('sys-rice-white', '1 cup', 158),
  ('sys-rice-brown', '1 cup', 195),
  ('sys-oats', '1/2 cup', 40),
  ('sys-bread-wheat', '1 slice', 32),
  ('sys-bread-white', '1 slice', 28),
  ('sys-pasta', '1 cup', 140),
  ('sys-tortilla-corn', '1 tortilla', 26),
  ('sys-potato-boiled', '1 medium', 150),
  ('sys-sweet-potato', '1 medium', 130),
  ('sys-fries', '1 medium serving', 117),
  ('sys-pizza-cheese', '1 slice', 107),
  ('sys-banana', '1 medium', 118),
  ('sys-apple', '1 medium', 182),
  ('sys-orange', '1 medium', 131),
  ('sys-mango', '1 cup, sliced', 165),
  ('sys-avocado', '1/2 avocado', 68),
  ('sys-broccoli', '1 cup', 156),
  ('sys-chicken-breast', '1 breast', 120),
  ('sys-salmon', '1 fillet', 150),
  ('sys-tuna-can', '1 can, drained', 142),
  ('sys-tofu', '1/2 block', 150),
  ('sys-lentils', '1 cup', 198),
  ('sys-chickpeas', '1 cup', 164),
  ('sys-black-beans', '1 cup', 172),
  ('sys-milk-whole', '1 cup', 244),
  ('sys-milk-low-fat', '1 cup', 244),
  ('sys-greek-yogurt', '1 cup', 170),
  ('sys-cheddar', '1 slice', 28),
  ('sys-butter', '1 tbsp', 14),
  ('sys-olive-oil', '1 tbsp', 13.5),
  ('sys-peanut-butter', '1 tbsp', 16),
  ('sys-almonds', '1 handful', 28),
  ('sys-sugar', '1 tsp', 4),
  ('sys-honey', '1 tbsp', 21),
  ('sys-coffee-black', '1 cup', 240),
  ('sys-cola', '1 can (330 ml)', 340),
  ('in-idli', '1 idli', 40),
  ('in-dosa-plain', '1 medium dosa', 90),
  ('in-masala-dosa', '1 masala dosa', 175),
  ('in-medu-vada', '1 vada', 45),
  ('in-sambar', '1 katori', 150),
  ('in-rasam', '1 katori', 150),
  ('in-coconut-chutney', '2 tbsp', 30),
  ('in-upma', '1 plate', 200),
  ('in-pongal', '1 katori', 150),
  ('in-poha', '1 plate', 150),
  ('in-chapati', '1 roti', 40),
  ('in-paratha', '1 paratha', 80),
  ('in-aloo-paratha', '1 paratha', 100),
  ('in-dal-tadka', '1 katori', 150),
  ('in-rajma', '1 katori', 150),
  ('in-chole', '1 katori', 150),
  ('in-khichdi', '1 katori', 200),
  ('in-paneer', '100 g', 100),
  ('in-palak-paneer', '1 katori', 150),
  ('in-paneer-butter-masala', '1 katori', 150),
  ('in-butter-chicken', '1 katori', 150),
  ('in-chicken-biryani', '1 plate', 300),
  ('in-veg-biryani', '1 plate', 300),
  ('in-egg-curry', '1 katori (2 eggs)', 200),
  ('in-curd', '1 katori', 150),
  ('in-samosa', '1 samosa', 70),
  ('in-vada-pav', '1 vada pav', 140),
  ('in-pav-bhaji', '1 katori', 150),
  ('in-dhokla', '1 piece', 30),
  ('in-momos-veg', '1 momo', 30),
  ('in-gulab-jamun', '1 piece', 40),
  ('in-masala-chai', '1 cup', 150),
  ('in-filter-coffee', '1 tumbler', 150),
  ('in-lassi-sweet', '1 glass', 250),
  ('in-matta-rice', '1 cup', 160),
  ('in-appam', '1 appam', 50),
  ('in-puttu', '1 piece', 100),
  ('in-kadala-curry', '1 katori', 150),
  ('in-avial', '1 katori', 150),
  ('in-kerala-fish-curry', '1 katori', 150),
  ('in-fish-fry', '1 piece', 80),
  ('in-banana-chips', '1 handful', 30)
) as s (external_id, label, grams)
join public.foods f on f.external_id = s.external_id and f.owner_id is null
where not exists (select 1 from public.food_servings x where x.food_id = f.id and x.label = s.label);
