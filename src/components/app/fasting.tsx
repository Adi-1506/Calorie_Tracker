"use client";

import * as m from "motion/react-m";
import { useActionState, useSyncExternalStore } from "react";
import { startFast } from "@/app/app/fasting/actions";
import { FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { elapsed } from "@/lib/habits/streak";
import { initialFormState } from "@/lib/validation/auth";
import { FAST_TARGETS } from "@/lib/validation/habits";

// A clock that ticks every 15 seconds; the server render shows the start state.
function subscribe(callback: () => void) {
  const id = setInterval(callback, 15_000);
  return () => clearInterval(id);
}
const useNow = (serverNow: number) => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 15_000) * 15_000, () => serverNow);

export function FastTimer({ startedAt, targetHours, serverNow, timeZone }: { startedAt: string; targetHours: number; serverNow: number; timeZone: string }) {
  const now = useNow(serverNow);
  const { hours, minutes, totalHours } = elapsed(startedAt, now);
  const progress = Math.min(totalHours / targetHours, 1);
  const done = totalHours >= targetHours;
  const endsAt = new Date(Date.parse(startedAt) + targetHours * 3_600_000);
  // Fixed locale and the profile's time zone, so server and browser render the same text.
  const endsLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone }).format(endsAt);

  return (
    <figure className="relative mx-auto size-[230px]">
      <svg viewBox="0 0 250 250" className="size-full" role="img" aria-label={`Fasting for ${hours} hours ${minutes} minutes of ${targetHours}`}>
        <circle cx="125" cy="125" r="116" className="fill-well stroke-ink" strokeWidth="2" />
        <circle cx="125" cy="125" r="100" fill="none" className="stroke-line" strokeWidth="16" />
        <m.circle
          cx="125"
          cy="125"
          r="100"
          fill="none"
          stroke={done ? "var(--leaf)" : "var(--water)"}
          strokeWidth="16"
          strokeLinecap="round"
          transform="rotate(-90 125 125)"
          initial={false}
          animate={{ pathLength: progress }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <circle cx="125" cy="125" r="84" className="fill-surface stroke-ink" strokeWidth="2" />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight" aria-hidden="true">
        <span className="font-mono text-[2.5rem] font-semibold tabular-nums">
          {hours}:{String(minutes).padStart(2, "0")}
        </span>
        <span className="text-sm text-muted">{done ? "Target reached" : `of ${targetHours} h · ends ${endsLabel}`}</span>
      </figcaption>
    </figure>
  );
}

export function StartFastForm() {
  const [state, action] = useActionState(startFast, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">How long?</legend>
        <div className="grid grid-cols-3 gap-2">
          {FAST_TARGETS.map((h) => (
            <label
              key={h}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-ink font-mono font-semibold has-[:checked]:bg-ink has-[:checked]:text-ground has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-turmeric"
            >
              <input type="radio" name="targetHours" value={h} defaultChecked={h === 16} className="sr-only" />
              {h} h
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton>Start fasting</SubmitButton>
    </form>
  );
}
