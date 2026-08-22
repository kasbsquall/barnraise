import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {beatPulse} from './beats';

// Organic motion primitives. All deterministic (frame-driven Perlin noise, never
// Math.random at render time). These kill the "linear/robotic" feel of sin() drift.

/** Slow organic drift for foreground elements (chips, cards, floaters).
 *  Give each instance a distinct seed so they don't move in lockstep. */
export const Float: React.FC<{
  seed?: string;
  amp?: number; // px of max drift
  speed?: number; // lower = slower
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({seed = 'a', amp = 10, speed = 0.012, children, style}) => {
  const frame = useCurrentFrame();
  const x = noise2D(seed + 'x', frame * speed, 0) * amp;
  const y = noise2D(seed + 'y', 0, frame * speed) * amp;
  return <div style={{transform: `translate(${x}px, ${y}px)`, ...style}}>{children}</div>;
};

/** Camera micro-shake for an impact beat: wrap the scene content and pass the hit
 *  frame. Decays over `dur` frames. Pair with the `alert`/`stamp` SFX. */
export const Shake: React.FC<{
  at: number;
  amp?: number;
  dur?: number;
  children: React.ReactNode;
}> = ({at, amp = 9, dur = 12, children}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const decay = t >= 0 && t < dur ? 1 - t / dur : 0;
  const x = noise2D('shx', frame * 0.9, 0) * amp * decay;
  const y = noise2D('shy', 0, frame * 0.9) * amp * decay;
  return (
    <div style={{width: '100%', height: '100%', transform: `translate(${x}px, ${y}px)`}}>
      {children}
    </div>
  );
};

/** Diagonal specular light sweep across a card/logo/lockup — the single most-used
 *  trick in Apple/Stripe-style films. Overlay it INSIDE a position:relative,
 *  overflow:hidden parent. Fires once, starting at `at` (local frames). */
export const Sheen: React.FC<{
  at?: number;
  dur?: number;
  opacity?: number;
  angle?: number;
}> = ({at = 0, dur = 26, opacity = 0.35, angle = 115}) => {
  const frame = useCurrentFrame();
  const p = Math.min(Math.max((frame - at) / dur, 0), 1);
  if (p <= 0 || p >= 1) return null;
  const x = -60 + p * 220; // sweep from off-left to off-right, in %
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `linear-gradient(${angle}deg, transparent ${x - 18}%, rgba(255,255,255,${opacity}) ${x}%, transparent ${x + 18}%)`,
      }}
    />
  );
};

/** Beat-driven scale pulse: wrap a hero element so it subtly breathes with the music.
 *  Needs beats.json populated; renders children unchanged otherwise. */
export const Pulse: React.FC<{
  amount?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({amount = 0.02, children, style}) => {
  const frame = useCurrentFrame();
  const s = 1 + amount * beatPulse(frame);
  return <div style={{transform: `scale(${s})`, ...style}}>{children}</div>;
};

/** Cinematic 2.39:1 letterbox mattes for the cold open and close — five lines that
 *  signal "film, not screencast". Animate `progress` 0->1 to close the mattes. */
export const Letterbox: React.FC<{progress?: number}> = ({progress = 1}) => {
  // 1080p at 2.39:1 leaves ~139px per matte
  const h = 139 * progress;
  const bar: React.CSSProperties = {position: 'absolute', left: 0, right: 0, height: h, background: '#000', pointerEvents: 'none'};
  return (
    <>
      <div style={{...bar, top: 0}} />
      <div style={{...bar, bottom: 0}} />
    </>
  );
};
