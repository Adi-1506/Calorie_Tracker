import "server-only";
import { z } from "zod";

// Clients for public food databases. Everything that comes back is validated
// and clamped before use; external data is never trusted as-is.
//   * Open Food Facts: packaged products from around the world, no key needed.
//   * USDA FoodData Central: generic and branded foods. Uses USDA_API_KEY, or the
//     shared DEMO_KEY (heavily rate limited) when none is set.

export type ExternalSource = "open_food_facts" | "usda";

export type ExternalFood = {
  source: ExternalSource;
  externalId: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
  };
  serving: { label: string; grams: number } | null;
};

const OFF_BASE = "https://world.openfoodfacts.org";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USER_AGENT = "CalorieTracker/0.1 (https://github.com/Adi-1506/Calorie_Tracker)";
const TIMEOUT_MS = 5000;
const OFF_FIELDS = "code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,countries_tags";

type Fetch = typeof fetch;

const num = z.coerce.number().refine(Number.isFinite);
const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max))
    .optional()
    .catch(undefined);

/** Product names are often SHOUTED ("MAGGI 2-MINUTE NOODLES"). Tidy all-caps words only. */
export function tidyName(s: string) {
  return s.replace(/\b[A-Z][A-Z'&-]+\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase());
}

function clampNutrient(value: unknown, max: number): number | null {
  const parsed = num.safeParse(value);
  if (!parsed.success || parsed.data < 0) return null;
  return Math.min(Math.round(parsed.data * 100) / 100, max);
}

function finish(food: Omit<ExternalFood, "per100g"> & { per100g: Record<keyof ExternalFood["per100g"], number | null> }): ExternalFood | null {
  const { calories, protein_g, carbs_g, fat_g } = food.per100g;
  // Energy is the one field we can't do without; reject impossible values.
  if (calories == null || calories > 900 || !food.name) return null;
  return {
    ...food,
    per100g: {
      ...food.per100g,
      calories,
      protein_g: protein_g ?? 0,
      carbs_g: carbs_g ?? 0,
      fat_g: fat_g ?? 0,
    },
  };
}

async function getJson(url: string, fetchImpl: Fetch): Promise<unknown> {
  const res = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "error",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Open Food Facts
// ---------------------------------------------------------------------------
const offProduct = z.object({
  code: z.string().regex(/^[0-9]{1,14}$/),
  product_name: text(200),
  product_name_en: text(200),
  brands: z
    .union([z.string(), z.array(z.string()).transform((a) => a.join(","))])
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120))
    .optional()
    .catch(undefined),
  serving_size: text(60),
  serving_quantity: z.unknown().optional(),
  nutriments: z.record(z.string(), z.unknown()).default({}),
});

export function normalizeOff(raw: unknown): ExternalFood | null {
  const parsed = offProduct.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  const n = p.nutriments;
  const kcal = n["energy-kcal_100g"] ?? (typeof n["energy_100g"] === "number" ? Number(n["energy_100g"]) / 4.184 : undefined);
  const sodiumG = clampNutrient(n["sodium_100g"], 100);
  const servingGrams = clampNutrient(p.serving_quantity, 5000);
  return finish({
    source: "open_food_facts",
    externalId: p.code,
    name: tidyName(p.product_name || p.product_name_en || ""),
    brand: tidyName(p.brands?.split(",")[0]?.trim() ?? "") || null,
    barcode: /^[0-9]{8,14}$/.test(p.code) ? p.code : null,
    per100g: {
      calories: clampNutrient(kcal, 10000),
      protein_g: clampNutrient(n["proteins_100g"], 100),
      carbs_g: clampNutrient(n["carbohydrates_100g"], 100),
      fat_g: clampNutrient(n["fat_100g"], 100),
      fiber_g: clampNutrient(n["fiber_100g"], 100),
      sugar_g: clampNutrient(n["sugars_100g"], 100),
      sodium_mg: sodiumG == null ? null : Math.round(sodiumG * 1000 * 100) / 100,
    },
    serving: servingGrams && servingGrams > 0 ? { label: p.serving_size || `${servingGrams} g`, grams: servingGrams } : null,
  });
}

const OFF_SEARCH = "https://search.openfoodfacts.org/search";

const LATIN_TEXT = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

export type SearchOptions = {
  /** Open Food Facts country tag to rank first, e.g. "en:india". */
  country?: string;
};

/** Higher is better: products sold in the user's country, then names in Latin script. */
function offScore(raw: unknown, country?: string) {
  const r = (raw ?? {}) as { countries_tags?: unknown; product_name?: unknown };
  const tags = Array.isArray(r.countries_tags) ? r.countries_tags : [];
  const name = typeof r.product_name === "string" ? r.product_name : "";
  return (country && tags.includes(country) ? 2 : 0) + (LATIN_TEXT.test(name) ? 1 : 0);
}

function productsFrom(data: unknown, key: "hits" | "products", options: SearchOptions): ExternalFood[] {
  const parsed = z.object({ [key]: z.array(z.unknown()).max(100) }).safeParse(data);
  if (!parsed.success) return [];
  return (parsed.data[key] as unknown[])
    .map((raw, i) => ({ raw, i, score: offScore(raw, options.country) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ raw }) => normalizeOff(raw))
    .filter((f): f is ExternalFood => f !== null)
    .slice(0, 15);
}

/**
 * Tries Open Food Facts' fast search service first and falls back to the
 * older (slower, more rate-limited) search endpoint if it fails or is empty.
 */
export async function searchOpenFoodFacts(query: string, fetchImpl: Fetch = fetch, options: SearchOptions = {}): Promise<ExternalFood[]> {
  const fast = new URL(OFF_SEARCH);
  fast.search = new URLSearchParams({ q: query, page_size: "30", langs: "en", fields: OFF_FIELDS }).toString();
  try {
    const results = productsFrom(await getJson(fast.toString(), fetchImpl), "hits", options);
    if (results.length) return results;
  } catch {
    // fall through to the legacy endpoint
  }

  const legacy = new URL("/cgi/search.pl", OFF_BASE);
  legacy.search = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "30",
    fields: OFF_FIELDS,
  }).toString();
  return productsFrom(await getJson(legacy.toString(), fetchImpl), "products", options);
}

