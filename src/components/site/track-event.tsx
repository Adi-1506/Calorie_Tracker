"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/site/analytics";

/** Fires one analytics event when it mounts (e.g. on a thank-you page). */
export function TrackEvent({ event }: { event: AnalyticsEvent }) {
  useEffect(() => {
    // GA may still be loading right after consent; give it a moment.
    const t = setTimeout(() => track(event), 1500);
    return () => clearTimeout(t);
  }, [event]);
  return null;
}
