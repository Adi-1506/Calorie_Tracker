import { describe, expect, it } from "vitest";
import { trailingAverage, weeklyChange } from "./trend";

describe("trailingAverage", () => {
  it("averages over calendar days, not entries", () => {
    const avg = trailingAverage([
      { date: "2026-10-01", kg: 70 },
      { date: "2026-10-02", kg: 72 },
      { date: "2026-10-20", kg: 68 },
    ]);
    expect(avg.map((p) => p.kg)).toEqual([70, 71, 68]);
  });
  it("sorts its input", () => {
    expect(trailingAverage([{ date: "2026-10-02", kg: 2 }, { date: "2026-10-01", kg: 1 }])[0].date).toBe("2026-10-01");
  });
});

describe("weeklyChange", () => {
  it("needs at least six days of data", () => {
    expect(weeklyChange([{ date: "2026-10-01", kg: 70 }])).toBeNull();
    expect(weeklyChange([{ date: "2026-10-01", kg: 70 }, { date: "2026-10-03", kg: 69 }])).toBeNull();
  });
  it("reports kg per week from the smoothed line", () => {
    const points = Array.from({ length: 29 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      kg: 80 - i * (0.5 / 7),
    }));
    const change = weeklyChange(points)!;
    expect(change).toBeCloseTo(-0.5, 1);
  });
});
