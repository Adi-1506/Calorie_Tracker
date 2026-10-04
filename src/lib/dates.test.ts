import { describe, expect, it } from "vitest";
import { addDays, formatDayLabel, isIsoDate, isValidTimeZone, todayIn } from "./dates";

describe("dates", () => {
  it("computes today in the user's time zone", () => {
    const now = new Date("2026-10-04T20:00:00Z");
    expect(todayIn("UTC", now)).toBe("2026-10-04");
    expect(todayIn("Asia/Kolkata", now)).toBe("2026-10-05");
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-10-04");
    expect(todayIn("Not/AZone", now)).toBe("2026-10-04");
  });

  it("validates time zones and dates", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
  });

  it("adds days and labels them", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(formatDayLabel("2026-10-03", "2026-10-04")).toBe("Yesterday");
    expect(formatDayLabel("2026-10-04", "2026-10-04")).toBe("Today");
  });
});
