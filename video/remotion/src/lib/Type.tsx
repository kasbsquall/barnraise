import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {FONT} from '../theme';

// Typography reveals observed in premium product films. Two findings drive this file:
//   1. Word-by-word spring stagger appears in NONE of them. Do not reach for it.
//   2. Headline type is held absolutely static while everything under it moves.

/** Top-anchored, line-by-line sentence build that SURVIVES A HARD CUT.
 *
 *  The whole multi-line sentence is typeset once and anchored top-left, so a revealed
 *  line never moves when the next one arrives. That single decision is what makes the
 *  build feel calm instead of jumpy — flex centering re-flows line 1 when line 2 lands
 *  and destroys the effect.
 *
 *  `revealAt` frames are on the ROOT timeline (pass an absolute frame), so a shot can
 *  hold line 1, cut away to product UI, and the next title shot resumes with line 1 in
 *  the identical pixel position plus line 2 appended. */
export const BuildingSentence: React.FC<{
  lines: string[];
  revealAt: number[]; // absolute (root) frames, one per line
  frame?: number; // pass the root frame when this sits inside a <Sequence>
  size?: number;
  color?: string;
  top?: string;
  left?: string;
  maxWidth?: number;
}> = ({lines, revealAt, frame: rootFrame, size = 92, color = '#111', top = '12%', left = '8%', maxWidth = 1300}) => {
  const local = useCurrentFrame();
  const f = rootFrame ?? local;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        maxWidth,
        textAlign: 'left',
        fontFamily: FONT.display,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: '-0.022em',
        color,
        textWrap: 'balance',
      }}
    >
      {lines.map((l, i) => {
        const a = revealAt[i] ?? 0;
        return (
          <div
            key={i}
            style={{
              opacity: interpolate(f, [a, a + 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              transform: `translateY(${interpolate(f, [a, a + 9], [8, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px)`,
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

/** Character build. Measured off the reference films, three details make or break it:
 *
 *  1. SPEED: ~50 chars/sec (20ms/char). Faster than real typing — it reads as thought,
 *     not as keyboarding. A "realistic" typing speed reads as a screen recording.
 *  2. NO per-character opacity ramp. Characters land at full opacity instantly; a fade
 *     per glyph was measured as absent (strict and loose ink thresholds agree to 1-2px).
 *  3. LAYOUT IS PRE-RESERVED. The full string is rendered invisibly to lock the line box,
 *     and the sliced string overlays it. Without this, a centred line jitters horizontally
 *     on every character — the single most common tell of a naive typing animation.
 *
 *  Then it HOLDS dead still for 1.5-1.8s. The hold is as designed as the build. */
export const Typewriter: React.FC<{
  text: string;
  at?: number;
  charsPerSec?: number;
  caret?: boolean;
  style?: React.CSSProperties;
}> = ({text, at = 0, charsPerSec = 50, caret = false, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - at) / fps) * charsPerSec)));
  const done = n >= text.length;
  const base: React.CSSProperties = {fontFamily: FONT.text, whiteSpace: 'pre-wrap', ...style};
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      {/* reserves the final line box so nothing re-flows or re-centres mid-build */}
      <span style={{...base, visibility: 'hidden'}}>{text}</span>
      <span style={{...base, position: 'absolute', left: 0, top: 0}}>
        {text.slice(0, n)}
        {caret && !done ? <span style={{opacity: frame % 16 < 8 ? 1 : 0}}>|</span> : null}
      </span>
    </span>
  );
};

/** Horizontal colour sweep across a headline — recolours rather than reveals, so a word
 *  can change colour mid-glyph. `background-clip: text` with an animated gradient. */
export const ColorSweep: React.FC<{
  at?: number;
  dur?: number;
  from?: string;
  to?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at = 0, dur = 26, from = '#0B1220', to = '#2E6BFF', children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${to} 0%, ${to} ${p * 100}%, ${from} ${p * 100}%, ${from} 100%)`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Staggered list build: rows appear one after another as whole blocks (~250-300ms
 *  apart) while the panel itself never moves. Cap the stagger so long lists don't drag. */
export const StaggerList: React.FC<{
  at?: number;
  step?: number;
  cap?: number;
  children: React.ReactNode[];
}> = ({at = 0, step = 8, cap = 8, children}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {React.Children.map(children, (c, i) => {
        const a = at + Math.min(i, cap) * step;
        return (
          <div
            style={{
              opacity: interpolate(frame, [a, a + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              transform: `translateY(${interpolate(frame, [a, a + 8], [10, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px)`,
            }}
          >
            {c}
          </div>
        );
      })}
    </>
  );
};
