"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { roomVisual, type RoomSceneKey } from "@/lib/room-visuals";

// When NEXT_PUBLIC_USE_ROOM_IMAGES=1, real photos at /public/rooms/<slug>.jpg
// are layered over the artwork. If a photo is missing it falls back silently
// to the built-in SVG scene.
const USE_ROOM_IMAGES = process.env.NEXT_PUBLIC_USE_ROOM_IMAGES === "1";
// Tried in order; first one that loads wins, otherwise fall back to the SVG.
const PHOTO_EXTS = ["webp", "jpg", "jpeg", "png"];

// Cinematic, emoji-free procedural artwork per room type. Rendered as a
// full-bleed SVG "image treatment" with gradient, light, grain and vignette.

function OceanScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="ocSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2740" />
          <stop offset="55%" stopColor="#0e5566" />
          <stop offset="100%" stopColor="#caa24a" />
        </linearGradient>
        <radialGradient id="ocSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe9b8" />
          <stop offset="60%" stopColor="#f3c66b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f3c66b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#ocSky)" />
      <circle cx="400" cy="330" r="150" fill="url(#ocSun)" />
      <circle cx="400" cy="330" r="58" fill="#ffeec2" opacity="0.9" />
      <rect y="360" width="800" height="240" fill="#0a3a4a" opacity="0.55" />
      <path d="M0 420 Q200 400 400 420 T800 420 V600 H0 Z" fill="#0c2c3a" opacity="0.6" />
      <path d="M0 470 Q150 452 320 470 T800 470 V600 H0 Z" fill="#08222e" opacity="0.7" />
      {[330, 360, 390].map((y, i) => (
        <line key={i} x1="280" y1={y} x2="520" y2={y} stroke="#ffe9b8" strokeOpacity={0.18 - i * 0.04} strokeWidth="2" />
      ))}
    </svg>
  );
}

function GardenScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="gdSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a2417" />
          <stop offset="60%" stopColor="#14563a" />
          <stop offset="100%" stopColor="#8aa83f" />
        </linearGradient>
        <radialGradient id="gdGlow" cx="70%" cy="28%" r="40%">
          <stop offset="0%" stopColor="#f2e7b0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f2e7b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#gdSky)" />
      <rect width="800" height="600" fill="url(#gdGlow)" />
      {[
        { cx: 160, cy: 520, r: 190, c: "#0e3a25" },
        { cx: 430, cy: 560, r: 230, c: "#10472d" },
        { cx: 680, cy: 540, r: 200, c: "#0c3320" }
      ].map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.c} opacity="0.8" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <ellipse key={i} cx={120 + i * 100} cy={300 + (i % 2) * 40} rx="26" ry="56"
          fill="#1c6b41" opacity="0.5" transform={`rotate(${(i % 2 ? 18 : -18)} ${120 + i * 100} ${300})`} />
      ))}
    </svg>
  );
}

function ExecutiveScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="exSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070a18" />
          <stop offset="60%" stopColor="#1e2748" />
          <stop offset="100%" stopColor="#3b4670" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#exSky)" />
      <circle cx="610" cy="130" r="44" fill="#cdd6f4" opacity="0.5" />
      {[
        { x: 40, w: 90, h: 320 },
        { x: 150, w: 70, h: 420 },
        { x: 240, w: 110, h: 260 },
        { x: 370, w: 80, h: 380 },
        { x: 470, w: 120, h: 300 },
        { x: 610, w: 70, h: 440 },
        { x: 700, w: 90, h: 340 }
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={600 - b.h} width={b.w} height={b.h} fill="#0b1024" opacity="0.85" />
          {Array.from({ length: Math.floor(b.h / 46) }).map((_, r) =>
            Array.from({ length: Math.floor(b.w / 26) }).map((_, c) => (
              <rect key={`${r}-${c}`} x={b.x + 10 + c * 26} y={600 - b.h + 18 + r * 46} width="10" height="14"
                fill="#e6c46a" opacity={(r + c) % 3 === 0 ? 0.5 : 0.12} />
            ))
          )}
        </g>
      ))}
    </svg>
  );
}

function VillaScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="vlSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1326" />
          <stop offset="55%" stopColor="#8a4a3a" />
          <stop offset="100%" stopColor="#e0a64e" />
        </linearGradient>
        <radialGradient id="vlSun" cx="30%" cy="35%" r="45%">
          <stop offset="0%" stopColor="#ffdca0" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffdca0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#vlSky)" />
      <rect width="800" height="600" fill="url(#vlSun)" />
      <circle cx="240" cy="220" r="60" fill="#ffe7bd" opacity="0.9" />
      <ellipse cx="430" cy="540" rx="320" ry="70" fill="#1d6f74" opacity="0.55" />
      <ellipse cx="430" cy="535" rx="250" ry="48" fill="#2a8f93" opacity="0.4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={i}
          d={`M620 250 Q${640 + i * 14} ${200 - i * 8} ${690 + i * 18} ${230 - i * 4}`}
          stroke="#123b2e" strokeWidth="7" fill="none" opacity="0.75"
          transform={`rotate(${-40 + i * 16} 620 250)`} />
      ))}
      <rect x="612" y="250" width="10" height="180" fill="#123b2e" opacity="0.8" />
    </svg>
  );
}

const SCENES: Record<RoomSceneKey, () => JSX.Element> = {
  ocean: OceanScene,
  garden: GardenScene,
  executive: ExecutiveScene,
  villa: VillaScene
};

export function RoomScene({
  slug,
  image,
  className,
  scrim = "full"
}: {
  slug?: string | null;
  /** Explicit photo path (e.g. a hero image) — overrides the slug lookup. */
  image?: string;
  className?: string;
  scrim?: "full" | "bottom" | "none";
}) {
  const v = roomVisual(slug);
  const Scene = SCENES[v.scene];
  const [extIdx, setExtIdx] = useState(0);
  const showPhoto = USE_ROOM_IMAGES && (!!image || !!slug) && extIdx < PHOTO_EXTS.length;
  const photoSrc = image ?? `/rooms/${slug}.${PHOTO_EXTS[extIdx]}`;
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br", v.gradient)} />
      <Scene />
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photoSrc}
          src={photoSrc}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setExtIdx((i) => (image ? PHOTO_EXTS.length : i + 1))}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {scrim !== "none" && (
        <div className={cn("absolute inset-0", scrim === "full" ? "scrim-full" : "scrim-b")} />
      )}
      <div className="absolute inset-0 vignette" />
      <div className="absolute inset-0 grain" />
    </div>
  );
}
