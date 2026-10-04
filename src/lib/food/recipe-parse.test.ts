import { describe, expect, it } from "vitest";
import { ingredientSearchTerm, parseRecipeHtml } from "./recipe-parse";

const page = (ld: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head></html>`;

describe("parseRecipeHtml", () => {
  it("reads a Recipe inside @graph", () => {
    const r = parseRecipeHtml(
      page({
        "@graph": [
          { "@type": "WebPage", name: "x" },
          {
            "@type": ["Recipe"],
            name: "Kerala Fish <b>Curry</b>",
            recipeYield: ["4 servings"],
            recipeIngredient: ["500 g fish", "1 cup coconut milk"],
            nutrition: { calories: "320 kcal" },
          },
        ],
      }),
    );
    expect(r).toEqual({ name: "Kerala Fish Curry", servings: 4, ingredients: ["500 g fish", "1 cup coconut milk"], caloriesPerServing: 320 });
  });

  it("ignores broken JSON and pages without recipes", () => {
    expect(parseRecipeHtml('<script type="application/ld+json">{nope</script>')).toBeNull();
    expect(parseRecipeHtml(page({ "@type": "Article", name: "News" }))).toBeNull();
  });

  it("caps sizes and falls back to 1 serving", () => {
    const r = parseRecipeHtml(page({ "@type": "Recipe", name: "x".repeat(500), recipeIngredient: Array(100).fill("salt"), recipeYield: "lots" }));
    expect(r?.name).toHaveLength(200);
    expect(r?.ingredients).toHaveLength(60);
    expect(r?.servings).toBe(1);
  });
});

describe("ingredientSearchTerm", () => {
  it("strips amounts and units", () => {
    expect(ingredientSearchTerm("2 cups basmati rice, rinsed")).toBe("basmati rice");
    expect(ingredientSearchTerm("1½ tbsp olive oil")).toBe("olive oil");
    expect(ingredientSearchTerm("500 g chicken thighs (boneless)")).toBe("chicken thighs");
  });
});
