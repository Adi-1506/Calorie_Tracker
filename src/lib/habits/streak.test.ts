import { describe, expect, it } from "vitest";
import { elapsed, loggingStreak } from "./streak";

describe("loggingStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(loggingStreak(["2026-10-02", "2026-10-03", "2026-10-04"], "2026-10-04")).toBe(3);
  });
  it("keeps yesterday's streak alive until today ends", () => {
    expect(loggingStreak(["2026-10-02", "2026-10-03"], "2026-10-04")).toBe(2);
  });
  it("stops at a gap", () => {
    expect(loggingStreak(["2026-09-30", "2026-10-02", "2026-10-03", "2026-10-04"], "2026-10-04")).toBe(3);
    expect(loggingStreak(["2026-10-01"], "2026-10-04")).toBe(0);
  });
  it("crosses month boundaries", () => {
    expect(loggingStreak(["2026-09-30", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});

describe("elapsed", () => {
  it("splits into hours and minutes", () => {
    const from = "2026-10-04T00:00:00Z";
    expect(elapsed(from, Date.parse("2026-10-04T16:30:59Z"))).toMatchObject({ hours: 16, minutes: 30 });
    expect(elapsed(from, Date.parse("2026-10-03T00:00:00Z")).totalHours).toBe(0);
  });
});
