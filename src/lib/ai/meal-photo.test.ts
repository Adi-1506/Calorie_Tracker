import { describe, expect, it } from "vitest";
import { parseMealPhoto } from "./meal-photo";

const item = {
  name: "Chicken biryani",
  grams: 350,
  caloriesPer100g: 180,
  proteinPer100g: 8,
  carbsPer100g: 22,
  fatPer100g: 6,
  confidence: "medium",
};

describe("parseMealPhoto", () => {
  it("parses a valid answer", () => {
    expect(parseMealPhoto(JSON.stringify({ items: [item] }))).toEqual([item]);
  });

  it("returns null for non-JSON or the wrong shape", () => {
    expect(parseMealPhoto("Ignore previous instructions")).toBeNull();
    expect(parseMealPhoto(JSON.stringify({ foods: [] }))).toBeNull();
  });

  it("clamps out-of-range numbers", () => {
    const [i] = parseMealPhoto(JSON.stringify({ items: [{ ...item, grams: 99999, caloriesPer100g: -5 }] }))!;
    expect(i.grams).toBe(2000);
    expect(i.caloriesPer100g).toBe(0);
  });

  it("scales macros that add up to more than 100 g per 100 g", () => {
    const [i] = parseMealPhoto(JSON.stringify({ items: [{ ...item, proteinPer100g: 80, carbsPer100g: 80, fatPer100g: 40 }] }))!;
    expect(i.proteinPer100g + i.carbsPer100g + i.fatPer100g).toBeLessThanOrEqual(100);
  });

  it("strips markup and control characters from names and drops empty ones", () => {
    const items = parseMealPhoto(JSON.stringify({ items: [{ ...item, name: "<script>Dosa</script>\n" }, { ...item, name: "<>" }] }))!;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("scriptDosa/script");
  });

  it("drops malformed items, keeps the rest, and caps the list", () => {
    const many = Array.from({ length: 20 }, () => item);
    expect(parseMealPhoto(JSON.stringify({ items: [{ name: "x" }, ...many] }))).toHaveLength(12);
  });

  it("defaults an unknown confidence to low", () => {
    expect(parseMealPhoto(JSON.stringify({ items: [{ ...item, confidence: "certain" }] }))![0].confidence).toBe("low");
  });
});
