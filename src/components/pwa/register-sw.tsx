"use client";

import { useEffect } from "react";

/** Registers public/sw.js. Off in development so hot reload isn't served stale files. */
export function RegisterServiceWorker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, [enabled]);
  return null;
}
