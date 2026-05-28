"use client";

import { AnimatePresence, motion } from "framer-motion";
import { VoiceOrb } from "@/components/VoiceOrb";
import { Icon } from "@/components/ui/Icon";
import type { TranscriptTurn, VoiceStatus } from "@/lib/use-realtime-voice";

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Tap to speak",
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Connection error"
};

function lastOf(turns: TranscriptTurn[], role: "guest" | "assistant") {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === role) return turns[i];
  }
  return undefined;
}

// Persistent floating voice control. Caption shows what the assistant
// understood / is saying — without a chatbot box.
export function VoiceDock({
  status,
  error,
  transcript,
  muted,
  hint,
  onStart,
  onStop,
  onToggleMute,
  size = 132
}: {
  status: VoiceStatus;
  error: string | null;
  transcript: TranscriptTurn[];
  muted: boolean;
  hint?: string;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  size?: number;
}) {
  const live = status === "listening" || status === "thinking" || status === "speaking";
  const guest = lastOf(transcript, "guest");
  const assistant = lastOf(transcript, "assistant");
  const caption = assistant?.text?.trim();
  const heard = guest?.text?.trim();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center pb-7">
      {/* caption */}
      <div className="pointer-events-none mb-4 h-16 w-full max-w-2xl px-6 flex items-end justify-center">
        <AnimatePresence mode="wait">
          {(caption || heard || hint) && (
            <motion.div
              key={(caption || heard || hint || "").slice(0, 24)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center"
            >
              {heard && (
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/35 mb-1 truncate max-w-xl mx-auto">
                  {heard}
                </div>
              )}
              <div className="font-display text-lg lg:text-xl text-sand-100/90 leading-snug line-clamp-2 max-w-2xl">
                {caption || (!heard ? hint : "")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* orb + controls */}
      <div className="pointer-events-auto flex items-center gap-5">
        <AnimatePresence>
          {live && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={onToggleMute}
              className="grid h-11 w-11 place-items-center rounded-full glass text-white/70 hover:text-white transition"
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            >
              <Icon name={muted ? "micOff" : "mic"} className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center">
          <VoiceOrb status={status} size={size} onClick={live ? onStop : onStart} />
          <div className="mt-1 text-[11px] uppercase tracking-[0.32em] text-gold-200/80">
            {STATUS_LABEL[status]}
          </div>
        </div>

        <AnimatePresence>
          {live && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={onStop}
              className="grid h-11 w-11 place-items-center rounded-full glass text-white/70 hover:text-rose-300 transition"
              aria-label="End voice session"
            >
              <Icon name="close" className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="pointer-events-auto mt-4 max-w-md rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-center text-xs text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}
