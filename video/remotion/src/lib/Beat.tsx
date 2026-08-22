import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';

// Swap concealment. Measured frame-by-frame off the reference films: the "zero-cut"
// premium look is NOT one continuous camera. Those films DO cut. The cuts are engineered
// to be undetectable, and three conditions do it — satisfy at least one at every swap:
//
//   1. Matched background token   — both sides sit on the same near-black/near-white
//                                   field, so global frame luminance barely moves.
//   2. Low ink coverage at swap   — the outgoing element has already whipped ~80% off
//                                   frame, so few pixels actually change.
//   3. Full-viewport coverage     — a solid surface covers 100% of the frame, the swap
//                                   happens underneath, then it uncovers (see Takeover).
//
// Verify your own render: compute frame-to-frame mean absolute difference. If a
// transition frame exceeds ~12 on a 0-255 scale against a matched background, viewers
// will read it as a cut.

/** Decelerate in, dead stop, accelerate out. The asymmetry IS the mechanic.
 *
 *  The exit is exponential ease-in: ~90% of the travel happens in the final two frames,
 *  and the distance exceeds the viewport, so the element does not "leave" — it
 *  accelerates past the point the eye can track it. That is why no cut is perceived.
 *  Entries are the mirror: ease-out settling to a stop that then holds perfectly still. */
export const Beat: React.FC<{
  /** local frame the exit begins; omit to never exit */
  exitAt?: number;
  enterDur?: number;
  exitDur?: number;
  /** px offset the element enters from */
  from?: [number, number];
  /** px offset it whips out to — MUST exceed the viewport */
  to?: [number, number];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({exitAt, enterDur = 13, exitDur = 9, from = [0, 80], to = [-1900, 0], children, style}) => {
  const frame = useCurrentFrame();
  const eIn = interpolate(frame, [0, enterDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1), // decelerate to rest
  });
  const eOut =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + exitDur], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.7, 0, 0.84, 0), // accelerate off-frame
        });
  const x = from[0] * (1 - eIn) + to[0] * eOut;
  const y = from[1] * (1 - eIn) + to[1] * eOut;
  return (
    <AbsoluteFill style={{transform: `translate3d(${x}px, ${y}px, 0)`, opacity: eIn, willChange: 'transform', ...style}}>
      {children}
    </AbsoluteFill>
  );
};

/** Per-beat ambient drift. NOT a global camera path — measured direction changes every
 *  beat, at 7 to 35 px/s (0.6% to 2.7% of frame width per second). Over a 3s hold that
 *  is 20-100px: enough to feel alive, not enough to read as travel. Vary the sign per
 *  beat. This one detail carries most of the "expensive" feeling. */
export const Drift: React.FC<{
  vx?: number; // px per second
  vy?: number;
  vz?: number; // scale per second
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({vx = 14, vy = -8, vz = 0.012, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${vx * t}px, ${vy * t}px, 0) scale(${1 + vz * t})`,
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Palette flip without a visible cut: an element's OWN surface colour scales until it
 *  covers the viewport, the swap happens under it, then it uncovers into the new scene.
 *  This is how the reference films go white → dark → white with no perceptible edit. */
export const Takeover: React.FC<{
  at: number;
  dur?: number;
  color: string;
  /** where the covering surface grows from, in px */
  origin?: [number, number];
  /** frames the frame stays fully covered before uncovering; -1 = never uncover */
  hold?: number;
  children?: React.ReactNode;
}> = ({at, dur = 7, color, origin, hold = -1, children}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [ox, oy] = origin ?? [width / 2, height / 2];
  const rMax = Math.hypot(Math.max(ox, width - ox), Math.max(oy, height - oy));
  const grow = interpolate(frame, [at, at + dur], [0, rMax], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });
  const shrink =
    hold < 0
      ? 0
      : interpolate(frame, [at + dur + hold, at + dur + hold + dur], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
  if (frame < at || shrink >= 1) return null;
  // grow to cover, hold, then uncover by shrinking back toward the origin
  const r = shrink > 0 ? rMax * (1 - shrink) : grow;
  return (
    <AbsoluteFill style={{clipPath: `circle(${r}px at ${ox}px ${oy}px)`, background: color}}>{children}</AbsoluteFill>
  );
};

/** Viewport-fixed light pool. Measured on the dark reference: the luminance peak sits in
 *  the SAME cell across four unrelated scenes while all corners stay at 0-12 luma. It is
 *  an overlay in viewport space, not a light attached to content — so it must live
 *  OUTSIDE any transformed subtree or it will drift with the content and break. */
export const LightPool: React.FC<{
  x?: string;
  y?: string;
  color?: string;
  strength?: number;
  vignette?: number;
}> = ({x = '45%', y = '35%', color = '#5B7CFF', strength = 0.16, vignette = 0.55}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill
      style={{background: `radial-gradient(60% 55% at ${x} ${y}, ${color}${Math.round(strength * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`}}
    />
    <AbsoluteFill style={{background: `radial-gradient(75% 70% at 50% 50%, transparent 45%, rgba(0,0,0,${vignette}) 100%)`}} />
  </AbsoluteFill>
);

/** Depth of field by distance from a focus point. Real optical DOF was measured in the
 *  dark reference (gradient energy falls ~9x from the focus to the frame edges) and is a
 *  large part of why it reads photographed rather than rendered. */
export const Focus: React.FC<{
  at: [number, number];
  pos: [number, number];
  falloff?: number;
  max?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at, pos, falloff = 900, max = 5, children, style}) => {
  const d = Math.hypot(pos[0] - at[0], pos[1] - at[1]);
  const blur = Math.min(1, d / falloff) * max;
  return <div style={{filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined, ...style}}>{children}</div>;
};

/** 3D plane with UNEQUAL edge angles. Measured on the reference: horizontal edges tilt
 *  -3.6° while vertical edges tilt 9.7-13°. Because the two differ it cannot be a 2D
 *  rotate — it is perspective plus rotation, and matching the two angles is what makes a
 *  naive tilted mockup look fake. Perspective goes on the PARENT so it applies in
 *  viewport space.
 *
 *  Relax the tilt toward 0 across the film (heavy early, near flat-on for the payoff). */
export const Plane: React.FC<{
  rx?: number;
  ry?: number;
  rz?: number;
  z?: number;
  perspective?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({rx = 8, ry = -6, rz = -3.6, z = 0, perspective = 1400, children, style}) => (
  <div style={{perspective: `${perspective}px`, perspectiveOrigin: '50% 40%', ...style}}>
    <div style={{transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) translateZ(${z}px)`, transformStyle: 'preserve-3d'}}>
      {children}
    </div>
  </div>
);
