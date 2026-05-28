"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export type JourneyStepKey =
  | "welcome"
  | "discovery"
  | "roomDetail"
  | "checkout"
  | "confirmed"
  | "concierge";

const STEPS: { key: JourneyStepKey; label: string }[] = [
  { key: "welcome", label: "Arrive" },
  { key: "discovery", label: "Discover" },
  { key: "roomDetail", label: "Room" },
  { key: "checkout", label: "Checkout" },
  { key: "confirmed", label: "Confirmed" },
  { key: "concierge", label: "Concierge" }
];

export function JourneyProgress({ active }: { active: JourneyStepKey }) {
  const activeIdx = STEPS.findIndex((s) => s.key === active);
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-3">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <div key={s.key} className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <motion.span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  current ? "bg-gold-400" : done ? "bg-gold-400/50" : "bg-white/15"
                )}
                animate={current ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                transition={{ duration: 1.8, repeat: current ? Infinity : 0 }}
              />
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.28em] transition-colors hidden sm:inline",
                  current ? "text-gold-200" : done ? "text-white/45" : "text-white/25"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn("h-px w-4 sm:w-8", done ? "bg-gold-400/40" : "bg-white/10")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
