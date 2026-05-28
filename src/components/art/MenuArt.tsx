"use client";

// Hand-built SVG illustrations per menu item — emoji-free, on the luxury
// gold/dark palette. Drawn in a 200x150 viewBox, cropped to fill the tile.

const GOLD = "#e6c46a";
const GL = "#f5e1b0";
const CREAM = "#f3ede0";

type Scene = { tint: string; el: JSX.Element };

function steam(x: number) {
  return (
    <path
      d={`M${x} 54 q-7 -9 0 -18`}
      fill="none"
      stroke={GL}
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.55"
    />
  );
}

const SCENES: Record<string, Scene> = {
  "espresso": {
    tint: "#6b4a2f",
    el: (
      <>
        <ellipse cx="100" cy="118" rx="50" ry="8" fill={CREAM} opacity="0.12" />
        {steam(92)}
        <path d="M110 54 q7 -9 0 -18" fill="none" stroke={GL} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        <path d="M70 64 h60 l-6 38 a12 12 0 0 1 -12 10 h-24 a12 12 0 0 1 -12 -10 z" fill={CREAM} opacity="0.14" stroke={GL} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M130 70 a16 16 0 0 1 0 30" fill="none" stroke={GL} strokeWidth="2.4" />
        <ellipse cx="100" cy="64" rx="30" ry="6" fill="#2c1a10" stroke={GL} strokeWidth="1.5" />
      </>
    )
  },
  "breakfast-tray": {
    tint: "#b9852f",
    el: (
      <>
        <ellipse cx="100" cy="106" rx="76" ry="13" fill={CREAM} opacity="0.12" stroke={GL} strokeWidth="2" />
        <ellipse cx="80" cy="92" rx="27" ry="8" fill={CREAM} opacity="0.16" stroke={GL} strokeWidth="2" />
        <path d="M68 90 q4 -16 18 -13 q15 3 9 13 z" fill={GOLD} opacity="0.5" stroke={GL} strokeWidth="1.6" />
        <path d="M122 96 v-18 a9 9 0 0 1 18 0 v18 z" fill={CREAM} opacity="0.14" stroke={GL} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="131" cy="80" rx="9" ry="2.5" fill="#caa24a" />
      </>
    )
  },
  "tropical-juice": {
    tint: "#c9772f",
    el: (
      <>
        <path d="M84 70 h32 l-4 40 a12 12 0 0 1 -12 10 a12 12 0 0 1 -12 -10 z" fill="#e8962f" opacity="0.5" />
        <path d="M82 50 h36 l-6 60 a13 13 0 0 1 -13 11 a13 13 0 0 1 -13 -11 z" fill={CREAM} opacity="0.12" stroke={GL} strokeWidth="2.4" strokeLinejoin="round" />
        <line x1="108" y1="42" x2="116" y2="118" stroke={GL} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="120" cy="54" r="10" fill={GOLD} opacity="0.6" stroke={GL} strokeWidth="1.5" />
        <path d="M120 44 v20 M110 54 h20" stroke={GL} strokeWidth="1.1" opacity="0.7" />
        <circle cx="95" cy="86" r="2" fill={GL} opacity="0.7" />
        <circle cx="103" cy="98" r="1.6" fill={GL} opacity="0.6" />
      </>
    )
  },
  "dinner-plate": {
    tint: "#5b3b52",
    el: (
      <>
        <ellipse cx="100" cy="106" rx="58" ry="11" fill={CREAM} opacity="0.14" stroke={GL} strokeWidth="2" />
        <path d="M58 102 a42 40 0 0 1 84 0 z" fill={CREAM} opacity="0.12" stroke={GL} strokeWidth="2.4" strokeLinejoin="round" />
        <line x1="100" y1="60" x2="100" y2="52" stroke={GL} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="100" cy="49" r="4" fill={GOLD} stroke={GL} strokeWidth="1.4" />
        <path d="M44 70 v42 M40 70 v15 M48 70 v15" fill="none" stroke={GL} strokeWidth="2" strokeLinecap="round" />
        <path d="M156 70 v42 M156 70 q7 5 0 17" fill="none" stroke={GL} strokeWidth="2" strokeLinecap="round" />
      </>
    )
  },
  "wine-pairing": {
    tint: "#9c5b6b",
    el: (
      <>
        <path d="M84 58 h32 a16 18 0 0 1 -16 20 a16 18 0 0 1 -16 -20 z" fill="#e8a7b6" opacity="0.55" />
        <path d="M80 46 h40 a20 26 0 0 1 -20 36 a20 26 0 0 1 -20 -36 z" fill="#d98aa0" opacity="0.28" stroke={GL} strokeWidth="2.4" strokeLinejoin="round" />
        <line x1="100" y1="82" x2="100" y2="108" stroke={GL} strokeWidth="2.4" />
        <ellipse cx="100" cy="110" rx="20" ry="5" fill={CREAM} opacity="0.16" stroke={GL} strokeWidth="2" />
      </>
    )
  },
  "garden-mocktail": {
    tint: "#3f7a52",
    el: (
      <>
        <path d="M86 70 h28 v32 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 1 -6 -6 z" fill="#5db37a" opacity="0.45" />
        <path d="M84 50 h32 v54 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 z" fill={CREAM} opacity="0.12" stroke={GL} strokeWidth="2.4" strokeLinejoin="round" />
        <line x1="106" y1="42" x2="112" y2="104" stroke={GL} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M112 50 q15 -11 24 -2 q-9 13 -24 5 z" fill="#5db37a" opacity="0.6" stroke={GL} strokeWidth="1.4" />
        <circle cx="96" cy="84" r="1.8" fill={GL} opacity="0.7" />
      </>
    )
  },
  "extra-towels": {
    tint: "#2f6f74",
    el: (
      <>
        <rect x="56" y="92" width="88" height="20" rx="6" fill={CREAM} opacity="0.18" stroke={GL} strokeWidth="2" />
        <rect x="60" y="74" width="80" height="20" rx="6" fill={CREAM} opacity="0.13" stroke={GL} strokeWidth="2" />
        <rect x="64" y="56" width="72" height="20" rx="6" fill={CREAM} opacity="0.09" stroke={GL} strokeWidth="2" />
        <rect x="92" y="52" width="16" height="64" fill={GOLD} opacity="0.32" />
      </>
    )
  },
  "housekeeping": {
    tint: "#4a6b7a",
    el: (
      <>
        <path d="M84 72 h26 v38 a6 6 0 0 1 -6 6 h-14 a6 6 0 0 1 -6 -6 z" fill={CREAM} opacity="0.14" stroke={GL} strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="87" y="92" width="20" height="22" rx="3" fill="#5fd2c5" opacity="0.4" />
        <rect x="92" y="62" width="10" height="11" fill="none" stroke={GL} strokeWidth="2" />
        <path d="M92 56 h-16 M92 62 l-16 -7" stroke={GL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <g stroke={GL} strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
          <path d="M58 46 v8 M54 50 h8" />
          <path d="M46 62 v6 M43 65 h6" />
          <path d="M64 68 v6 M61 71 h6" />
        </g>
      </>
    )
  },
  "airport-shuttle": {
    tint: "#3b4670",
    el: (
      <>
        <path d="M40 100 q4 -22 24 -24 h44 q16 0 24 14 l14 8 q6 4 6 10 v8 h-116 v-8 q0 -4 4 -8 z" fill={CREAM} opacity="0.14" stroke={GL} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M66 80 q3 -12 16 -13 h26 q10 0 16 9 l4 5 h-66 z" fill="#3b4670" opacity="0.55" stroke={GL} strokeWidth="1.6" strokeLinejoin="round" />
        <line x1="98" y1="67" x2="98" y2="81" stroke={GL} strokeWidth="1.6" />
        <circle cx="68" cy="114" r="11" fill="#0a0f1c" stroke={GL} strokeWidth="2.4" />
        <circle cx="132" cy="114" r="11" fill="#0a0f1c" stroke={GL} strokeWidth="2.4" />
        <circle cx="68" cy="114" r="3.5" fill={GL} />
        <circle cx="132" cy="114" r="3.5" fill={GL} />
        <circle cx="150" cy="96" r="3" fill={GOLD} />
      </>
    )
  },
  "spa-appointment": {
    tint: "#3f6b57",
    el: (
      <>
        <ellipse cx="100" cy="116" rx="36" ry="8" fill={CREAM} opacity="0.16" stroke={GL} strokeWidth="1.8" />
        <ellipse cx="100" cy="104" rx="27" ry="7" fill={CREAM} opacity="0.12" stroke={GL} strokeWidth="1.8" />
        <ellipse cx="100" cy="93" rx="18" ry="5.5" fill={CREAM} opacity="0.1" stroke={GL} strokeWidth="1.8" />
        <path d="M100 46 q11 18 0 32 q-11 -14 0 -32 z" fill="#7fc99a" opacity="0.5" stroke={GL} strokeWidth="1.5" />
        <path d="M100 78 q-22 -8 -28 -26 q20 0 28 20 z" fill="#7fc99a" opacity="0.4" stroke={GL} strokeWidth="1.4" />
        <path d="M100 78 q22 -8 28 -26 q-20 0 -28 20 z" fill="#7fc99a" opacity="0.4" stroke={GL} strokeWidth="1.4" />
      </>
    )
  }
};

const CATEGORY_FALLBACK: Record<string, string> = {
  BREAKFAST: "breakfast-tray",
  DRINK: "tropical-juice",
  DINNER: "dinner-plate",
  HOUSEKEEPING: "extra-towels",
  CONCIERGE: "airport-shuttle",
  SPA: "spa-appointment"
};

export function MenuArt({ slug, category }: { slug: string; category?: string }) {
  const scene = SCENES[slug] ?? SCENES[CATEGORY_FALLBACK[category ?? ""] ?? "dinner-plate"];
  const id = `mg-${slug}`;
  return (
    <svg
      viewBox="0 0 200 150"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="36%" r="75%">
          <stop offset="0%" stopColor={scene.tint} stopOpacity="0.75" />
          <stop offset="100%" stopColor="#070d18" />
        </radialGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#${id})`} />
      {scene.el}
    </svg>
  );
}
