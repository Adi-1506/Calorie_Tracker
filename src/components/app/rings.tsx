"use client";

import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useEffect } from "react";

const DURATION = 0.4; // seconds; within the 150 to 400 ms budget

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("en"));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: DURATION, ease: "easeOut" });
    return () => controls.stop();
  }, [mv, value, reduce]);
  return <m.span>{rounded}</m.span>;
}

type RingProps = {
  label: string;
  value: number;
  target: number | null;
  unit: string;
  color: string;
  hideNumbers?: boolean;
};

function describe(label: string, value: number, target: number | null, unit: string) {
  const over = target != null && value > target;
  return target
    ? `${label}: ${Math.round(value)} of ${target} ${unit}${over ? ", over target" : ""}`
    : `${label}: ${Math.round(value)} ${unit}`;
}

function Arc({ c, r, stroke, color, progress }: { c: number; r: number; stroke: number; color: string; progress: number }) {
  return (
    <m.circle
      cx={c}
      cy={c}
      r={r}
      fill="none"
      strokeWidth={stroke}
      strokeLinecap="round"
      stroke={color}
      transform={`rotate(-90 ${c} ${c})`}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: progress }}
      transition={{ duration: DURATION, ease: "easeOut" }}
    />
  );
}

/** A small katori (bowl) for one macro. */
export function Ring({ label, value, target, unit, color, hideNumbers }: RingProps) {
  const progress = target && target > 0 ? Math.min(value / target, 1) : 0;
  const over = target != null && value > target;
  return (
    <figure className="flex flex-col items-center gap-1">
      <div className="relative size-[76px]">
        <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={hideNumbers ? label : describe(label, value, target, unit)}>
          <circle cx="38" cy="38" r="34" className="fill-well stroke-ink" strokeWidth="2" />
          <Arc c={38} r={26} stroke={8} color={over ? "var(--chili)" : color} progress={progress} />
        </svg>
        {!hideNumbers && (
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-semibold tabular-nums" aria-hidden="true">
            <CountUp value={value} />
          </span>
        )}
      </div>
      <figcaption className="text-center leading-tight">
        <span className="block text-sm font-semibold">{label}</span>
        {!hideNumbers && target ? (
          <span className="block font-mono text-xs text-muted tabular-nums">
            {Math.round(value)} / {target} {unit}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** The steel plate: rim, a turmeric track for calories, and the amount left in the middle. */
export function CalorieRing({ eaten, target, hideNumbers }: { eaten: number; target: number | null; hideNumbers?: boolean }) {
  const left = target != null ? target - eaten : null;
  const progress = target && target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = left != null && left < 0;
  return (
    <figure className="relative size-[230px] shrink-0">
      <svg width="230" height="230" viewBox="0 0 250 250" role="img" aria-label={hideNumbers ? "Calories" : describe("Calories", eaten, target, "kcal")} className="size-full">
        <circle cx="125" cy="125" r="116" className="fill-well stroke-ink" strokeWidth="2" />
        <circle cx="125" cy="125" r="100" fill="none" className="stroke-line" strokeWidth="16" />
        <Arc c={125} r={100} stroke={16} color={over ? "var(--chili)" : "var(--turmeric)"} progress={progress} />
        <circle cx="125" cy="125" r="84" className="fill-surface stroke-ink" strokeWidth="2" />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight" aria-hidden="true">
        {hideNumbers ? (
          <span className="font-display text-xl font-bold">{over ? "Over" : "Today"}</span>
        ) : (
          <>
            <span className="font-mono text-[2.75rem] font-semibold tabular-nums">
              <CountUp value={Math.abs(left ?? eaten)} />
            </span>
            <span className="text-sm text-muted">
              {left == null ? "kcal eaten" : `kcal ${left >= 0 ? "left" : "over"} of ${target}`}
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
