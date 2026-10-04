// Extracts a recipe from a web page's schema.org JSON-LD. Pure, so it can be
// unit tested; everything is treated as untrusted text and length-capped.

export type ParsedRecipe = {
  name: string;
  servings: number;
  ingredients: string[];
  caloriesPerServing: number | null;
};

const LD_JSON = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function clean(text: unknown, max: number): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isRecipe(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as Record<string, unknown>)["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 5 || !node || typeof node !== "object") return null;
  if (isRecipe(node)) return node;
  const children = Array.isArray(node) ? node : [(node as Record<string, unknown>)["@graph"]];
  for (const child of children) {
    const found = findRecipe(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function parseServings(yieldValue: unknown): number {
  const first = Array.isArray(yieldValue) ? yieldValue[0] : yieldValue;
  const n = typeof first === "number" ? first : Number(String(first ?? "").match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(n) && n >= 0.5 && n <= 100 ? n : 1;
}

function parseCalories(nutrition: unknown): number | null {
  const raw = nutrition && typeof nutrition === "object" ? (nutrition as Record<string, unknown>).calories : null;
  const n = Number(String(raw ?? "").match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(n) && n > 0 && n < 10000 ? Math.round(n) : null;
}

export function parseRecipeHtml(html: string): ParsedRecipe | null {
  for (const match of html.matchAll(LD_JSON)) {
    let data: unknown;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;
    const name = clean(recipe.name, 200);
    if (!name) continue;
    const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
      .map((i) => clean(i, 200))
      .filter(Boolean)
      .slice(0, 60);
    return {
      name,
      servings: parseServings(recipe.recipeYield),
      ingredients,
      caloriesPerServing: parseCalories(recipe.nutrition),
    };
  }
  return null;
}

/** Turns "2 cups basmati rice, rinsed" into a search term like "basmati rice". */
export function ingredientSearchTerm(line: string): string {
  return line
    .replace(/\(.*?\)/g, " ")
    .split(",")[0]
    .replace(/^[\d\s.,/½¼¾⅓⅔-]+/, "")
    .replace(/^(cups?|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|pinch|handful|cloves?|pieces?|large|medium|small|of)\b\.?\s*/gi, "")
    .replace(/^(of)\s+/i, "")
    .trim()
    .slice(0, 60);
}
