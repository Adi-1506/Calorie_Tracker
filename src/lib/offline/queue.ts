// Browser-only store for entries logged offline. Kept in IndexedDB on this
// device until they sync, and wiped on log out (security item 39).
import type { OfflineItem } from "./schema";

export const OFFLINE_DB = "kalo-offline";
const STORE = "queue";
export const QUEUE_EVENT = "kalo:offline-queue";

export type QueuedItem = OfflineItem & { queuedAt: string };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "clientId" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const changed = () => window.dispatchEvent(new Event(QUEUE_EVENT));

export async function enqueue(item: OfflineItem) {
  await run("readwrite", (s) => s.put({ ...item, queuedAt: new Date().toISOString() }));
  changed();
}

export async function listQueued(): Promise<QueuedItem[]> {
  const all = (await run<QueuedItem[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedItem[]>)) ?? [];
  return all.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export async function removeQueued(clientIds: string[]) {
  if (!clientIds.length) return;
  await run("readwrite", (s) => {
    for (const id of clientIds) s.delete(id);
  });
  changed();
}

/** Clears offline data and caches on this device (log out, account deletion). */
export async function clearOfflineData() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(OFFLINE_DB);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("kalo-")).map((k) => caches.delete(k)));
  }
}

/** Sends queued entries; returns how many were saved. Safe to call repeatedly. */
export async function syncQueued(): Promise<{ synced: number; rejected: number }> {
  const items = await listQueued();
  let synced = 0;
  let rejected = 0;
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50).map((item) => {
      const copy: Partial<QueuedItem> = { ...item };
      delete copy.queuedAt;
      return copy;
    });
    const res = await fetch("/app/offline-sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batch }),
      credentials: "same-origin",
    });
    if (!res.ok) break;
    const body = (await res.json()) as { synced: string[]; rejected: string[] };
    // Dates too far from today can never be saved, so drop them rather than retry forever.
    await removeQueued([...body.synced, ...body.rejected]);
    synced += body.synced.length;
    rejected += body.rejected.length;
  }
  return { synced, rejected };
}
