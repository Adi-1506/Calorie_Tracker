"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";

/** A short celebration for badges earned since the last visit. */
export function BadgeToast({ badges }: { badges: { code: string; name: string; description: string }[] }) {
  const [open, setOpen] = useState(badges.length > 0);
  return (
    <AnimatePresence>
      {open && (
        <m.div
          role="status"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="flex items-start gap-3 rounded-[18px] border-2 border-ink bg-turmeric p-4 text-on-turmeric shadow-plate"
        >
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface font-display text-lg font-extrabold text-ink">
            ★
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{badges.length === 1 ? `New badge: ${badges[0].name}` : `${badges.length} new badges`}</p>
            <p className="text-sm">{badges.map((b) => b.description).join(" ")}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-sm border-ink bg-surface" aria-label="Dismiss">
            Nice
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
