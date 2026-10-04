"use client";

import { useEffect } from "react";
import { clearOfflineData } from "@/lib/offline/queue";

/** Mounted after log out and account deletion: wipes offline entries and caches on this device (item 39). */
export function ClearOfflineData() {
  useEffect(() => {
    void clearOfflineData().catch(() => {});
  }, []);
  return null;
}
