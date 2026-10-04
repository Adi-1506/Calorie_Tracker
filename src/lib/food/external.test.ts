import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOpenFoodFactsProduct, normalizeOff, normalizeUsda, searchExternal } = await import("./external");

const offProduct = {
  code: "8901063010338",
  product_name: "Marie biscuits",
  brands: "Britannia, Other",
  serving_size: "4 biscuits (25 g)",
  serving_quantity: 25,
  nutriments: { "energy-kcal_100g": 440, proteins_100g: 7.5, carbohydrates_100g: 76, fat_100g: 11.6, sodium_100g: 0.4 },
};

const usdaFood = {
  fdcId: 171705,
  description: "AVOCADOS, RAW, CALIFORNIA",
  dataType: "SR Legacy",
  foodNutrients: [
    { nutrientNumber: "208", unitName: "KCAL", value: 167 },
    { nutrientNumber: "268", unitName: "kJ", value: 698 },
    { nutrientNumber: "203", unitName: "G", value: 1.96 },
    { nutrientNumber: "204", unitName: "G", value: 15.4 },
    { nutrientNumber: "205", unitName: "G", value: 8.64 },
    { nutrientNumber: "291", unitName: "G", value: 6.8 },
    { nutrientNumber: "307", unitName: "MG", value: 8 },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Open Food Facts", () => {
  it("normalises a product", () => {
    expect(normalizeOff(offProduct)).toEqual({
      source: "open_food_facts",
      externalId: "8901063010338",
      name: "Marie biscuits",
      brand: "Britannia",
      barcode: "8901063010338",
      per100g: { calories: 440, protein_g: 7.5, carbs_g: 76, fat_g: 11.6, fiber_g: null, sugar_g: null, sodium_mg: 400 },
      serving: { label: "4 biscuits (25 g)", grams: 25 },
    });
  });

  it("falls back from kJ and rejects junk", () => {
    expect(normalizeOff({ ...offProduct, nutriments: { energy_100g: 1841 } })?.per100g.calories).toBeCloseTo(440, 0);
    expect(normalizeOff({ ...offProduct, nutriments: {} })).toBeNull();
    expect(normalizeOff({ ...offProduct, nutriments: { "energy-kcal_100g": 5000 } })).toBeNull();
    expect(normalizeOff({ ...offProduct, code: "../../etc" })).toBeNull();
    expect(normalizeOff({ ...offProduct, product_name: "" })).toBeNull();
  });

  it("strips control characters and clamps values", () => {
    const f = normalizeOff({ ...offProduct, product_name: "Bad\u0000name\u001b", nutriments: { "energy-kcal_100g": 100, proteins_100g: 250, fat_100g: -3 } });
    expect(f?.name).toBe("Badname");
    expect(f?.per100g.protein_g).toBe(100);
    expect(f?.per100g.fat_g).toBe(0);
  });

  it("refuses non-numeric product codes without calling the network", async () => {
    const fetchImpl = vi.fn();
    expect(await getOpenFoodFactsProduct("abc/../x", fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("USDA", () => {
  it("normalises a food and tidies SHOUTED names", () => {
    const f = normalizeUsda(usdaFood);
    expect(f?.name).toBe("Avocados, Raw, California");
    expect(f?.per100g).toMatchObject({ calories: 167, protein_g: 1.96, fat_g: 15.4, carbs_g: 8.64, fiber_g: 6.8, sodium_mg: 8 });
  });

  it("uses Atwater energy when 208 is missing", () => {
    const f = normalizeUsda({ ...usdaFood, foodNutrients: [{ nutrient: { number: "958", unitName: "kcal" }, amount: 120 }] });
    expect(f?.per100g.calories).toBe(120);
  });
});

describe("searchExternal", () => {
  it("merges both sources and survives one failing", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("openfoodfacts")) return jsonResponse({ products: [offProduct, { code: "x" }] });
      return jsonResponse({}, 500);
    }) as unknown as typeof fetch;
    const results = await searchExternal("marie", undefined, fetchImpl);
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("open_food_facts");
  });

  it("sends a User-Agent, a timeout and no redirects", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ foods: [usdaFood], products: [] }));
    await searchExternal("avocado", "key123", fetchImpl as unknown as typeof fetch);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/CalorieTracker/);
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
