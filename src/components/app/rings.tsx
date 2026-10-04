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
  size?: number;
  stroke?: number;
  hideNumbers?: boolean;
  children?: React.ReactNode;
};

export function Ring({ label, value, target, unit, color, size = 88, stroke = 9, hideNumbers, children }: RingProps) {
  const radius = (size - stroke) / 2;
  const progress = target && target > 0 ? Math.min(value / target, 1) : 0;
  const over = target != null && value > target;
  const description = target
    ? `${label}: ${Math.round(value)} of ${target} ${unit}${over ? ", over target" : ""}`
    : `${label}: ${Math.round(value)} ${unit}`;

  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={hideNumbers ? label : description} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-neutral-200 dark:stroke-neutral-800" />
          <m.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={over ? "#b45309" : color}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={{ duration: DURATION, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight" aria-hidden="true">
          {children ??
            (hideNumbers ? null : (
              <span className="text-sm font-semibold tabular-nums">
                <CountUp value={value} />
              </span>
            ))}
        </div>
      </div>
      <figcaption className="text-xs text-neutral-600 dark:text-neutral-400">
        {label}
        {!hideNumbers && target ? <span className="tabular-nums"> / {target}{unit === "kcal" ? "" : unit}</span> : null}
      </figcaption>
    </figure>
  );
}

export function CalorieRing({ eaten, target, hideNumbers }: { eaten: number; target: number | null; hideNumbers?: boolean }) {
  const left = target != null ? target - eaten : null;
  return (
    <Ring label="Calories" value={eaten} target={target} unit="kcal" color="#047857" size={168} stroke={14} hideNumbers={hideNumbers}>
      {hideNumbers ? (
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{left != null && left < 0 ? "Over" : "Today"}</span>
      ) : (
        <>
          <span className="text-3xl font-semibold tabular-nums">
            <CountUp value={Math.abs(left ?? eaten)} />
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {left == null ? "kcal eaten" : left >= 0 ? "kcal left" : "kcal over"}
          </span>
        </>
      )}
    </Ring>
  );
}
