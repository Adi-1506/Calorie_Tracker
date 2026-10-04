import type { Metadata } from "next";
import { OfflineLogger } from "@/components/pwa/offline-logger";

// Cached by the service worker and shown when a page can't load offline. It
// holds no personal data: queued entries live only in this device's IndexedDB.
export const metadata: Metadata = {
  title: "You're offline | Kalo",
  description: "Log food and water while you're offline. Kalo syncs it when you're back.",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Plain links: client-side navigation needs the network. */}
      <a href="/app" className="font-display text-[1.375rem] font-extrabold tracking-tight">
        Kalo<span className="text-turmeric">.</span>
      </a>
      <div>
        <h1 className="font-display text-[2rem] font-extrabold leading-tight tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted">
          You can still log food and water. It&apos;s saved on this device and added to your log the next time you open Kalo with a connection. Logging out clears anything that hasn&apos;t synced yet.
        </p>
      </div>
      <OfflineLogger />
    </main>
  );
}
