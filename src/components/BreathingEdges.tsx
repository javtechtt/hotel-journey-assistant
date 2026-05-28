"use client";

import { useEffect, useRef } from "react";
import type { VoiceStatus } from "@/lib/use-realtime-voice";

// Vibrant RGB triplets tinted by voice state.
const HUE: Record<VoiceStatus, string> = {
  idle: "212,167,59",
  connecting: "245,200,90",
  listening: "45,212,191",
  thinking: "167,139,250",
  speaking: "240,196,90",
  error: "251,113,133"
};

// Soft glows bleeding in from the left & right edges. They breathe with a slow,
// smooth rhythm whenever someone is speaking — the live audio level only gently
// lifts the intensity, it does not drive the motion frame-by-frame.
export function BreathingEdges({
  levelRef,
  status
}: {
  levelRef: React.MutableRefObject<number>;
  status: VoiceStatus;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(false);
  liveRef.current = status === "listening" || status === "thinking" || status === "speaking";

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    let liveAmt = 0; // eased 0..1 presence so it fades in/out smoothly
    let lvl = 0; // heavily smoothed audio level
    const tick = () => {
      t += 0.016;
      liveAmt += ((liveRef.current ? 1 : 0) - liveAmt) * 0.05;
      lvl += ((liveRef.current ? levelRef.current || 0 : 0) - lvl) * 0.04;

      // Slow breath (~9s cycle), smooth regardless of speech rhythm.
      const breath = 0.5 + 0.5 * Math.sin(t * 0.7);

      const idleOpacity = 0.12 + 0.05 * breath;
      const liveOpacity = 0.5 + 0.32 * breath + 0.18 * lvl;
      const opacity = idleOpacity + (liveOpacity - idleOpacity) * liveAmt;

      const idleScale = 1 + 0.03 * breath;
      const liveScale = 1.06 + 0.14 * breath + 0.08 * lvl;
      const scale = idleScale + (liveScale - idleScale) * liveAmt;

      if (leftRef.current) {
        leftRef.current.style.opacity = String(opacity);
        leftRef.current.style.transform = `scaleX(${scale})`;
      }
      if (rightRef.current) {
        rightRef.current.style.opacity = String(opacity);
        rightRef.current.style.transform = `scaleX(${scale})`;
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  const color = HUE[status];
  const glow = `radial-gradient(closest-side, rgba(${color},0.85), rgba(${color},0.32) 48%, transparent 76%)`;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={leftRef}
        className="absolute left-0 top-0 h-full w-[38vw] origin-left blur-[100px] transition-[background] duration-700 will-change-[opacity,transform]"
        style={{ background: glow, opacity: 0.12 }}
      />
      <div
        ref={rightRef}
        className="absolute right-0 top-0 h-full w-[38vw] origin-right blur-[100px] transition-[background] duration-700 will-change-[opacity,transform]"
        style={{ background: glow, opacity: 0.12 }}
      />
    </div>
  );
}
