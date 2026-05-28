"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

// A reservation-code chip that copies to the clipboard on click.
export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard may be blocked (e.g. insecure context) — fail quietly
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      aria-label={copied ? "Reservation code copied" : "Copy reservation code"}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 text-sand-100/85 transition hover:border-gold-400/40",
        className
      )}
    >
      <Icon name="key" className="h-4 w-4" />
      <span className="font-mono tracking-wide">{code}</span>
      <Icon
        name={copied ? "check" : "copy"}
        className={cn(
          "h-4 w-4 transition",
          copied ? "text-teal-300" : "text-white/40 group-hover:text-gold-200"
        )}
        strokeWidth={copied ? 2 : 1.5}
      />
    </button>
  );
}
