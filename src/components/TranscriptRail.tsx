"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { TranscriptTurn } from "@/lib/use-realtime-voice";

export function TranscriptRail({ turns }: { turns: TranscriptTurn[] }) {
  const tail = turns.slice(-5);
  return (
    <div className="max-h-[240px] space-y-3 overflow-y-auto scrollbar-thin pr-1">
      <AnimatePresence initial={false}>
        {tail.map((t) => (
          <motion.div
            key={t.id + (t.partial ? "-p" : "")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2.5"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${t.role === "guest" ? "bg-teal-400" : "bg-gold-400"}`} />
            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/35">
                {t.role === "guest" ? "Staff" : "Assistant"}
              </div>
              <div className={`text-sm leading-snug ${t.partial ? "italic text-white/45" : "text-white/85"}`}>
                {t.text}
              </div>
            </div>
          </motion.div>
        ))}
        {tail.length === 0 && (
          <div className="text-sm text-white/35 italic">Tap the orb and speak to the terminal.</div>
        )}
      </AnimatePresence>
    </div>
  );
}
