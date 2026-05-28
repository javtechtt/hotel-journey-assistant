"use client";

import { useEffect, useRef } from "react";
import type { VoiceStatus } from "@/lib/use-realtime-voice";

// RGB triplets tinted by voice state.
const HUE: Record<VoiceStatus, string> = {
  idle: "212,167,59",
  connecting: "243,198,107",
  listening: "95,210,197",
  thinking: "167,139,250",
  speaking: "251,231,189",
  error: "251,113,133"
};

// Soft glows bleeding in from the left & right edges that "breathe" with the
// live audio level (mic + agent) and tint by voice state — calm idle pulse
// otherwise.
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
    const tick = () => {
      t += 0.016;
      const lvl = levelRef.current || 0;
      const idle = 0.1 + 0.04 * Math.sin(t * 0.8);
      const opacity = liveRef.current ? Math.min(0.9, 0.16 + lvl * 0.95) : idle;
      const scale = liveRef.current ? 1 + lvl * 0.4 : 1 + 0.04 * Math.sin(t * 0.8);
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
  const glow = `radial-gradient(closest-side, rgba(${color},0.55), rgba(${color},0.12) 55%, transparent 78%)`;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={leftRef}
        className="absolute left-0 top-0 h-full w-[36vw] origin-left blur-[120px] transition-[background] duration-700 will-change-[opacity,transform]"
        style={{ background: glow, opacity: 0.1 }}
      />
      <div
        ref={rightRef}
        className="absolute right-0 top-0 h-full w-[36vw] origin-right blur-[120px] transition-[background] duration-700 will-change-[opacity,transform]"
        style={{ background: glow, opacity: 0.1 }}
      />
    </div>
  );
}