export async function getOpenFoodFactsProduct(code: string, fetchImpl: Fetch = fetch): Promise<ExternalFood | null> {
  if (!/^[0-9]{1,14}$/.test(code)) return null;
  const url = `${OFF_BASE}/api/v2/product/${code}.json?fields=${OFF_FIELDS}`;
  const data = z.object({ product: z.unknown() }).safeParse(await getJson(url, fetchImpl));
  return data.success ? normalizeOff(data.data.product) : null;
}

// ---------------------------------------------------------------------------
// USDA FoodData Central
// ---------------------------------------------------------------------------
// Nutrient numbers: 208 energy (kcal), 957/958 Atwater energy, 203 protein,
// 204 fat, 205 carbohydrate, 291 fibre, 269 sugars, 307 sodium (mg).
const usdaNutrient = z.object({
  nutrientNumber: z.string().optional(),
  value: z.unknown().optional(),
  amount: z.unknown().optional(),
  unitName: z.string().optional(),
  nutrient: z.object({ number: z.string().optional(), unitName: z.string().optional() }).optional(),
});

const usdaFood = z.object({
  fdcId: z.coerce.number().int().positive(),
  description: text(200),
  brandName: text(120),
  brandOwner: text(120),
  gtinUpc: text(14),
  dataType: text(40),
  servingSize: z.unknown().optional(),
  servingSizeUnit: text(10),
  householdServingFullText: text(60),
  foodNutrients: z.array(usdaNutrient).max(500).default([]),
});

