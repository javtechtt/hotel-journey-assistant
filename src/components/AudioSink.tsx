"use client";

import { useEffect, useRef } from "react";

export function AudioSink({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {
        // Browsers may block autoplay; user gesture already happened so this usually succeeds.
      });
    } else {
      el.srcObject = null;
    }
  }, [stream]);
  return <audio ref={ref} autoPlay className="voice-sink" />;
}
