"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const BARCODE = /^[0-9]{8,14}$/;

type Controls = { stop: () => void };

/**
 * Reads EAN/UPC barcodes with the camera. Uses the browser's built-in
 * BarcodeDetector where it exists (Chrome on Android) and falls back to
 * ZXing, which is loaded only when the scanner opens. Video never leaves
 * the device; only the decoded number is sent to the server.
 */
export function BarcodeScanner({ meal, date }: { meal: string; date: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  function go(code: string) {
    setOpen(false);
    router.push(`/app/log/barcode?${new URLSearchParams({ code, meal, date })}`);
  }

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || !video.current) return;
    let controls: Controls | null = null;
    let cancelled = false;
    const el = video.current;

    async function start() {
      setError(null);
      try {
        if ("BarcodeDetector" in window) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          el.srcObject = stream;
          await el.play();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          let timer: ReturnType<typeof setTimeout>;
          const tick = async () => {
            if (cancelled) return;
            try {
              const found = await detector.detect(el);
              const code = found.find((b: { rawValue: string }) => BARCODE.test(b.rawValue))?.rawValue;
              if (code) return go(code);
            } catch {
              // keep trying
            }
            timer = setTimeout(tick, 250);
          };
          tick();
          controls = { stop: () => { clearTimeout(timer); stream.getTracks().forEach((t) => t.stop()); } };
        } else {
          const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatOneDReader();
          controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, el, (result) => {
            const code = result?.getText();
            if (code && BARCODE.test(code)) go(code);
          });
          if (cancelled) controls.stop();
        }
      } catch {
        setError("We couldn't open the camera. Allow camera access, or type the number under the barcode.");
      }
    }
    start();
    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Scan a barcode"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby="scan-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-neutral-300 bg-[var(--background)] p-0 text-[var(--foreground)] backdrop:bg-black/60 dark:border-neutral-700"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 id="scan-title" className="text-lg font-semibold">
              Scan a barcode
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900">
              Close
            </button>
          </div>
          {open && (
            <video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-xl bg-black object-cover" aria-label="Camera preview" />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (BARCODE.test(manual)) go(manual);
              else setError("Barcodes are 8 to 14 digits.");
            }}
            noValidate
            className="flex gap-2"
          >
            <label htmlFor="manual-code" className="sr-only">
              Barcode number
            </label>
            <input
              id="manual-code"
              inputMode="numeric"
              pattern="[0-9]{8,14}"
              placeholder="Or type the barcode number"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, "").slice(0, 14))}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            />
            <button className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">Look up</button>
          </form>
        </div>
      </dialog>
    </>
  );
}
