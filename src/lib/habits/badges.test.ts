import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { earnedBadges } = await import("./badges");

const none = { streak: 0, totalLogs: 0, recipes: 0, weighIns: 0, waterGoalMet: false, completedFasts: 0 };

describe("earnedBadges", () => {
  it("earns nothing on day zero", () => {
    expect(earnedBadges(none)).toEqual([]);
  });
  it("awards streak tiers cumulatively", () => {
    expect(earnedBadges({ ...none, totalLogs: 9, streak: 7 })).toEqual(["first_log", "streak_3", "streak_7"]);
  });
  it("doesn't count the onboarding weigh-in", () => {
    expect(earnedBadges({ ...none, weighIns: 1 })).toEqual([]);
    expect(earnedBadges({ ...none, weighIns: 2 })).toContain("first_weigh_in");
  });
});
