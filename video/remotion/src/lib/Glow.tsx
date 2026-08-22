import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';

// A soft pool of light BEHIND the hero of a scene. One per scene, tied to the thing that
// matters, never spread across the whole background — a glow everywhere is atmosphere and
// reads as decoration; a glow behind one element reads as emphasis and tells the eye
// where to land.
//
// Pulled from the brand accent (gold) or the signal colour (green), never invented.
export const Glow: React.FC<{
  color: string;
  size?: number;
  strength?: number;
  at?: number;
  dur?: number;
  blur?: number;
  /** Wrapping a block-level child (a row, a panel) must NOT shrink-wrap it. inline-block
   *  collapses the child to its content width, which silently breaks any column
   *  alignment inside it — it looked like a rendering bug in the render. */
  block?: boolean;
  children: React.ReactNode;
//
// STRENGTH IS DELIBERATELY LOW. A two-pool version of this — a bright core inside a wide
// halo — was tried and rejected on sight: it lit the ground around the element into a
// visible coloured cloud, which reads as a filter applied to the shot rather than as light
// in the room. On a near-black ground the eye picks up a glow long before it becomes
// obvious, so the useful range sits well under where it starts to look like an effect.
}> = ({color, size = 620, strength = 0.3, at = 0, dur = 16, blur = 70, block = false, children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const a = Math.round(strength * p * 255).toString(16).padStart(2, '0');
  return (
    <div style={{position: 'relative', display: block ? 'block' : 'inline-block', width: block ? '100%' : undefined}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size,
          height: size * 0.72,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(closest-side, ${color}${a} 0%, transparent 72%)`,
          filter: `blur(${blur}px)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{position: 'relative'}}>{children}</div>
    </div>
  );
};
