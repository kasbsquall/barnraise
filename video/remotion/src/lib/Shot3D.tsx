import {useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile} from 'remotion';
import React from 'react';
import {C} from '../theme';

// A real screenshot presented as a tilted 3D card (real "receipt" proof).
export const Shot3D: React.FC<{
  src: string;
  width: number;
  delay?: number;
  tiltX?: number;
  tiltY?: number;
  float?: boolean;
}> = ({src, width, delay = 0, tiltX = 5, tiltY = -11, float = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 18, stiffness: 90, mass: 0.9}});
  const drift = float ? Math.sin(frame * 0.03) * 6 : 0;
  const y = interpolate(p, [0, 1], [80, 0]) + drift;
  const rx = interpolate(p, [0, 1], [tiltX + 6, tiltX]);
  const ry = interpolate(p, [0, 1], [tiltY - 8, tiltY]);
  const scale = interpolate(p, [0, 1], [0.92, 1]);
  return (
    <div style={{perspective: 2200, perspectiveOrigin: '50% 40%'}}>
      <div
        style={{
          width,
          transform: `translateY(${y}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
          opacity: p,
          borderRadius: 16,
          overflow: 'hidden',
          background: C.white,
          boxShadow: '0 70px 130px rgba(4,12,34,0.5), 0 10px 24px rgba(4,12,34,0.3)',
          border: `1px solid ${C.line}`,
        }}
      >
        <Img src={staticFile(src)} style={{width: '100%', display: 'block'}} />
      </div>
    </div>
  );
};
