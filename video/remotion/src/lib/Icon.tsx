import React from 'react';

// Thin-stroke icons, Phosphor Light in character: 1.5 units on a 24 grid, round caps, no
// fills. The set this replaces was Lucide-weight at stroke 2, which next to a 118px display
// face reads as clip-art — the icon shouts louder than the type it is meant to serve.
//
// WHERE ICONS GO: only where they encode something. A tier gets a medal because the tier IS
// a rank; a refusal gets a struck circle because the refusal IS a negation. An icon beside
// a heading that merely repeats the heading is noise, and a screen of unbroken prose is
// worse — a viewer scanning at speed needs a shape to land on before they read a word.
//
// One weight and one size per surface. Mixed weights are the fastest way to make a set look
// borrowed from three places.
const PATHS: Record<string, React.ReactNode> = {
  // rank and standing
  medal: (
    <>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M8.5 10 6 2.5M15.5 10 18 2.5M9.5 2.5h5" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 4.5H4.2v1.6A3.4 3.4 0 0 0 7.6 9.5M17 4.5h2.8v1.6a3.4 3.4 0 0 1-3.4 3.4" />
      <path d="M12 13v4M8.5 21h7M9.5 21v-2.5h5V21" />
    </>
  ),
  // verdicts
  circleCheck: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.8 2.8L16 9.6" />
    </>
  ),
  circleSlash: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 18.4 18.4 5.6" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.4 2.6 19.6h18.8z" />
      <path d="M12 9.6v4.4" />
      <circle cx="12" cy="17" r="0.6" />
    </>
  ),
  // catalog and data
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v13c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-13" />
      <path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" />
    </>
  ),
  tag: (
    <>
      <path d="M3.2 10.6V3.8h6.8l10 10-6.8 6.8z" />
      <circle cx="7.4" cy="7.4" r="1.3" />
    </>
  ),
  terminal: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="m6.6 9.4 3.2 2.8-3.2 2.8M12.6 15.4h5" />
    </>
  ),
  plug: (
    <>
      <path d="M8.4 2.8v5.4M15.6 2.8v5.4" />
      <path d="M5.6 8.2h12.8v3.2a6.4 6.4 0 0 1-6.4 6.4 6.4 6.4 0 0 1-6.4-6.4z" />
      <path d="M12 17.8v3.4" />
    </>
  ),
  // process
  cycle: (
    <>
      <path d="M3.4 12a8.6 8.6 0 0 1 14.4-6.3l2.8 2.6" />
      <path d="M20.6 12a8.6 8.6 0 0 1-14.4 6.3l-2.8-2.6" />
      <path d="M20.6 3.2v5.1h-5.1M3.4 20.8v-5.1h5.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.4 2" />
    </>
  ),
  bell: (
    <>
      <path d="M5.6 10a6.4 6.4 0 0 1 12.8 0c0 4.4 1.6 6 1.6 6H4s1.6-1.6 1.6-6z" />
      <path d="M10 19.4a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  chat: (
    <path d="M21 11.6c0 4.2-4 7.6-9 7.6a10.6 10.6 0 0 1-3-.42L3.4 20.6l1.5-3.4A7.2 7.2 0 0 1 3 11.6C3 7.4 7 4 12 4s9 3.4 9 7.6z" />
  ),
  // meaning
  quotes: (
    <>
      <path d="M9.4 5.6C6.4 6.8 4.6 9.4 4.6 12.6v5.8h6V12H7.2c0-2.4 1-4 2.9-4.8z" />
      <path d="M19.2 5.6c-3 1.2-4.8 3.8-4.8 7v5.8h6V12h-3.4c0-2.4 1-4 2.9-4.8z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  link: (
    <>
      <path d="M9.8 14.2a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
      <path d="M14.2 9.8a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 21.4s7.6-3.6 7.6-9.4V5.2L12 2.6 4.4 5.2V12c0 5.8 7.6 9.4 7.6 9.4z" />
      <path d="m9.2 11.8 2.1 2.1 3.9-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.2" r="3.4" />
      <path d="M2.8 19.6a6.4 6.4 0 0 1 12.4 0" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 6M17.4 14.2a6.4 6.4 0 0 1 3.8 5.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.2" />
      <path d="m16.2 16.2 4.4 4.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.6 4.4v5.2h-5.2" />
      <path d="M3.4 19.6v-5.2h5.2" />
      <path d="M20.6 9.6A8.6 8.6 0 0 0 5.4 6.4M3.4 14.4a8.6 8.6 0 0 0 15.2 3.2" />
    </>
  ),
  check: <path d="m4.6 12.4 4.6 4.6L19.4 6.8" />,
  lock: (
    <>
      <rect x="4" y="10.4" width="16" height="10.4" rx="2" />
      <path d="M7.6 10.4V7.2a4.4 4.4 0 0 1 8.8 0v3.2" />
    </>
  ),
  text: (
    <>
      <path d="M14 2.6H6.6a2 2 0 0 0-2 2v14.8a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2V8z" />
      <path d="M14 2.6V8h5.4M8.4 13h7.2M8.4 16.6h5.4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3.6" width="18" height="16.8" rx="2" />
      <circle cx="8.6" cy="9" r="1.6" />
      <path d="m3.6 18.4 5-5 4.4 4.4 3-3 4.4 4.4" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5.2 6.4 9H2.8v6h3.6L11 18.8z" />
      <path d="M15 9.4a3.6 3.6 0 0 1 0 5.2M18 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({name, size = 24, color = 'currentColor', strokeWidth = 1.5, style}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{flexShrink: 0, ...style}}
    aria-hidden
  >
    {PATHS[name]}
  </svg>
);
