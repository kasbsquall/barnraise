import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';

// The continuous-camera rig. This is the structural reason the reference films can run
// 50-120 seconds with zero to six hard cuts: they do not montage shots, they move ONE
// camera across ONE very large artboard where every fragment of the film already lives,
// placed once at its true relative position and scale.
//
// Every "cut" becomes a camera move. Continuity stops being something you author per
// transition and becomes structural — spatial mismatches are impossible by construction.

export type CamKey = {
  /** frame at which the camera arrives at this pose */
  at: number;
  /** artboard coordinates to centre in frame */
  x: number;
  y: number;
  /** 1 = artboard pixels map 1:1 to screen pixels */
  scale: number;
  /** frames spent travelling INTO this pose (default 30) */
  travel?: number;
};

const OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Resolve the camera pose at `frame`: hold each pose until the next one starts
 *  travelling, then ease heavily into it. */
export const camAt = (frame: number, path: CamKey[]): {x: number; y: number; scale: number} => {
  if (!path.length) return {x: 0, y: 0, scale: 1};
  let prev = path[0];
  for (let i = 1; i < path.length; i++) {
    const k = path[i];
    const travel = k.travel ?? 30;
    const start = k.at - travel;
    if (frame < start) return {x: prev.x, y: prev.y, scale: prev.scale};
    if (frame < k.at) {
      const p = interpolate(frame, [start, k.at], [0, 1], {easing: OUT});
      return {
        x: prev.x + (k.x - prev.x) * p,
        y: prev.y + (k.y - prev.y) * p,
        scale: prev.scale + (k.scale - prev.scale) * p,
      };
    }
    prev = k;
  }
  return {x: prev.x, y: prev.y, scale: prev.scale};
};

/** Wrap the entire artboard. Children are laid out once, absolutely positioned in
 *  artboard coordinates; only this parent transform animates.
 *
 *  <CameraRig path={PATH}>
 *    <Grid />                                     // construction layer, parallaxes free
 *    <div style={{position:'absolute', left:0,    top:0}}>   ...hero...     </div>
 *    <div style={{position:'absolute', left:2400, top:600}}> ...feature...  </div>
 *  </CameraRig>
 */
export const CameraRig: React.FC<{
  path: CamKey[];
  children: React.ReactNode;
  background?: string;
}> = ({path, children, background}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const cam = camAt(frame, path);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          // centre (cam.x, cam.y) in the viewport at cam.scale
          transform: `translate(${width / 2}px, ${height / 2}px) scale(${cam.scale}) translate(${-cam.x}px, ${-cam.y}px)`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Permanent slow drift + scale creep. EVERY product shot in every reference film
 *  carries this; nothing is ever frozen. It is what licenses a hard cut to land between
 *  two already-moving frames so the eye never registers the edit.
 *
 *  Derived from the scene's FULL duration, not from an entrance animation — the scene is
 *  already moving when it appears and still moving when it leaves. */
export const Alive: React.FC<{
  scale?: [number, number];
  x?: [number, number];
  y?: [number, number];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({scale = [1, 1.06], x = [0, 0], y = [0, 0], children, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = durationInFrames > 1 ? frame / durationInFrames : 0;
  const s = scale[0] + (scale[1] - scale[0]) * p;
  const tx = x[0] + (x[1] - x[0]) * p;
  const ty = y[0] + (y[1] - y[0]) * p;
  return (
    <AbsoluteFill style={{transform: `translate(${tx}%, ${ty}%) scale(${s})`, ...style}}>
      {children}
    </AbsoluteFill>
  );
};

/** The construction layer: hairlines and oversized circle outlines at very low alpha,
 *  living in the SAME artboard coordinate space as the content. Gives parallax for free
 *  and supplies a whole visual identity for about twenty lines of SVG. */
export const Artboard: React.FC<{
  w?: number;
  h?: number;
  color?: string;
  alpha?: number;
  cell?: number;
}> = ({w = 8000, h = 4500, color = '#000', alpha = 0.07, cell = 240}) => (
  <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
    <defs>
      <pattern id="ab-grid" width={cell} height={cell} patternUnits="userSpaceOnUse">
        <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke={color} strokeWidth="1" opacity={alpha} />
      </pattern>
    </defs>
    <rect width={w} height={h} fill="url(#ab-grid)" />
    <circle cx={w * 0.28} cy={h * 0.34} r={h * 0.3} fill="none" stroke={color} strokeWidth="1" opacity={alpha} />
    <circle cx={w * 0.72} cy={h * 0.62} r={h * 0.42} fill="none" stroke={color} strokeWidth="1" opacity={alpha} />
  </svg>
);