export function normalizeUsda(raw: unknown): ExternalFood | null {
  const parsed = usdaFood.safeParse(raw);
  if (!parsed.success) return null;
  const f = parsed.data;
  const values = new Map<string, unknown>();
  for (const n of f.foodNutrients) {
    const number = n.nutrientNumber ?? n.nutrient?.number;
    const unit = (n.unitName ?? n.nutrient?.unitName ?? "").toUpperCase();
    if (!number || (number === "208" && unit && unit !== "KCAL")) continue;
    values.set(number, n.value ?? n.amount);
  }
  const servingGrams = (f.servingSizeUnit ?? "").toLowerCase() === "g" ? clampNutrient(f.servingSize, 5000) : null;
  const brand = f.brandName || f.brandOwner || null;
  return finish({
    source: "usda",
    externalId: String(f.fdcId),
    name: tidyName(f.description ?? ""),
    brand: brand ? tidyName(brand) : null,
    barcode: f.gtinUpc && /^[0-9]{8,14}$/.test(f.gtinUpc) ? f.gtinUpc : null,
    per100g: {
      calories: clampNutrient(values.get("208") ?? values.get("958") ?? values.get("957"), 10000),
      protein_g: clampNutrient(values.get("203"), 100),
      carbs_g: clampNutrient(values.get("205"), 100),
      fat_g: clampNutrient(values.get("204"), 100),
      fiber_g: clampNutrient(values.get("291"), 100),
      sugar_g: clampNutrient(values.get("269"), 100),
      sodium_mg: clampNutrient(values.get("307"), 100000),
    },
    serving:
      servingGrams && servingGrams > 0
        ? { label: f.householdServingFullText || `${servingGrams} g`, grams: servingGrams }
        : null,
  });
}

export async function searchUsda(query: string, apiKey: string | undefined, fetchImpl: Fetch = fetch): Promise<ExternalFood[]> {
  const url = new URL(`${USDA_BASE}/foods/search`);
  url.search = new URLSearchParams({
    api_key: apiKey || "DEMO_KEY",
    query,
    pageSize: "15",
    dataType: "Foundation,SR Legacy,Survey (FNDDS),Branded",
  }).toString();
  const data = z.object({ foods: z.array(z.unknown()).max(200).default([]) }).safeParse(await getJson(url.toString(), fetchImpl));
  if (!data.success) return [];
  return data.data.foods.map(normalizeUsda).filter((f): f is ExternalFood => f !== null);
}

export async function getUsdaFood(fdcId: string, apiKey: string | undefined, fetchImpl: Fetch = fetch): Promise<ExternalFood | null> {
  if (!/^[0-9]{1,14}$/.test(fdcId)) return null;
  const url = `${USDA_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey || "DEMO_KEY")}`;
  return normalizeUsda(await getJson(url, fetchImpl));
}

/**
 * Searches both sources at once and interleaves the results so neither
 * crowds the other out. A failing or slow source just contributes nothing.
 */
export async function searchExternal(
  query: string,
  apiKey: string | undefined,
  fetchImpl: Fetch = fetch,
  options: SearchOptions = {},
) {
  const [off, usda] = await Promise.allSettled([searchOpenFoodFacts(query, fetchImpl, options), searchUsda(query, apiKey, fetchImpl)]);
  const a = off.status === "fulfilled" ? off.value : [];
  const b = usda.status === "fulfilled" ? usda.value : [];
  const merged: ExternalFood[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    for (const food of [a[i], b[i]]) {
      if (!food) continue;
      const key = `${food.name}|${food.brand ?? ""}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(food);
    }
  }
  return merged;
}

/** Maps a time zone to the Open Food Facts country tag we rank first. */
const COUNTRY_BY_TZ: Record<string, string> = {
  "Asia/Kolkata": "en:india",
  "Asia/Calcutta": "en:india",
  "Asia/Dubai": "en:united-arab-emirates",
  "Asia/Singapore": "en:singapore",
  "Asia/Kuala_Lumpur": "en:malaysia",
  "Asia/Karachi": "en:pakistan",
  "Asia/Dhaka": "en:bangladesh",
  "Asia/Colombo": "en:sri-lanka",
  "Europe/London": "en:united-kingdom",
  "America/New_York": "en:united-states",
  "America/Chicago": "en:united-states",
  "America/Denver": "en:united-states",
  "America/Los_Angeles": "en:united-states",
  "America/Toronto": "en:canada",
  "Australia/Sydney": "en:australia",
  "Australia/Melbourne": "en:australia",
};

export function countryForTimeZone(timeZone: string | null | undefined) {
  return timeZone ? COUNTRY_BY_TZ[timeZone] : undefined;
}
