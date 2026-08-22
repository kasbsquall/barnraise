import {useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import React from 'react';
import {INTER, C} from '../theme';

// A browser/app window tilted in 3D (the Rotato-style hero shot), content passed as children.
export const Browser3D: React.FC<{
  children: React.ReactNode;
  width?: number;
  url?: string;
  delay?: number;
  tiltX?: number;
  tiltY?: number;
  accent?: string;
}> = ({children, width = 1200, url = 'vericlaim.app', delay = 0, tiltX = 6, tiltY = -13, accent = C.blue}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 18, stiffness: 90, mass: 0.9}});
  const y = interpolate(p, [0, 1], [90, 0]);
  const rx = interpolate(p, [0, 1], [tiltX + 8, tiltX]);
  const ry = interpolate(p, [0, 1], [tiltY - 10, tiltY]);
  const scale = interpolate(p, [0, 1], [0.92, 1]);
  return (
    <div style={{perspective: 2200, perspectiveOrigin: '50% 40%'}}>
      <div
        style={{
          width,
          transformStyle: 'preserve-3d',
          transform: `translateY(${y}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
          opacity: p,
          borderRadius: 20,
          overflow: 'hidden',
          background: C.white,
          boxShadow: '0 70px 130px rgba(4,12,34,0.5), 0 12px 30px rgba(4,12,34,0.35)',
          border: `1px solid ${C.line}`,
        }}
      >
        <div
          style={{
            height: 50,
            background: '#0D1D3A',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '0 20px',
          }}
        >
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div key={c} style={{width: 13, height: 13, borderRadius: 99, background: c}} />
          ))}
          <div
            style={{
              marginLeft: 16,
              flex: 1,
              maxWidth: 460,
              height: 30,
              borderRadius: 8,
              background: '#1B2C4E',
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              gap: 8,
              color: '#9DB2D8',
              fontFamily: INTER,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            <span style={{color: accent, fontSize: 13}}>●</span>
            {url}
          </div>
        </div>
        <div style={{background: C.white}}>{children}</div>
      </div>
    </div>
  );
};
