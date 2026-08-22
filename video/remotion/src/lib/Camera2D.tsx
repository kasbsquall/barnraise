import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';

/** One keyframe of the camera: at frame `f`, put source point (cx, cy) of a
 *  1920x1080 plate at the centre of the frame, magnified `s` times. */
export type Key = {f: number; cx: number; cy: number; s: number};

/**
 * A camera over a full-bleed plate.
 *
 * Two things here are deliberate and were both learned the expensive way.
 *
 * The easing is an ease-in-out, not the heavy ease-out that is right for a UI
 * transition. A 200ms interface move wants 61% of its travel in the first third;
 * a camera has mass, and that same curve over several seconds reads as a lurch.
 *
 * And the transform centres a SOURCE POINT rather than nudging offsets, so the
 * framing is stated in the plate's own coordinates. Panning by hand-tuned pixel
 * offsets is how a push-in ends up cropping the thing it was pushing towards.
 */
export const Camera2D: React.FC<{
  keys: Key[];
  /** Size of the plate the coordinates refer to. Defaults to the frame itself. */
  plate?: {w: number; h: number};
  children: React.ReactNode;
}> = ({keys, plate = {w: 1920, h: 1080}, children}) => {
  const frame = useCurrentFrame();
  const fs = keys.map((k) => k.f);
  const ease = {
    // Smootherstep: zero velocity AND zero acceleration at both ends, so the
    // camera starts from rest and genuinely settles.
    //
    // What was here before claimed to be cubic-bezier(0.5, 0, 0.25, 1) and was
    // not. It evaluated the Bernstein form with the time fraction substituted
    // for the Bezier parameter, skipping the solve for t that a real CSS easing
    // does. The resulting curve reaches only 22% of its travel at the halfway
    // point and has a derivative of 2.25 at the end, so the camera accelerated
    // for the whole segment and hit every keyframe at peak speed with no
    // deceleration. That is the signature of a UI transition, and it is the
    // opposite of what the comment promised: on the three-keyframe move it
    // produced a visible lurch at each one.
    easing: (t: number) => t * t * t * (t * (t * 6 - 15) + 10),
    extrapolateLeft: 'clamp' as const,
    extrapolateRight: 'clamp' as const,
  };
  const s = interpolate(frame, fs, keys.map((k) => k.s), ease);
  const cx = interpolate(frame, fs, keys.map((k) => k.cx), ease);
  const cy = interpolate(frame, fs, keys.map((k) => k.cy), ease);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: plate.w,
          height: plate.h,
          left: 0,
          top: 0,
          transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
};
