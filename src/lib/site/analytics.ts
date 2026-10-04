// Conversion events (spec section 2). No-ops unless GA4 loaded, which only
// happens after consent. Never pass personal or health data in params.

export type AnalyticsEvent = "sign_up" | "onboarding_complete" | "first_food_logged" | "generate_lead";

export function track(event: AnalyticsEvent) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", event);
}
