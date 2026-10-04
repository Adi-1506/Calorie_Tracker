import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildReport, latin1 } from "./pdf";

describe("pdf report", () => {
  it("replaces characters the built-in fonts can't draw", () => {
    expect(latin1("Café")).toBe("Café");
    expect(latin1("Dosa മ")).toBe("Dosa ?");
    expect(latin1("ok 😀")).toBe("ok ??");
  });
  it("builds a multi-page report without throwing on non-Latin names", async () => {
    const days = Array.from({ length: 80 }, (_, i) => ({ date: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`, calories: 1800 + i, protein: 90, carbs: 200, fat: 60 }));
    const bytes = await buildReport({ name: "അശ Asha", from: "2026-07-01", to: "2026-09-30", target: 1900, days, weights: [{ date: "2026-09-01", kg: 64.5 }] });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getTitle()).toBe("Nutrition report");
  });
});
