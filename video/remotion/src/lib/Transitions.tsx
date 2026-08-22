import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';

// Transition mechanics reverse-engineered from premium product-launch films
// (OpenAI, Google Gemini, Notion, ElevenLabs). See SKILL.md "Transition mechanics".
//
// Two findings govern this whole file:
//   1. Motion blur is ABSENT in all of them. Crisp edges read premium; blur reads cheap.
//   2. Easing is heavy ease-out — big displacement in the first third, long settle.
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Zoom-through: the camera pushes INTO an element until its content fills the frame and
 *  becomes the next scene. No cut. The signature premium transition — a UI element
 *  transforms into the following shot.
 *
 *  CRITICAL: this is TWO synchronized layers, not one. Scaling a screenshot 10x just
 *  pixelates. The reference films cross-fade a natively re-rendered, crisp version of
 *  the target element (at correspondingly larger type) over the scaling screenshot,
 *  both on the same origin and the same curve. Mid-transition you can see the target
 *  text twice at two scales — that ghosting IS the mechanic.
 *
 *  `children` = the outgoing full UI. `target` = a crisp re-render of just the element
 *  being entered, which becomes the next scene. `anchor` = that element's centre in px. */
export const ZoomThrough: React.FC<{
  at: number;
  dur?: number;
  anchor: [number, number];
  to?: number;
  target?: React.ReactNode;
  children: React.ReactNode;
}> = ({at, dur = 24, anchor, to = 10, target, children}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const p = interpolate(frame - at, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT,
  });
  const ox = (anchor[0] / width) * 100;
  const oy = (anchor[1] / height) * 100;
  const origin = `${ox}% ${oy}%`;
  // Outgoing screenshot rides the full curve and fades over the middle third.
  const sOut = 1 + (to - 1) * p;
  // Crisp layer starts small and lands at 1:1 exactly as the screenshot dissolves.
  const sIn = 1 / to + (1 - 1 / to) * p;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${sOut})`,
          transformOrigin: origin,
          opacity: interpolate(p, [0.25, 0.7], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        {children}
      </AbsoluteFill>
      {target ? (
        <AbsoluteFill
          style={{
            transform: `scale(${sIn})`,
            transformOrigin: origin,
            opacity: interpolate(p, [0.3, 0.75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          {target}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/** Zoom-out-to-context: the inverse of ZoomThrough. The current scene shrinks until it
 *  IS an element inside a larger scene that was there all along. Where ZoomThrough says
 *  "look closer at this", this says "here is what you were actually looking at".
 *
 *  Together they are the zoom pair, and alternating them gives a film the feeling of
 *  moving through nested levels of one space rather than cutting between slides. Use the
 *  push-in to go from overview into detail, and this to pay off a detail by revealing
 *  its context.
 *
 *  `children` = the current scene. `context` = the wider scene it lands inside.
 *  `rect` = where, in the context scene, the current one comes to rest (px). */
export const ZoomOutTo: React.FC<{
  at: number;
  dur?: number;
  rect: {x: number; y: number; w: number};
  context: React.ReactNode;
  children: React.ReactNode;
}> = ({at, dur = 24, rect, context, children}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const p = interpolate(frame - at, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT,
  });
  const s = 1 + (rect.w / width - 1) * p; // shrink to the target width
  // travel from centred to the target rect's centre
  const tx = (rect.x + rect.w / 2 - width / 2) * p;
  const ty = (rect.y - height / 2) * p;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{opacity: interpolate(p, [0.15, 0.55], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        {context}
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: '50% 50%'}}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Fixed-frame content morph: the container never moves or resizes; only its interior
 *  transitions. This is what makes an AI generation read as a state change rather than
 *  an edit. ~24 frames. Pass the "before" as children and the "after" as `to`. */
export const ContentMorph: React.FC<{
  at?: number;
  dur?: number;
  to: React.ReactNode;
  blur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at = 0, dur = 24, to, blur = 28, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  return (
    <div style={{position: 'relative', overflow: 'hidden', ...style}}>
      <div style={{opacity: 1 - p, filter: `blur(${blur * p}px)`}}>{children}</div>
      <div style={{position: 'absolute', inset: 0, opacity: p, filter: `blur(${blur * (1 - p)}px)`}}>{to}</div>
    </div>
  );
};

/** Seamless infinite marquee — a row that scrolls at constant linear velocity, looping
 *  via a duplicated list. Never eases; cut away from it while it is still moving. */
export const Marquee: React.FC<{
  speed?: number; // px per frame
  gap?: number;
  children: React.ReactNode;
}> = ({speed = 6, gap = 32, children}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', gap, transform: `translateX(${-((frame * speed) % 10000)}px)`, willChange: 'transform'}}>
      {children}
      {children}
    </div>
  );
};

/** Circle reveal seeded by a UI affordance: a button is pressed and its circle inflates
 *  from ~14px to full-frame, its interior IS the next scene. Converts a product
 *  micro-interaction into a scene change. Highest impact per line of code in the set.
 *
 *  Render the OUTGOING scene above this for the first ~6 frames so the button reads
 *  as physically inflating. */
export const CircleReveal: React.FC<{
  at: number;
  dur?: number;
  origin: [number, number]; // the button's centre, in px
  children: React.ReactNode;
}> = ({at, dur = 12, origin, children}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [ox, oy] = origin;
  const rMax = Math.hypot(Math.max(ox, width - ox), Math.max(oy, height - oy));
  const r = interpolate(frame - at, [0, dur], [14, rMax], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT,
  });
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{clipPath: `circle(${r}px at ${ox}px ${oy}px)`}}>{children}</AbsoluteFill>
  );
};

/** Pull-back reveal: start pushed in on a detail and continuously scale out to the whole
 *  view. One screenshot yields three shot sizes (isolated control ~300%, panel ~150%,
 *  full app 100%) — this is how a single asset becomes an entire sequence.
 *  `origin` is the % point of the detail to start on. */
export const PullBack: React.FC<{
  at?: number;
  dur?: number;
  from?: number;
  to?: number;
  origin?: [string, string];
  children: React.ReactNode;
}> = ({at = 0, dur = 14, from = 2.85, to = 1, origin = ['50%', '50%'], children}) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame - at, [0, dur], [from, to], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT,
  });
  return (
    <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: `${origin[0]} ${origin[1]}`}}>
      {children}
    </AbsoluteFill>
  );
};

/** Diegetic flash bridge: the app appears to re-render (a brief flat colour flash) and
 *  comes back reframed. Hides a hard cut inside a product event, so the edit reads as
 *  the software updating rather than as a cut. ~3 frames is the whole trick. */
export const FlashBridge: React.FC<{at: number; frames?: number; color?: string}> = ({
  at, frames = 3, color = '#7FE3F0',
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t >= frames) return null;
  return <AbsoluteFill style={{background: color, opacity: 0.9}} />;
};

/** Hard-edge push wipe with a bright seam. The incoming plane pushes the outgoing one
 *  off-frame; a 1-2 frame white bar marks the seam. Fast (3-5 frames) and linear —
 *  slow it down and it turns into the cheap curtain wipe this pipeline forbids. */
export const PushWipe: React.FC<{
  at: number;
  frames?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  seam?: string;
  children: React.ReactNode;
}> = ({at, frames = 4, direction = 'left', seam = '#fff', children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, frames], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  if (frame < at) return null;
  const axis = direction === 'left' || direction === 'right' ? 'X' : 'Y';
  const sign = direction === 'left' || direction === 'up' ? 1 : -1;
  const off = (1 - p) * 100 * sign;
  return (
    <AbsoluteFill style={{transform: `translate${axis}(${off}%)`}}>
      {children}
      {p < 1 && (
        <div
          style={{
            position: 'absolute',
            ...(axis === 'X'
              ? {top: 0, bottom: 0, width: 6, [direction === 'left' ? 'left' : 'right']: 0}
              : {left: 0, right: 0, height: 6, [direction === 'up' ? 'top' : 'bottom']: 0}),
            background: seam,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** Traveling motif: a single graphic object crosses the frame on a straight vector,
 *  IN FRONT of the type. Match the exit angle of shot N to the entry angle of shot N+1
 *  and the eye tracks one object across a hard cut it never registers. This is how a
 *  film built entirely from hard cuts feels continuous, with no crossfades at all.
 *  Constant velocity — this is one of the few moves that should NOT ease. */
export const TravelingMotif: React.FC<{
  at?: number;
  dur?: number;
  from: [number, number];
  to: [number, number];
  rotate?: number;
  children: React.ReactNode;
}> = ({at = 0, dur = 20, from, to, rotate = -18, children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear,
  });
  const x = from[0] + (to[0] - from[0]) * p;
  const y = from[1] + (to[1] - from[1]) * p;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`, zIndex: 10, pointerEvents: 'none'}}>
      {children}
    </div>
  );
};

/** Scale-pop with overshoot: an icon lifts and inflates (dock-magnify style).
 *  Entrances start at 0.95, never at 0. */
export const ScalePop: React.FC<{
  at?: number;
  to?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at = 0, to = 2.2, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 140, mass: 0.7}});
  return <div style={{transform: `scale(${0.95 + (to - 0.95) * p})`, ...style}}>{children}</div>;
};
