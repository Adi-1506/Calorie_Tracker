"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOnline } from "@/lib/offline/online";
import { listQueued, QUEUE_EVENT, syncQueued } from "@/lib/offline/queue";

/**
 * Inside the app: shows an offline banner, and sends anything logged offline
 * as soon as there's a connection.
 */
export function OfflineSync() {
  const router = useRouter();
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let busy = false;
    const count = async () => setPending((await listQueued().catch(() => [])).length);
    const sync = async () => {
      if (busy || !navigator.onLine) return;
      busy = true;
      try {
        const { synced, rejected } = await syncQueued();
        if (synced) {
          setMessage(`Synced ${synced} ${synced === 1 ? "entry" : "entries"} you logged offline.`);
          router.refresh();
        }
        if (rejected) setMessage((m) => `${m} ${rejected} couldn't be saved because the date was too far from today.`.trim());
      } catch {
        // Still offline or the server is unreachable; the queue stays put for next time.
      } finally {
        busy = false;
        void count();
      }
    };
    const goOnline = () => void sync();

    void count().then(sync);
    window.addEventListener("online", goOnline);
    window.addEventListener(QUEUE_EVENT, count);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener(QUEUE_EVENT, count);
    };
  }, [router]);

  if (!online) {
    return (
      <p role="status" className="notice notice-warn">
        You&apos;re offline.{" "}
        {/* A full page load, so the service worker can serve the cached offline logger. */}
        <a href="/offline" className="link">
          Quick-add food or water
        </a>{" "}
        and it will sync when you&apos;re back online.
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="notice notice-ok">
        {message}
      </p>
    );
  }
  if (pending) {
    return (
      <p role="status" className="notice notice-warn">
        {pending} {pending === 1 ? "entry is" : "entries are"} waiting to sync.
      </p>
    );
  }
  return null;
}
