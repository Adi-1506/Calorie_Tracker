"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** "Install Kalo" button where the browser supports it, with steps for iPhone and iPad. */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [state, setState] = useState<"unknown" | "installed" | "ios" | "other">("unknown");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state once after mount
    setState(standalone ? "installed" : ios ? "ios" : "other");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      setState("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (state === "installed") return <p className="text-sm text-muted">Kalo is installed on this device.</p>;
  if (event) {
    return (
      <button
        type="button"
        className="btn btn-primary self-start"
        onClick={async () => {
          await event.prompt();
          const { outcome } = await event.userChoice;
          if (outcome === "accepted") setState("installed");
          setEvent(null);
        }}
      >
        Install Kalo
      </button>
    );
  }
  if (state === "ios") {
    return (
      <p className="text-sm">
        In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
      </p>
    );
  }
  return (
    <p className="text-sm text-muted">
      Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. On a computer, look for the install
      icon in the address bar.
    </p>
  );
}
