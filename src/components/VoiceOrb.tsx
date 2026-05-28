"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { VoiceStatus } from "@/lib/use-realtime-voice";

const HUE: Record<VoiceStatus, { a: string; b: string; ring: string }> = {
  idle: { a: "#e6c46a", b: "#b88a26", ring: "rgba(230,196,106,0.5)" },
  connecting: { a: "#f3c66b", b: "#caa24a", ring: "rgba(243,198,107,0.6)" },
  listening: { a: "#5fd2c5", b: "#33b2a4", ring: "rgba(95,210,197,0.6)" },
  thinking: { a: "#a78bfa", b: "#7c6cf0", ring: "rgba(167,139,250,0.6)" },
  speaking: { a: "#fbe7bd", b: "#e6c46a", ring: "rgba(251,231,189,0.7)" },
  error: { a: "#fb7185", b: "#e11d48", ring: "rgba(251,113,133,0.6)" }
};

export function VoiceOrb({
  status,
  size = 132,
  onClick
}: {
  status: VoiceStatus;
  size?: number;
  onClick?: () => void;
}) {
  const live = status === "listening" || status === "thinking" || status === "speaking";
  const hue = HUE[status];
  const barCount = 5;

  return (
    <button
      onClick={onClick}
      className="relative grid place-items-center focus:outline-none"
      style={{ width: size, height: size }}
      aria-label={live ? "End voice session" : "Begin voice session"}
    >
      {/* outer halo */}
      <motion.span
        className="absolute rounded-full blur-2xl"
        style={{ width: size, height: size, background: `radial-gradient(circle, ${hue.ring}, transparent 70%)` }}
        animate={{ scale: live ? [1, 1.25, 1] : [1, 1.08, 1], opacity: live ? [0.7, 1, 0.7] : [0.5, 0.7, 0.5] }}
        transition={{ duration: live ? 1.6 : 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* rotating conic ring */}
      <motion.span
        className="absolute rounded-full"
        style={{
          width: size * 0.92,
          height: size * 0.92,
          background: `conic-gradient(from 0deg, transparent, ${hue.a}, transparent 70%)`,
          maskImage: "radial-gradient(transparent 58%, black 60%)",
          WebkitMaskImage: "radial-gradient(transparent 58%, black 60%)"
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: live ? 6 : 16, repeat: Infinity, ease: "linear" }}
      />
      {/* core */}
      <motion.span
        className="absolute rounded-full"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background: `radial-gradient(circle at 35% 30%, ${hue.a}, ${hue.b})`,
          boxShadow: `0 10px 40px -8px ${hue.ring}, inset 0 2px 10px rgba(255,255,255,0.4)`
        }}
        animate={{ scale: status === "speaking" ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 0.6, repeat: status === "speaking" ? Infinity : 0 }}
      />
      {/* center indicator: audio bars when live, dot when idle */}
      <span className="relative z-10 flex items-end gap-[3px] h-7">
        {live ? (
          Array.from({ length: barCount }).map((_, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-ink-900/80"
              animate={{ height: [6, 22, 10, 18, 6] }}
              transition={{
                duration: 0.9 + (i % 3) * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.08
              }}
            />
          ))
        ) : (
          <span className="h-2 w-2 rounded-full bg-ink-900/70" />
        )}
      </span>
    </button>
  );
}
