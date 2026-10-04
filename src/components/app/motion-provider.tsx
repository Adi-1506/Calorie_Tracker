"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

// Loads only the small DOM animation bundle and honours the user's
// "reduce motion" setting everywhere inside the app (spec section 5).
export function MotionProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" nonce={nonce}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
