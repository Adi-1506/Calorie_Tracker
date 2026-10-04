"use client";

import { useEffect, useRef } from "react";

/**
 * Asked once before the first AI feature is used (item 37). "Yes" continues;
 * "No" (or Escape) sends the user back to Today. The answer is stored on the
 * server and can be withdrawn in Settings.
 */
export function AiConsentDialog({ open, onYes, onNo }: { open: boolean; onYes: () => void; onNo: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onNo();
      }}
      aria-labelledby="ai-consent-title"
      aria-describedby="ai-consent-body"
      className="card m-auto w-[min(30rem,calc(100vw-2rem))] p-0 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <p className="eyebrow">Before you use AI</p>
        <h2 id="ai-consent-title" className="font-display text-2xl font-extrabold leading-tight tracking-tight">
          Your data helps the AI
        </h2>
        <div id="ai-consent-body" className="flex flex-col gap-2 text-[0.9375rem]">
          <p>
            Meal photos and coach messages are sent to Google&apos;s Gemini AI so it can recognise food and answer you.
            The AI provider may use this data to improve its products.
          </p>
          <p className="text-sm text-muted">
            We never send your name or email. You can turn this off any time in Settings.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onNo} className="btn">
            No, go back
          </button>
          <button type="button" onClick={onYes} className="btn btn-primary" autoFocus>
            Yes, continue
          </button>
        </div>
      </div>
    </dialog>
  );
}
