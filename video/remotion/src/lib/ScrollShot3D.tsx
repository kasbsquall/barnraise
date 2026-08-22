import {useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile} from 'remotion';
import React from 'react';
import {C} from '../theme';

// A real full-page screenshot panned vertically inside a tilted 3D window — reads as
// "scrolling the real page," crisp and deterministic. Pans over its own local timeline.
export const ScrollShot3D: React.FC<{
  src: string;
  imgW: number;
  imgH: number;
  winW?: number;
  winH?: number;
  tiltX?: number;
  tiltY?: number;
  panFrac?: number;
}> = ({src, imgW, imgH, winW = 1180, winH = 690, tiltX = 5, tiltY = -11, panFrac = 1}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 90, mass: 0.9}});
  const fadeOut = interpolate(frame, [durationInFrames - 16, durationInFrames - 2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const displayH = (winW * imgH) / imgW;
  const maxPan = Math.max(0, displayH - winH);
  const prog = interpolate(frame, [16, durationInFrames - 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ty = -maxPan * prog * panFrac;
  const rx = interpolate(enter, [0, 1], [tiltX + 6, tiltX]);
  const ry = interpolate(enter, [0, 1], [tiltY - 8, tiltY]);
  const scale = interpolate(enter, [0, 1], [0.92, 1]);
  const yoff = interpolate(enter, [0, 1], [70, 0]);
  return (
    <div style={{perspective: 2200, perspectiveOrigin: '50% 40%'}}>
      <div
        style={{
          width: winW,
          height: winH,
          transform: `translateY(${yoff}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
          opacity: enter * fadeOut,
          borderRadius: 16,
          overflow: 'hidden',
          background: C.white,
          boxShadow: '0 70px 130px rgba(4,12,34,0.5), 0 10px 24px rgba(4,12,34,0.3)',
          border: `1px solid ${C.line}`,
        }}
      >
        <Img src={staticFile(src)} style={{width: winW, transform: `translateY(${ty}px)`, display: 'block'}} />
      </div>
    </div>
  );
};
