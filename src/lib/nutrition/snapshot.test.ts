import { describe, expect, it } from "vitest";
import { snapshotFor, sumEntries } from "./snapshot";

describe("snapshotFor", () => {
  it("scales per-100 g values to the portion", () => {
    const s = snapshotFor({ calories: 132, protein_g: 4.5, carbs_g: 27, fat_g: 0.4, fiber_g: 1.5 }, 80);
    expect(s).toEqual({ calories: 105.6, protein_g: 3.6, carbs_g: 21.6, fat_g: 0.32, nutrients: { fiber_g: 1.2 } });
  });

  it("handles numeric strings from Postgres numeric columns", () => {
    const s = snapshotFor({ calories: "100" as unknown as number, protein_g: 1, carbs_g: 1, fat_g: 1 }, 50);
    expect(s.calories).toBe(50);
  });
});

describe("sumEntries", () => {
  it("adds up a day", () => {
    const t = sumEntries([
      { calories: "105.6", protein_g: "3.6", carbs_g: "21.6", fat_g: "0.32", nutrients: { fiber_g: 1.2 } },
      { calories: 200, protein_g: 10, carbs_g: 20, fat_g: 8, nutrients: {} },
    ]);
    expect(t).toEqual({ calories: 306, protein_g: 13.6, carbs_g: 41.6, fat_g: 8.3, fiber_g: 1.2 });
  });
});
