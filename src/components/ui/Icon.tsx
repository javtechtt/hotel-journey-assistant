"use client";

import { cn } from "@/lib/cn";

// Thin-line icon set (emoji-free). Each icon is a 24x24 stroke path.
export type IconName =
  | "mic"
  | "micOff"
  | "wave"
  | "check"
  | "calendar"
  | "users"
  | "bed"
  | "key"
  | "bell"
  | "chat"
  | "arrowRight"
  | "arrowLeft"
  | "close"
  | "plus"
  | "minus"
  | "coffee"
  | "glass"
  | "broom"
  | "towel"
  | "car"
  | "lotus"
  | "eye"
  | "card"
  | "moon"
  | "sparkle"
  | "compass"
  | "maximize"
  | "bag"
  | "copy";

const PATHS: Record<IconName, JSX.Element> = {
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  micOff: (
    <>
      <path d="M9 9V6a3 3 0 0 1 5.1-2.1M15 11a3 3 0 0 1-4.8 2.4" />
      <path d="M5 11a7 7 0 0 0 10.9 5.8M19 11a7 7 0 0 0-.3-2M12 18v3M3 3l18 18" />
    </>
  ),
  wave: (
    <path d="M3 12h2l2-5 3 10 3-14 3 14 2-5h3" />
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M21 20c0-2.5-1.3-4.3-3.5-5.2" />
    </>
  ),
  bed: <path d="M3 7v11M3 12h18a0 0 0 0 1 0 0v6M21 18v-3M3 12V8a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4" />,
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l8 8M16 16l2-2M18 18l2-2" />
    </>
  ),
  bell: <path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4" />,
  chat: <path d="M21 12a8 8 0 0 1-11.4 7.2L4 21l1.8-5.6A8 8 0 1 1 21 12z" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  coffee: <path d="M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10h2.5a2.5 2.5 0 0 1 0 5H17M7 4c.5.8.5 1.5 0 2.5M11 4c.5.8.5 1.5 0 2.5" />,
  glass: <path d="M7 3h10l-1.5 8.5a3.5 3.5 0 0 1-7 0L7 3zM12 15v5M8 21h8" />,
  broom: <path d="M14 3l4 4-7 7M11 14l-1 1M11 14l-5 5M14 11l-5 5M9.5 19.5L6 21l1.5-3.5" />,
  towel: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4v16M9 8h10" />
    </>
  ),
  car: <path d="M3 13l2-5a3 3 0 0 1 2.8-2h8.4A3 3 0 0 1 21 8l2 5M3 13h18v4a1 1 0 0 1-1 1h-2v-2H6v2H4a1 1 0 0 1-1-1v-4zM6.5 16.5h.01M17.5 16.5h.01" />,
  lotus: <path d="M12 21c-4 0-8-2.5-8-6 2 0 3.5.8 4.5 2C8 13 9.5 10 12 8c2.5 2 4 5 3.5 9 1-1.2 2.5-2 4.5-2 0 3.5-4 6-8 6zM12 21V12" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  moon: <path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </>
  ),
  maximize: <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />,
  bag: (
    <>
      <path d="M5 8h14l-1 11a2 2 0 0 1-2 1.8H8A2 2 0 0 1 6 19L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  )
};

export function Icon({
  name,
  className,
  strokeWidth = 1.5
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
